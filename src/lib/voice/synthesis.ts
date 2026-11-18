// Browser text-to-speech (Web Speech API). Speaks sentence by sentence: Chrome cuts off
// long utterances, and short ones make interrupting feel instant.

import { sentences } from "@/lib/voice/to-speech";

export function isSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/** Voices load asynchronously in Chrome; call this early so they're ready by the first reply. */
export function warmUpVoices(): void {
  if (isSynthesisSupported()) window.speechSynthesis.getVoices();
}

/** The most natural English voice available, preferring South Asian, then British, then US English. */
function pickVoice(): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const quality = (v: SpeechSynthesisVoice) => (/natural|neural|online/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  for (const region of [/^en[-_]IN/i, /^en[-_]GB/i, /^en[-_]US/i]) {
    const best = english.filter((v) => region.test(v.lang)).sort((a, b) => quality(b) - quality(a))[0];
    if (best) return best;
  }
  return english[0] ?? null;
}

// Chrome can stop speaking if the utterance object is garbage-collected mid-sentence.
const live = new Set<SpeechSynthesisUtterance>();

/** Speaks `text` and resolves when it's finished, or straight away if `signal` aborts. */
export async function speak(text: string, signal: AbortSignal): Promise<void> {
  if (!isSynthesisSupported()) return;
  for (const sentence of sentences(text)) {
    if (signal.aborted) return;
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? "en-US";
      const done = () => {
        live.delete(utterance);
        signal.removeEventListener("abort", stop);
        resolve();
      };
      const stop = () => {
        window.speechSynthesis.cancel();
        done();
      };
      utterance.onend = done;
      utterance.onerror = done;
      signal.addEventListener("abort", stop, { once: true });
      live.add(utterance);
      window.speechSynthesis.speak(utterance);
    });
  }
}

export function stopSpeaking(): void {
  if (isSynthesisSupported()) window.speechSynthesis.cancel();
  live.clear();
}
