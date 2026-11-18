"use client";

import { Bot, CalendarDays, ExternalLink, House, LayoutDashboard, MessagesSquare, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ResetDemoButton } from "@/components/demo/reset-demo-button";
import { cn } from "@/lib/utils";

type Business = { slug: string; name: string; emoji: string };

const SECTIONS = [
  { segment: "", label: "Overview", icon: LayoutDashboard },
  { segment: "bookings", label: "Bookings", icon: CalendarDays },
  { segment: "conversations", label: "Conversations", icon: MessagesSquare },
  { segment: "services", label: "Services & hours", icon: Store },
  { segment: "agent", label: "Agent", icon: Bot },
] as const;

/** Sidebar on large screens, a scrolling tab bar on small ones. */
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
          className="h-9 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {businesses.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.emoji} {b.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {SECTIONS.map(({ segment, label, icon: Icon }) => {
          const active = section === segment;
          return (
            <li key={segment} className="shrink-0">
              <Link
                href={segment ? `${base}/${segment}` : base}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
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
