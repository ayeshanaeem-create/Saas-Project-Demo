import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { BookingList } from "@/components/dashboard/booking-list";
import { NewBookingDialog } from "@/components/dashboard/new-booking-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { getBookingsBetween, getBusinessBySlug, getServicesAndHours } from "@/lib/dashboard/queries";
import { addDays, formatInZone, todayInZone, zonedDateTime } from "@/lib/time";
import { isoDateSchema } from "@/types/domain";

export const metadata: Metadata = { title: "Bookings" };

const DAYS = 7;

export default function BookingsPage({ params, searchParams }: PageProps<"/dashboard/[slug]/bookings">) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Bookings params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookings({ params, searchParams }: PageProps<"/dashboard/[slug]/bookings">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const now = new Date();
  const today = todayInZone(business.timezone, now);
  const requested = isoDateSchema.safeParse(query.from);
  const from = requested.success ? requested.data : today;
  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));

  const [bookings, { services, hours }] = await Promise.all([
    getBookingsBetween(business, from, DAYS, now),
    getServicesAndHours(business),
  ]);

  const label = (date: string) => formatInZone(zonedDateTime(date, "12:00", business.timezone), business.timezone, "d MMM");
  const weekLink = (date: string) => (date === today ? `/dashboard/${slug}/bookings` : `/dashboard/${slug}/bookings?from=${date}`);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <PageHeader
        title="Bookings"
        description={`${label(from)} – ${label(days.at(-1)!)}. Bookings from the AI agent appear here as they happen.`}
        actions={
          <NewBookingDialog
            slug={slug}
            services={services.filter((s) => s.isActive).map(({ id, name, partySize }) => ({ id, name, partySize }))}
            hours={hours}
            slotIntervalMin={business.slotIntervalMin}
            today={today}
          />
        }
      />

      {/* On phones "week" is only for screen readers, so three bold buttons fit in 360px. */}
      <nav aria-label="Weeks" className="flex items-center gap-2">
        <Link href={weekLink(addDays(from, -DAYS))} className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-coarse:h-9" })}>
          <ChevronLeft aria-hidden />
          Previous<span className="max-sm:sr-only">&nbsp;week</span>
        </Link>
        {from !== today && (
          <Link href={weekLink(today)} className={buttonVariants({ variant: "ghost", size: "sm", className: "pointer-coarse:h-9" })}>
            Today
          </Link>
        )}
        <Link href={weekLink(addDays(from, DAYS))} className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-coarse:h-9" })}>
          Next<span className="max-sm:sr-only">&nbsp;week</span>
          <ChevronRight aria-hidden />
        </Link>
      </nav>

      <BookingList slug={slug} bookings={bookings} days={days} today={today} timeZone={business.timezone} />
    </div>
  );
}
