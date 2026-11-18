import { Bot, CalendarCheck, LayoutDashboard, MessagesSquare, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ChannelBadge } from "@/components/dashboard/badges";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { TranscriptView } from "@/components/dashboard/transcript-view";
import { ResetDemoButton } from "@/components/demo/reset-demo-button";
import { ScenarioButtons } from "@/components/demo/scenario-buttons";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { agentMode } from "@/lib/agent/config";
import { getBusinessBySlug, getConversationDetail, getConversations, getRecentAgentBookings, listBusinesses } from "@/lib/dashboard/queries";
import { DEMO_PHONE_ID } from "@/lib/demo/constants";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { formatClockTime, formatInZone, zonedDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Live demo · BookMate AI" };

// The demo view: the real simulator (in an iframe, so it behaves exactly like the phone
// app) next to what the business sees, updating live.
export default function DemoPage({ params }: PageProps<"/demo/[slug]">) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <Suspense fallback={<div className="h-16 border-b bg-background" />}>
        <DemoHeader params={params} />
      </Suspense>
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-10 lg:px-8">
        <Suspense fallback={<PhoneFrame>{null}</PhoneFrame>}>
          <DemoPhone params={params} />
        </Suspense>
        <Suspense fallback={<PageSkeleton rows={3} />}>
          <LivePanel params={params} />
        </Suspense>
      </main>
    </div>
  );
}

type Params = Pick<PageProps<"/demo/[slug]">, "params">;

async function DemoHeader({ params }: Params) {
  const { slug } = await params;
  await connection();
  const businesses = await listBusinesses();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
          BookMate AI <span className="font-normal text-muted-foreground">· live demo</span>
        </Link>
        <nav aria-label="Demo businesses" className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
          {businesses.map((b) => (
            <Link
              key={b.slug}
              href={`/demo/${b.slug}`}
              aria-current={b.slug === slug ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                b.slug === slug ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {b.emoji} {b.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/${slug}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <LayoutDashboard aria-hidden />
            Full dashboard
          </Link>
          <ResetDemoButton />
        </div>
      </div>
    </header>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-[75dvh] w-full max-w-[395px] overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-950 bg-background shadow-2xl lg:sticky lg:top-6 lg:h-[min(812px,calc(100dvh-8rem))] lg:w-[395px]">
      {children ?? <Skeleton className="h-full w-full rounded-none" />}
    </div>
  );
}

async function DemoPhone({ params }: Params) {
  const { slug } = await params;
  return (
    <PhoneFrame>
      {/* 375px wide, so the simulator renders its full-screen phone layout. */}
      <iframe
        key={slug}
        id={DEMO_PHONE_ID}
        src={`/simulator/${slug}`}
        title="Customer's phone"
        allow="microphone; autoplay"
        className="h-full w-full border-0"
      />
    </PhoneFrame>
  );
}

async function LivePanel({ params }: Params) {
  const { slug } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const [recent, [latest]] = await Promise.all([getRecentAgentBookings(business, 5), getConversations(business, { limit: 1 })]);
  const detail = latest ? await getConversationDetail(business, latest.id) : null;
  const scenarios = SCENARIOS[business.category];
  const scripted = agentMode() === "scripted";
  const day = (date: string) => formatInZone(zonedDateTime(date, "12:00", business.timezone), business.timezone, "EEE d MMM");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AutoRefresh seconds={3} />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {business.emoji} {business.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat or call from the phone, as a customer would on WhatsApp. This panel shows what the business sees, live.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel icon={Sparkles} title="Try saying">
          <ScenarioButtons slug={slug} scenarios={scenarios} />
          <p className="mt-3 text-xs text-muted-foreground">
            Click to send, in order, or type anything in the chat. The 📞 icon starts a voice call (Chrome or Edge).
            {scripted && " Replies come from the free scripted assistant; add an API key to switch to Claude."}
          </p>
        </Panel>

        <Panel icon={CalendarCheck} title="Booked by the agent">
          {recent.length === 0 ? (
            <Empty>Nothing yet. Book something in the chat and it appears here.</Empty>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {recent.map((b) => (
                <li key={b.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", b.status === "cancelled" && "opacity-60")}>
                  <Bot className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", b.status === "cancelled" && "line-through")}>
                      {b.serviceName}
                      {b.partySize ? <span className="font-normal text-muted-foreground"> · {b.partySize} people</span> : null}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {day(b.date)}, {formatClockTime(b.time)} · {b.customerName ?? "Unnamed"}
                    </p>
                  </div>
                  {b.status === "cancelled" && <span className="text-xs text-destructive">Cancelled</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        icon={MessagesSquare}
        title="Live transcript"
        aside={detail && <ChannelBadge channel={detail.summary.channel} />}
      >
        {detail && detail.transcript.length > 0 ? (
          <div className="max-h-[32rem] overflow-y-auto rounded-lg border bg-card p-4">
            <TranscriptView items={detail.transcript} timeZone={business.timezone} />
          </div>
        ) : (
          <Empty>The conversation shows up here as it happens, including what the agent looked up.</Empty>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: typeof Bot;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 font-heading text-base font-medium">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {title}
        {aside}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
