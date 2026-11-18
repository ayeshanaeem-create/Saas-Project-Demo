import { PhoneOutgoing } from "lucide-react";

import { FormattedText } from "@/components/whatsapp/formatted-text";
import { MessageStatus } from "@/components/whatsapp/message-status";
import { formatCallDuration, formatMessageTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/simulator";

type Props = {
  message: ChatMessage;
  /** First message in a run from the same side: gets the tail and extra top spacing. */
  startsGroup: boolean;
  timeZone: string;
  /**
   * A ready-made time ("4:41 PM") for statically prerendered previews: timezone formatting
   * reads the clock internally, which Cache Components rejects during prerendering.
   */
  timeLabel?: string;
};

export function MessageBubble({ message, startsGroup, timeZone, timeLabel }: Props) {
  const outgoing = message.direction === "outgoing";
  const time = timeLabel ?? formatMessageTime(new Date(message.sentAt), timeZone);

  return (
    <div
      className={cn(
        "flex px-[4.5%] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        outgoing ? "justify-end" : "justify-start",
        startsGroup ? "mt-2" : "mt-0.5",
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-2 pt-1.5 pb-2 text-[16px] leading-[22px] text-wa-text shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]",
          outgoing ? "bg-wa-bubble-out" : "bg-wa-bubble-in",
          startsGroup && (outgoing ? "rounded-tr-none" : "rounded-tl-none"),
        )}
      >
        {startsGroup && <BubbleTail outgoing={outgoing} />}

        {message.kind === "call" ? (
          <span className="flex items-center gap-3 py-1 pr-16 pl-1">
            <span className="flex size-9 items-center justify-center rounded-full bg-wa-text/10">
              <PhoneOutgoing className="size-4.5" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="font-medium">Voice call</span>
              <span className="text-[14px] text-wa-meta">{formatCallDuration(message.durationSec ?? 0)}</span>
            </span>
          </span>
        ) : (
          <>
            <span className="break-words whitespace-pre-wrap">
              <FormattedText text={message.text} />
            </span>
            {/* Reserves room on the last line so the time sits beside the text when it fits. */}
            <span aria-hidden className={cn("inline-block", outgoing ? "w-[4.75rem]" : "w-14")} />
          </>
        )}

        <span className="absolute right-2 bottom-1 flex items-center gap-0.5 text-[14px] leading-none text-wa-meta">
          <time dateTime={message.sentAt}>{time}</time>
          {outgoing && message.status && <MessageStatus status={message.status} />}
        </span>
      </div>
    </div>
  );
}

/**
 * Three pulsing dots in an incoming bubble while the business is replying. Decorative:
 * the header's "typing…" is the announced status.
 */
export function TypingBubble() {
  return (
    <div aria-hidden className="mt-2 flex justify-start px-[4.5%] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="relative rounded-lg rounded-tl-none bg-wa-bubble-in px-3.5 py-3 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        <BubbleTail outgoing={false} />
        <span className="flex items-center gap-1">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="size-2 rounded-full bg-wa-meta motion-safe:animate-[wa-typing_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function BubbleTail({ outgoing }: { outgoing: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 13"
      className={cn(
        "absolute top-0 h-[13px] w-2",
        outgoing ? "-right-2 text-wa-bubble-out" : "-left-2 text-wa-bubble-in",
      )}
    >
      <path fill="currentColor" d={outgoing ? "M0 0h6.6c1.2 0 1.8 1.4 1 2.3L0 11z" : "M8 0H1.4C.2 0-.4 1.4.4 2.3L8 11z"} />
    </svg>
  );
}
