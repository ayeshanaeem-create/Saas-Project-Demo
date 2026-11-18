import { Bot, CalendarCheck, CalendarDays, ExternalLink, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { BookingRow } from "@/components/dashboard/booking-list";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { getBusinessBySlug, getOverview } from "@/lib/dashboard/queries";
import { formatInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage({ params }: PageProps<"/dashboard/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: Pick<PageProps<"/dashboard/[slug]">, "params">) {
  const { slug } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const now = new Date();
  const { stats, todaysBookings, recentConversations } = await getOverview(business, now);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <PageHeader
        title={`${business.emoji} ${business.name}`}
        description={`Today is ${formatInZone(now, business.timezone, "EEEE d MMMM")}. This page updates live.`}
        actions={
          <Link href={`/simulator/${slug}`} className={buttonVariants({ variant: "outline" })}>
            <ExternalLink aria-hidden />
            Open chat simulator
          </Link>
        }
      />

      {stats.handoffs > 0 && (
        <Link
          href={`/dashboard/${slug}/conversations`}
          className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm transition-colors hover:bg-amber-500/15"
        >
          <TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            <strong className="font-medium">
              {stats.handoffs} {stats.handoffs === 1 ? "customer has" : "customers have"} asked for a person.
            </strong>{" "}
            Open conversations to reply.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Today" value={stats.today} hint="Bookings today" icon={CalendarCheck} />
        <StatCard label="Next 7 days" value={stats.next7Count} hint="Upcoming bookings" icon={CalendarDays} />
        <StatCard label="Booked by AI" value={stats.agentThisWeek} hint="In the last 7 days" icon={Bot} />
        <StatCard label="Needs a person" value={stats.handoffs} hint="Handed-off chats" icon={TriangleAlert} tone="attention" />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="today-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="today-heading" className="font-heading text-lg font-medium">
              Today&apos;s schedule
            </h2>
            <Link href={`/dashboard/${slug}/bookings`} className="text-sm text-muted-foreground hover:text-foreground">
              All bookings →
            </Link>
          </div>
          {todaysBookings.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing booked for today yet.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {todaysBookings.map((b) => (
                <BookingRow key={b.id} slug={slug} booking={b} timeZone={business.timezone} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="chats-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="chats-heading" className="font-heading text-lg font-medium">
              Recent conversations
            </h2>
            <Link href={`/dashboard/${slug}/conversations`} className="text-sm text-muted-foreground hover:text-foreground">
              All conversations →
            </Link>
          </div>
          <ConversationList slug={slug} conversations={recentConversations} timeZone={business.timezone} now={now} />
        </section>
      </div>
    </div>
  );
}
