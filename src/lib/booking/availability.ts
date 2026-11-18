// Pure slot logic: no database, no clock. Everything it needs comes in as arguments,
// so it can be unit-tested exhaustively. src/lib/booking/bookings.ts feeds it from the DB.

import { clockToMinutes, daysBetween, minutesToClock, todayInZone, zonedDateTime } from "@/lib/time";

const MINUTE = 60_000;

/** Booking rules shared by every business for now. */
export const BOOKING_RULES = {
  /** A slot must start at least this far in the future. */
  minNoticeMin: 30,
  /** How many days ahead customers can book. */
  maxAdvanceDays: 60,
} as const;

export type OpeningHours = { opensAt: string; closesAt: string };
export type BookedInterval = { startAt: Date; endAt: Date };

export type SlotQuery = {
  /** Local calendar date in the business timezone, "YYYY-MM-DD". */
  date: string;
  timeZone: string;
  /** That weekday's opening hours, or null when closed. */
  hours: OpeningHours | null;
  slotIntervalMin: number;
  durationMin: number;
  /** Bookings of this service that may overlap in time. */
  capacity: number;
  /** Non-cancelled bookings of this service. Bookings on other days are ignored. */
  bookings: BookedInterval[];
  now: Date;
  minNoticeMin?: number;
  maxAdvanceDays?: number;
};

export type Slot = {
  /** Local start time, "HH:mm". */
  time: string;
  startAt: Date;
  endAt: Date;
  /** How many more bookings this slot can take. Always ≥ 1 for a returned slot. */
  remaining: number;
};

export type SlotRejection = "CLOSED" | "OUTSIDE_HOURS" | "NOT_ON_GRID" | "IN_PAST" | "TOO_SOON" | "TOO_FAR" | "FULL";

export type SlotCheck = { ok: true; slot: Slot } | { ok: false; reason: SlotRejection };

/** Can a booking start at `time` ("HH:mm") on the query's date? */
export function checkSlot(query: SlotQuery, time: string): SlotCheck {
  const { hours, now } = query;
  const minNotice = query.minNoticeMin ?? BOOKING_RULES.minNoticeMin;
  const maxAdvance = query.maxAdvanceDays ?? BOOKING_RULES.maxAdvanceDays;

  // Date-level problems first: "too far ahead" beats "closed that day".
  const daysAhead = daysBetween(todayInZone(query.timeZone, now), query.date);
  if (daysAhead < 0) return { ok: false, reason: "IN_PAST" };
  if (daysAhead > maxAdvance) return { ok: false, reason: "TOO_FAR" };
  if (!hours) return { ok: false, reason: "CLOSED" };

  const start = clockToMinutes(time);
  const opens = clockToMinutes(hours.opensAt);
  const closes = clockToMinutes(hours.closesAt);
  if (start < opens || start + query.durationMin > closes) return { ok: false, reason: "OUTSIDE_HOURS" };
  if ((start - opens) % query.slotIntervalMin !== 0) return { ok: false, reason: "NOT_ON_GRID" };

  const startAt = zonedDateTime(query.date, time, query.timeZone);
  const endAt = new Date(startAt.getTime() + query.durationMin * MINUTE);
  if (startAt.getTime() <= now.getTime()) return { ok: false, reason: "IN_PAST" };
  if (startAt.getTime() < now.getTime() + minNotice * MINUTE) return { ok: false, reason: "TOO_SOON" };

  const remaining = query.capacity - maxConcurrent(query.bookings, startAt, endAt);
  if (remaining <= 0) return { ok: false, reason: "FULL" };

  return { ok: true, slot: { time, startAt, endAt, remaining } };
}

/** Every bookable start time on the query's date, earliest first. */
export function computeSlots(query: SlotQuery): Slot[] {
  if (!query.hours) return [];
  const opens = clockToMinutes(query.hours.opensAt);
  const closes = clockToMinutes(query.hours.closesAt);

  const slots: Slot[] = [];
  for (let start = opens; start + query.durationMin <= closes; start += query.slotIntervalMin) {
    const check = checkSlot(query, minutesToClock(start));
    if (check.ok) slots.push(check.slot);
  }
  return slots;
}

/** The `count` slots closest to `time`, returned in time order. Ties prefer the earlier slot. */
export function nearestSlots(slots: Slot[], time: string, count = 3): Slot[] {
  const target = clockToMinutes(time);
  return [...slots]
    .sort((a, b) => {
      const da = Math.abs(clockToMinutes(a.time) - target);
      const db = Math.abs(clockToMinutes(b.time) - target);
      return da - db || a.startAt.getTime() - b.startAt.getTime();
    })
    .slice(0, count)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** The smallest table that seats `partySize`, or null if none is big enough. */
export function pickTableService<T extends { partySize: number | null }>(services: T[], partySize: number): T | null {
  let best: T | null = null;
  for (const service of services) {
    if (service.partySize === null || service.partySize < partySize) continue;
    if (!best || service.partySize < (best.partySize ?? Infinity)) best = service;
  }
  return best;
}

/**
 * The most bookings running at the same instant within [start, end).
 * Two bookings that both touch the window but never overlap each other count as one.
 */
export function maxConcurrent(bookings: BookedInterval[], start: Date, end: Date): number {
  const events: Array<[time: number, delta: 1 | -1]> = [];
  for (const b of bookings) {
    if (b.startAt < end && b.endAt > start) {
      events.push([Math.max(b.startAt.getTime(), start.getTime()), 1]);
      events.push([Math.min(b.endAt.getTime(), end.getTime()), -1]);
    }
  }
  // At equal times, process ends before starts: back-to-back bookings don't overlap.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let running = 0;
  let peak = 0;
  for (const [, delta] of events) {
    running += delta;
    peak = Math.max(peak, running);
  }
  return peak;
}
