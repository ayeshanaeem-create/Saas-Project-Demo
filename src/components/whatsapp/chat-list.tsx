"use client";

import {
  Camera,
  CircleDashed,
  EllipsisVertical,
  House,
  MessageCircle,
  Moon,
  Phone,
  PhoneOutgoing,
  Search,
  Sun,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import { MessageStatus } from "@/components/whatsapp/message-status";
import { useSimulator } from "@/components/whatsapp/simulator-provider";
import { useEmbedded, useSimulatorTheme } from "@/components/whatsapp/simulator-shell";
import { useNow } from "@/hooks/use-now";
import { SIMULATOR_TIMEZONE } from "@/lib/simulator/constants";
import { formatChatListTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { stripWhatsAppFormatting } from "@/lib/whatsapp-format";

type Filter = "all" | "unread";

const INACTIVE_TABS = [
  { label: "Updates", icon: CircleDashed, title: "Updates aren't part of the demo." },
  { label: "Communities", icon: UsersRound, title: "Communities aren't part of the demo." },
  { label: "Calls", icon: Phone, title: "Call history isn't part of the demo. Calls show in each chat." },
] as const;

export function ChatList() {
  const { businesses, state, startedAt } = useSimulator();
  const { dark, toggleDark } = useSimulatorTheme();
  // Inside the live demo's iframe there is no "back": the page around it is the demo.
  const embedded = useEmbedded();
  const now = useNow(startedAt);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const needle = query.trim().toLowerCase();
  const rows = businesses
    .map((business) => {
      const conversation = state.conversations[business.slug];
      return { business, conversation, last: conversation?.messages.findLast((m) => m.kind !== "notice") };
    })
    .filter(({ business }) => business.name.toLowerCase().includes(needle))
    .filter(({ conversation }) => filter === "all" || (conversation?.unread ?? 0) > 0)
    // Most recent chat first, like WhatsApp. Ties keep the seed order.
    .sort((a, b) => (b.last?.sentAt ?? "").localeCompare(a.last?.sentAt ?? ""));

  return (
    <div className="flex h-full min-h-0 flex-col bg-wa-surface text-wa-text">
      <header className="flex h-14 shrink-0 items-center justify-between bg-wa-bar pr-2 pl-4 text-wa-bar-text">
        <h1 className="text-[22px] font-semibold">Chats</h1>
        {/* In the phone frame (sm and up) these icons are decoration, as on WhatsApp. Full-screen
            on a phone, they are the frame's controls instead: dark mode, and the way back. */}
        <div aria-hidden className="hidden sm:flex">
          <span className="flex size-10 items-center justify-center">
            <Camera className="size-5" />
          </span>
          <span className="flex size-10 items-center justify-center">
            <EllipsisVertical className="size-5" />
          </span>
        </div>
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={toggleDark}
            aria-pressed={dark}
            aria-label="Dark mode"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-wa-bar-text/10"
          >
            {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
          </button>
          {!embedded && (
            <Link
              href="/"
              aria-label="Back to businesses"
              className="flex size-10 items-center justify-center rounded-full hover:bg-wa-bar-text/10"
            >
              <House className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      </header>

      <div className="shrink-0 px-3 pt-2.5 pb-2">
        <label className="flex h-10 items-center gap-3 rounded-full bg-wa-hover px-4 text-wa-meta">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Search chats</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-wa-text outline-none placeholder:text-wa-meta"
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
          const typing = conversation?.typing ?? false;
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
                            {last.kind === "call" && <PhoneOutgoing className="size-3.5 shrink-0" aria-hidden />}
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

      {/* WhatsApp's four tabs. Only Chats is part of the demo; the others are greyed out. */}
      <nav aria-label="Sections" className="grid h-16 shrink-0 grid-cols-4 border-t border-wa-divider">
        <span aria-current="page" className="flex min-w-0 flex-col items-center justify-center gap-1 text-[14px] font-medium">
          <span className="flex h-7 w-14 items-center justify-center rounded-full bg-wa-primary/15 text-wa-primary">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          Chats
        </span>
        {INACTIVE_TABS.map(({ label, icon: Icon, title }) => (
          <span
            key={label}
            aria-disabled
            title={title}
            className="flex min-w-0 flex-col items-center justify-center gap-1 text-[14px] text-wa-meta"
          >
            <span className="flex h-7 w-14 items-center justify-center">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="max-w-full truncate px-0.5">{label}</span>
          </span>
        ))}
      </nav>
    </div>
  );
}
