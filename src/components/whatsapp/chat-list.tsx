"use client";

import { Camera, EllipsisVertical, MessageCircle, Phone, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import { MessageStatus } from "@/components/whatsapp/message-status";
import { useSimulator } from "@/components/whatsapp/simulator-provider";
import { useNow } from "@/hooks/use-now";
import { SIMULATOR_TIMEZONE } from "@/lib/simulator/constants";
import { formatChatListTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { stripWhatsAppFormatting } from "@/lib/whatsapp-format";

type Filter = "all" | "unread";

export function ChatList() {
  const { businesses, state, startedAt } = useSimulator();
  const now = useNow(startedAt);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const needle = query.trim().toLowerCase();
  const rows = businesses
    .map((business) => {
      const conversation = state.conversations[business.slug];
      return { business, conversation, last: conversation?.messages.at(-1) };
    })
    .filter(({ business }) => business.name.toLowerCase().includes(needle))
    .filter(({ conversation }) => filter === "all" || (conversation?.unread ?? 0) > 0)
    // Most recent chat first, like WhatsApp. Ties keep the seed order.
    .sort((a, b) => (b.last?.sentAt ?? "").localeCompare(a.last?.sentAt ?? ""));

  return (
    <div className="flex h-full min-h-0 flex-col bg-wa-surface text-wa-text">
      <header className="flex h-14 shrink-0 items-center justify-between pr-2 pl-4">
        <h1 className="text-[22px] font-semibold text-wa-primary">Chats</h1>
        <div aria-hidden className="flex text-wa-icon">
          <span className="flex size-10 items-center justify-center">
            <Camera className="size-5" />
          </span>
          <span className="flex size-10 items-center justify-center">
            <EllipsisVertical className="size-5" />
          </span>
        </div>
      </header>

      <div className="shrink-0 px-3 pb-2">
        <label className="flex h-10 items-center gap-3 rounded-full bg-wa-hover px-4 text-wa-meta">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Search chats</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-wa-text outline-none placeholder:text-wa-meta"
          />
        </label>
      </div>

      <div role="group" aria-label="Filter chats" className="flex shrink-0 gap-2 px-3 pb-2">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3.5 text-[14px] transition-colors",
              filter === value ? "bg-wa-primary/15 font-medium text-wa-primary" : "bg-wa-hover text-wa-meta",
            )}
          >
            {value === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {rows.map(({ business, conversation, last }) => {
          const unread = conversation?.unread ?? 0;
          const typing = (conversation?.pendingReplies ?? 0) > 0;
          return (
            <li key={business.slug}>
              <Link
                href={`/simulator/${business.slug}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-wa-hover"
              >
                <BusinessAvatar emoji={business.emoji} className="size-12 text-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[16px] font-medium">{business.name}</span>
                    {last && (
                      <span
                        className={cn("shrink-0 text-xs", unread ? "font-medium text-wa-primary" : "text-wa-meta")}
                      >
                        {formatChatListTime(new Date(last.sentAt), SIMULATOR_TIMEZONE, now)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 text-[14px] text-wa-meta">
                      {typing ? (
                        <span className="text-wa-primary">typing…</span>
                      ) : (
                        last && (
                          <>
                            {last.direction === "outgoing" && last.status && <MessageStatus status={last.status} />}
                            <span className="truncate">{stripWhatsAppFormatting(last.text.replace(/\s+/g, " "))}</span>
                          </>
                        )
                      )}
                    </span>
                    {unread > 0 && (
                      <span
                        aria-label={`${unread} unread`}
                        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wa-primary px-1.5 text-xs font-semibold text-wa-primary-foreground"
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}

        {rows.length === 0 && (
          <li className="px-6 py-10 text-center text-[14px] text-wa-meta">
            {filter === "unread" && !needle ? "No unread chats" : `No chats match “${query.trim()}”`}
          </li>
        )}
      </ul>

      <nav aria-label="Sections" className="grid h-16 shrink-0 grid-cols-2 border-t border-wa-divider">
        <span aria-current="page" className="flex flex-col items-center justify-center gap-1 text-[12px] font-medium">
          <span className="flex h-7 w-14 items-center justify-center rounded-full bg-wa-primary/15 text-wa-primary">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          Chats
        </span>
        <span
          aria-disabled
          title="Calls arrive in Phase 6"
          className="flex flex-col items-center justify-center gap-1 text-[12px] text-wa-meta"
        >
          <span className="flex h-7 w-14 items-center justify-center">
            <Phone className="size-5" aria-hidden />
          </span>
          Calls
        </span>
      </nav>
    </div>
  );
}
