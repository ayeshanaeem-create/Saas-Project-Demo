import { MessagesSquare } from "lucide-react";
import Link from "next/link";

import { ChannelBadge, ConversationStatusBadge } from "@/components/dashboard/badges";
import type { ConversationSummary } from "@/lib/dashboard/queries";
import { formatPhone } from "@/lib/format";
import { formatChatListTime } from "@/lib/time";
import { stripWhatsAppFormatting } from "@/lib/whatsapp-format";
import { cn } from "@/lib/utils";

export function ConversationList({
  slug,
  conversations,
  timeZone,
  now,
}: {
  slug: string;
  conversations: ConversationSummary[];
  timeZone: string;
  now: Date;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        <MessagesSquare className="size-6" aria-hidden />
        <p>No conversations yet.</p>
        <p>
          Send a message from the{" "}
          <Link href={`/simulator/${slug}`} className="font-medium text-foreground underline underline-offset-4">
            chat simulator
          </Link>{" "}
          and it shows up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/dashboard/${slug}/conversations/${c.id}`}
            className={cn("flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50", c.status === "handoff" && "bg-amber-500/5")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{c.customerName ?? formatPhone(c.customerPhone)}</span>
                <ConversationStatusBadge status={c.status} />
                <ChannelBadge channel={c.channel} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {c.lastMessage ? (
                  <>
                    {c.lastFromCustomer ? "" : "Agent: "}
                    {stripWhatsAppFormatting(c.lastMessage.replace(/\s+/g, " "))}
                  </>
                ) : (
                  "No messages"
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
              <span>{formatChatListTime(new Date(c.updatedAt), timeZone, now)}</span>
              <span>
                {c.messageCount} {c.messageCount === 1 ? "message" : "messages"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
