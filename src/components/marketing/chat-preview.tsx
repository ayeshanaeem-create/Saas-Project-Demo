import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import { MessageBubble } from "@/components/whatsapp/message-bubble";
import type { ChatMessage } from "@/types/simulator";

const TZ = "Asia/Karachi";

// A fixed example conversation for the landing page hero, drawn with the simulator's bubbles.
// Times are fixed labels: the page is prerendered, and formatting a timezone reads the clock.
const MESSAGES: (ChatMessage & { time: string })[] = [
  { id: "1", direction: "outgoing", text: "Hi! Can I get a haircut tomorrow around 5?", sentAt: "2026-11-18T11:41:00Z", status: "read", time: "4:41 PM" },
  {
    id: "2",
    direction: "incoming",
    text: "Hi! ✨ Yes, *5:00 PM* tomorrow is free. What name should I put the booking under?",
    sentAt: "2026-11-18T11:41:00Z",
    time: "4:41 PM",
  },
  { id: "3", direction: "outgoing", text: "Sara", sentAt: "2026-11-18T11:42:00Z", status: "read", time: "4:42 PM" },
  {
    id: "4",
    direction: "incoming",
    text: "You're booked! ✅ *Haircut* tomorrow at *5:00 PM*. See you then, Sara!",
    sentAt: "2026-11-18T11:42:00Z",
    time: "4:42 PM",
  },
];

export function ChatPreview() {
  return (
    <div
      aria-label="Example WhatsApp conversation with a booking agent"
      role="img"
      className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.25rem] border-[9px] border-neutral-950 bg-wa-surface font-wa shadow-2xl"
    >
      <div className="flex items-center gap-2.5 bg-wa-bar px-3 py-2.5 text-wa-bar-text">
        <BusinessAvatar emoji="💇‍♀️" className="size-8 text-base" />
        <div className="leading-tight">
          <p className="text-[15px] font-medium">Glamour Salon</p>
          <p className="text-xs text-wa-bar-meta">online</p>
        </div>
      </div>
      <div aria-hidden className="wa-chat-wallpaper flex flex-col pt-1 pb-4">
        {MESSAGES.map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            timeZone={TZ}
            timeLabel={message.time}
            startsGroup={i === 0 || MESSAGES[i - 1]!.direction !== message.direction}
          />
        ))}
      </div>
    </div>
  );
}
