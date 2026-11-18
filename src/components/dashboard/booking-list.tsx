import { CalendarX2 } from "lucide-react";

import { BookingStatusBadge, SourceBadge } from "@/components/dashboard/badges";
import { CancelBookingButton } from "@/components/dashboard/cancel-booking-button";
import type { DashboardBooking } from "@/lib/dashboard/queries";
import { formatPhone } from "@/lib/format";
import { addDays, formatClockTime, formatInZone, zonedDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  bookings: DashboardBooking[];
  /** Days to show, in order. Days with no bookings say so. */
  days: string[];
  today: string;
  timeZone: string;
};

export function BookingList({ slug, bookings, days, today, timeZone }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {days.map((date) => {
        const dayBookings = bookings.filter((b) => b.date === date);
        const active = dayBookings.filter((b) => b.status !== "cancelled").length;
        return (
          <section key={date} aria-labelledby={`day-${date}`} className="flex flex-col gap-2">
            <h2 id={`day-${date}`} className="flex items-baseline gap-2 font-sans text-sm font-semibold tracking-normal">
              {formatInZone(zonedDateTime(date, "12:00", timeZone), timeZone, "EEEE d MMMM")}
              {date === today && <span className="text-xs font-normal text-primary">Today</span>}
              {date === addDays(today, 1) && <span className="text-xs font-normal text-muted-foreground">Tomorrow</span>}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {active} {active === 1 ? "booking" : "bookings"}
              </span>
            </h2>
            {dayBookings.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                <CalendarX2 className="size-4" aria-hidden />
                No bookings
              </p>
            ) : (
              <ul className="@container divide-y rounded-xl border bg-card">
                {dayBookings.map((b) => (
                  <BookingRow key={b.id} slug={slug} booking={b} timeZone={timeZone} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function BookingRow({ slug, booking: b, timeZone }: { slug: string; booking: DashboardBooking; timeZone: string }) {
  const cancelled = b.status === "cancelled";
  const day = formatInZone(zonedDateTime(b.date, "12:00", timeZone), timeZone, "EEEE d MMMM");
  return (
    // One line only when the list itself is wide (container query): the overview's half-width
    // column stacks like a phone does. The parent <ul> is the @container.
    <li className={cn("flex flex-col gap-2 px-4 py-3 @xl:flex-row @xl:items-center @xl:gap-4", cancelled && "opacity-60")}>
      <div className="shrink-0 text-sm whitespace-nowrap tabular-nums @xl:w-44">
        <span className={cn("font-medium", cancelled && "line-through")}>{formatClockTime(b.time)}</span>
        <span className="text-muted-foreground"> – {formatClockTime(b.endTime)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {b.serviceName}
          {b.partySize ? <span className="font-normal text-muted-foreground"> · party of {b.partySize}</span> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {b.customerName ?? "Unnamed customer"} · {formatPhone(b.customerPhone)}
        </p>
        {b.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">“{b.notes}”</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <BookingStatusBadge status={b.status} />
        <SourceBadge source={b.source} />
        {b.upcoming && (
          <CancelBookingButton
            slug={slug}
            bookingId={b.id}
            summary={`${b.serviceName} for ${b.customerName ?? "this customer"} on ${day} at ${formatClockTime(b.time)}`}
          />
        )}
      </div>
    </li>
  );
}
