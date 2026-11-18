"use client";

import { Bot, CalendarDays, ExternalLink, House, LayoutDashboard, MessagesSquare, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ResetDemoButton } from "@/components/demo/reset-demo-button";
import { cn } from "@/lib/utils";

type Business = { slug: string; name: string; emoji: string };

const SECTIONS = [
  { segment: "", label: "Overview", short: "Overview", icon: LayoutDashboard },
  { segment: "bookings", label: "Bookings", short: "Bookings", icon: CalendarDays },
  { segment: "conversations", label: "Conversations", short: "Chats", icon: MessagesSquare },
  { segment: "services", label: "Services & hours", short: "Services", icon: Store },
  { segment: "agent", label: "Agent", short: "Agent", icon: Bot },
] as const;

/**
 * Sidebar on large screens. Below `lg` the sections move to a tab bar fixed to the bottom
 * of the screen, like a phone app (the layout leaves room for it), and the sidebar's extra
 * links move to the dashboard header.
 */
export function DashboardNav({ businesses, slug }: { businesses: Business[]; slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/${slug}`;
  const section = pathname.slice(base.length).split("/")[1] ?? "";

  function switchBusiness(next: string) {
    // Stay on the same section; detail pages (a conversation) fall back to their list.
    router.push(`/dashboard/${next}${section ? `/${section}` : ""}`);
  }

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-3 lg:gap-6">
      <div className="flex items-center gap-3 px-1">
        <label htmlFor="business-switcher" className="sr-only">
          Business
        </label>
        <select
          id="business-switcher"
          value={slug}
          onChange={(e) => switchBusiness(e.target.value)}
          className="h-10 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-background px-2.5 text-base font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-9 lg:text-sm"
        >
          {businesses.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.emoji} {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sidebar (lg and up) */}
      <ul className="hidden flex-col gap-1 lg:flex">
        {SECTIONS.map(({ segment, label, icon: Icon }) => {
          const active = section === segment;
          return (
            <li key={segment}>
              <Link
                href={segment ? `${base}/${segment}` : base}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-tint font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom tab bar (below lg) */}
      <ul className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {SECTIONS.map(({ segment, short, icon: Icon }) => {
          const active = section === segment;
          return (
            <li key={segment} className="min-w-0">
              <Link
                href={segment ? `${base}/${segment}` : base}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-xs leading-none transition-colors",
                  active ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-tint")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="max-w-full truncate">{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden flex-col gap-1 border-t pt-4 lg:flex">
        <Link
          href={`/simulator/${slug}`}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" aria-hidden />
          Open chat simulator
        </Link>
        <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <House className="size-4" aria-hidden />
          All businesses
        </Link>
        <div className="mt-2 px-1">
          <ResetDemoButton variant="ghost" />
        </div>
      </div>
    </nav>
  );
}
