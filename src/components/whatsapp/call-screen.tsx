"use client";

import { Hand, Mic, MicOff, PhoneOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import { useConversation } from "@/components/whatsapp/simulator-provider";
import { useVoiceCall, type EndedCall } from "@/hooks/use-voice-call";
import { formatCallDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

/** A WhatsApp-style voice call with the business's agent. Always dark, like the real call screen. */
export function CallScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const { business, addCall } = useConversation(slug);
  const onEnded = useCallback((call: EndedCall) => addCall(slug, call), [slug, addCall]);
  const { phase, caption, problem, muted, connectedAt, hangUp, toggleMute, interrupt } = useVoiceCall({
    slug,
    greeting: business?.greeting ?? "Hello!",
    onEnded,
  });
  // The timer stops (and stays on screen) when the call ends.
  const elapsed = useElapsedSeconds(connectedAt, phase !== "ended" && phase !== "failed");
  const backToChat = useCallback(() => router.replace(`/simulator/${slug}`), [router, slug]);

  // After hanging up, show "Call ended" briefly, then return to the chat.
  useEffect(() => {
    if (phase !== "ended") return;
    const timer = setTimeout(backToChat, 1200);
    return () => clearTimeout(timer);
  }, [phase, backToChat]);

  if (!business) return null;

  const status =
    phase === "failed"
      ? "Call failed"
      : phase === "ended"
        ? `Call ended${connectedAt ? ` · ${formatCallDuration(elapsed)}` : ""}`
        : connectedAt
          ? formatCallDuration(elapsed)
          : "Ringing…";
  const activity = {
    ringing: "",
    speaking: `${business.agentName} is speaking`,
    listening: muted ? "You're muted" : "Listening…",
    thinking: "One moment…",
    ended: "",
    failed: "",
  }[phase];

  return (
    // A soft green glow behind the caller; it fades out before the top edge, so it meets the
    // (dark) status bar without a seam.
    <div className="dark flex h-full min-h-0 flex-col items-center bg-wa-chat bg-[radial-gradient(80%_26%_at_50%_26%,var(--wa-call-glow),transparent)] px-6 pt-8 pb-10 text-wa-text">
      <p className="flex items-center gap-1.5 text-xs text-wa-meta">
        <ShieldCheck className="size-3.5" aria-hidden />
        BookMate AI voice demo
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <BusinessAvatar emoji={business.emoji} className={cn("size-28 text-6xl", phase === "ringing" && "motion-safe:animate-pulse")} />
        <h1 className="text-2xl font-medium">{business.name}</h1>
        <p className="text-sm text-wa-meta tabular-nums" aria-live="polite">
          {status}
        </p>
        <p className={cn("h-5 text-sm", phase === "listening" && !muted ? "text-wa-primary" : "text-wa-meta")} aria-live="polite">
          {activity}
        </p>
      </div>

      <div className="mt-6 flex min-h-28 w-full flex-1 items-start justify-center">
        {phase === "failed" ? (
          <p role="alert" className="rounded-xl bg-wa-header px-4 py-3 text-center text-sm leading-relaxed">
            {problem}
          </p>
        ) : (
          caption && (
            <div aria-live="polite" className="w-full rounded-xl bg-wa-header/90 px-4 py-3 text-sm leading-relaxed">
              <span className="mb-1 block text-xs text-wa-meta">{caption.who === "agent" ? business.agentName : "You"}</span>
              {caption.text}
            </div>
          )
        )}
      </div>

      {phase === "failed" ? (
        <button
          type="button"
          onClick={backToChat}
          className="rounded-full bg-wa-header px-6 py-3 text-sm font-medium transition-colors hover:bg-wa-hover"
        >
          Back to chat
        </button>
      ) : (
        <div className="flex items-end justify-center gap-6">
          <CallButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} active={muted} disabled={phase === "ended"}>
            {muted ? <MicOff className="size-6" aria-hidden /> : <Mic className="size-6" aria-hidden />}
          </CallButton>
          <CallButton label="End call" onClick={hangUp} danger disabled={phase === "ended"}>
            <PhoneOff className="size-6" aria-hidden />
          </CallButton>
          <CallButton label="Interrupt" onClick={interrupt} disabled={phase !== "speaking"}>
            <Hand className="size-6" aria-hidden />
          </CallButton>
        </div>
      )}
    </div>
  );
}

function CallButton({
  label,
  onClick,
  danger,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex size-15 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-default disabled:opacity-40",
          danger ? "bg-red-600 text-white hover:bg-red-500" : active ? "bg-wa-text text-wa-chat" : "bg-wa-header hover:bg-wa-hover",
        )}
      >
        {children}
      </button>
      <span className="text-xs text-wa-meta">{label}</span>
    </div>
  );
}

/** Seconds since `since`, ticking every second while `running`, then frozen. 0 before the start. */
function useElapsedSeconds(since: number | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const tick = () => setNow(Date.now());
    if (!running) {
      // One last reading so the frozen time is exact.
      const last = setTimeout(tick, 0);
      return () => clearTimeout(last);
    }
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [since, running]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}
