"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readNdjson } from "@/lib/simulator/ndjson";
import { isRecognitionSupported, listenOnce } from "@/lib/voice/recognition";
import { isSynthesisSupported, speak, stopSpeaking, warmUpVoices } from "@/lib/voice/synthesis";
import { toSpeech } from "@/lib/voice/to-speech";
import type { AgentCallRequest, AgentChatRequest, AgentEvent } from "@/types/agent-events";

export type CallPhase = "ringing" | "speaking" | "listening" | "thinking" | "ended" | "failed";
export type Caption = { who: "agent" | "you"; text: string };
export type EndedCall = { startedAt: string; durationSec: number };

const RING_MS = 1800;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in the browser's address bar, then call again.",
  "service-not-allowed": "Microphone access is blocked. Allow it in the browser's address bar, then call again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs an internet connection: the browser sends your voice to its speech service.",
  unsupported: "Voice calls need Chrome or Edge.",
};

/**
 * One simulated WhatsApp call: ring, greet, then listen → send the words to the agent →
 * speak each reply, until hang-up. The agent is the same one that answers chat; replies
 * come back as AgentEvents from /api/agent/chat with channel "voice".
 */
export function useVoiceCall({
  slug,
  greeting,
  onEnded,
}: {
  slug: string;
  greeting: string;
  onEnded: (call: EndedCall) => void;
}) {
  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [caption, setCaption] = useState<Caption | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  const call = useRef(new AbortController());
  const listening = useRef<AbortController | null>(null);
  const speaking = useRef<AbortController | null>(null);
  const conversationId = useRef<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const mutedRef = useRef(false);
  const ended = useRef(false);
  /** Bumped by interrupt(): replies queued before it aren't spoken. */
  const speechTurn = useRef(0);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  const fail = useCallback((message: string) => {
    if (ended.current) return;
    ended.current = true;
    call.current.abort();
    stopSpeaking();
    setProblem(message);
    setPhase("failed");
  }, []);

  const say = useCallback(async (text: string, turn = speechTurn.current) => {
    const signal = call.current.signal;
    if (signal.aborted || turn !== speechTurn.current) return;
    const spoken = toSpeech(text);
    setPhase("speaking");
    setCaption({ who: "agent", text: spoken });
    const controller = new AbortController();
    speaking.current = controller;
    signal.addEventListener("abort", () => controller.abort(), { once: true });
    await speak(spoken, controller.signal);
    speaking.current = null;
  }, []);

  /** Sends what the caller said and speaks the replies as they arrive. */
  const respond = useCallback(
    async (text: string) => {
      setPhase("thinking");
      const turn = speechTurn.current;
      const body: AgentChatRequest = { slug, texts: [text], channel: "voice", conversationId: conversationId.current ?? undefined };
      let replies = Promise.resolve();
      try {
        const response = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: call.current.signal,
        });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        await readNdjson(response.body, (value) => {
          const event = value as AgentEvent;
          if (event.type === "message") replies = replies.then(() => say(event.message.text, turn));
          if (event.type === "error") replies = replies.then(() => say("Sorry, something went wrong on our side. Could you say that again?", turn));
        });
      } catch (error) {
        if (call.current.signal.aborted) return;
        console.warn("[call] turn failed", error);
        replies = replies.then(() => say("Sorry, I couldn't hear the assistant. Could you say that again?", turn));
      }
      await replies;
    },
    [slug, say],
  );

  /** Ends the call. `quietly` (on unmount) skips state updates for a component that's going away. */
  const finishCall = useCallback((quietly: boolean) => {
    if (ended.current) return;
    ended.current = true;
    call.current.abort();
    stopSpeaking();
    if (!quietly) setPhase("ended");
    const durationSec = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    if (conversationId.current) {
      const body: AgentCallRequest = { action: "end", slug, conversationId: conversationId.current };
      void fetch("/api/agent/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
      onEndedRef.current({ startedAt: new Date(startedAt.current ?? Date.now()).toISOString(), durationSec });
    }
  }, [slug]);

  const hangUp = useCallback(() => finishCall(false), [finishCall]);

  useEffect(() => {
    // A fresh call per effect run: refs outlive React's dev-mode remount and a hidden page's cleanup.
    call.current = new AbortController();
    ended.current = false;
    conversationId.current = null;
    startedAt.current = null;
    const signal = call.current.signal;

    async function run() {
      setPhase("ringing");
      setConnectedAt(null);
      setProblem(null);
      if (!isRecognitionSupported() || !isSynthesisSupported()) {
        fail("Voice calls in this demo need Chrome or Edge.");
        return;
      }
      warmUpVoices();

      try {
        const body: AgentCallRequest = { action: "start", slug };
        const response = await fetch("/api/agent/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        conversationId.current = ((await response.json()) as { conversationId: string }).conversationId;
      } catch {
        if (!signal.aborted) fail("Couldn't connect the call. Check the dev server is running.");
        return;
      }

      await wait(RING_MS, signal);
      if (signal.aborted) return;
      startedAt.current = Date.now();
      setConnectedAt(startedAt.current);
      await say(greeting);

      let errors = 0;
      while (!signal.aborted) {
        setPhase("listening");
        if (mutedRef.current) {
          await wait(200, signal);
          continue;
        }
        const controller = new AbortController();
        listening.current = controller;
        signal.addEventListener("abort", () => controller.abort(), { once: true });
        const heard = await listenOnce({
          signal: controller.signal,
          onInterim: (text) => text && setCaption({ who: "you", text }),
        });
        listening.current = null;

        if (heard.kind === "speech") {
          errors = 0;
          setCaption({ who: "you", text: heard.text });
          await respond(heard.text);
        } else if (heard.kind === "error") {
          const message = MIC_ERRORS[heard.error];
          if (message) return fail(message);
          if (++errors >= 3) return fail(`Speech recognition stopped working (${heard.error}).`);
          await wait(500, signal);
        }
        // "silence" or "aborted" (muted): just listen again.
      }
    }

    // Starting on a timer means React's dev-mode double mount cancels the first start
    // instead of placing (and instantly ending) an extra call.
    const timer = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(timer);
      finishCall(true);
    };
  }, [slug, greeting, say, respond, fail, finishCall]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (mutedRef.current) listening.current?.abort();
  }, []);

  /** Stops the agent mid-sentence (and anything it was about to say) so the caller can talk. */
  const interrupt = useCallback(() => {
    speechTurn.current += 1;
    speaking.current?.abort();
  }, []);

  return { phase, caption, problem, muted, connectedAt, hangUp, toggleMute, interrupt };
}
