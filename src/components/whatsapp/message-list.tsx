"use client";

import { Bot } from "lucide-react";
import { Fragment, useLayoutEffect, useRef } from "react";

import { MessageBubble } from "@/components/whatsapp/message-bubble";
import { formatChatDay, todayInZone } from "@/lib/time";
import type { ChatMessage, SimulatorBusiness } from "@/types/simulator";

type Props = {
  business: SimulatorBusiness;
  messages: ChatMessage[];
  typing: boolean;
  now: Date;
  timeZone: string;
};

export function MessageList({ business, messages, typing, now, timeZone }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as messages arrive and when typing starts.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
      <p className="mx-auto mt-3 mb-1 flex w-fit max-w-[85%] items-start gap-1.5 rounded-lg bg-wa-notice px-3 py-1.5 text-center text-[12.5px] leading-snug text-wa-notice-text shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        <Bot className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          {business.agentName} is an AI booking assistant for {business.name}. This chat is a BookMate AI demo.
        </span>
      </p>

      <div role="log" aria-label={`Messages with ${business.name}`} aria-live="polite">
        {messages.map((message, i) => {
          const previous = messages[i - 1];
          const day = todayInZone(timeZone, new Date(message.sentAt));
          const newDay = !previous || todayInZone(timeZone, new Date(previous.sentAt)) !== day;
          const startsGroup = newDay || previous?.direction !== message.direction;

          return (
            <Fragment key={message.id}>
              {newDay && (
                <div className="sticky top-1.5 z-10 my-2 flex justify-center">
                  <span className="rounded-lg bg-wa-pill px-3 py-1 text-[12.5px] text-wa-meta shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
                    {formatChatDay(new Date(message.sentAt), timeZone, now)}
                  </span>
                </div>
              )}
              <MessageBubble message={message} startsGroup={startsGroup} timeZone={timeZone} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
