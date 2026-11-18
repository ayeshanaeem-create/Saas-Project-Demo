import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import {
  BOOKING_RULES,
  checkSlot,
  computeSlots,
  nearestSlots,
  pickTableService,
  type SlotQuery,
  type SlotRejection,
} from "@/lib/booking/availability";
import { BookingError } from "@/lib/booking/errors";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import { addDays, formatClockTime, formatInZone, todayInZone, weekdayOf, zonedDateTime } from "@/lib/time";
import {
  bookingSourceSchema,
  bookingStatusSchema,
  clockTimeSchema,
  isoDateSchema,
  type BookingSource,
  type BookingStatus,
} from "@/types/domain";

// Booking operations against the database. Every function is scoped to one business:
// a service or booking from another business is reported as not found.
// Slot rules live in ./availability.ts; this module loads their inputs and writes results.

type Tx = Prisma.TransactionClient;

export type BookingSummary = {
  id: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerName: string | null;
  /** Local date and times in the business timezone. */
  date: string;
  time: string;
  endTime: string;
  durationMin: number;
  partySize: number | null;
  status: BookingStatus;
  source: BookingSource;
  notes: string | null;
};

export type DayAvailability = {
  date: string;
  /** "Wednesday" */
  weekday: string;
  hours: { opensAt: string; closesAt: string } | null;
  slots: { time: string; remaining: number }[];
};

// ---------------------------------------------------------------------------
// Reads

/** Open start times for one service on one date. */
export async function getAvailability(input: {
  businessId: string;
  serviceId: string;
  date: string;
  now?: Date;
}): Promise<DayAvailability> {
  const date = parse(isoDateSchema, input.date, "date");
  const now = input.now ?? new Date();
  const service = await loadService(db, input.businessId, input.serviceId);
  const query = await buildSlotQuery(db, service, date, now);

  return {
    date,
    weekday: weekdayName(date, service.business.timezone),
    hours: query.hours,
    slots: computeSlots(query).map(({ time, remaining }) => ({ time, remaining })),
  };
}

/** The first `limit` open start times from now onwards, looking up to `days` days ahead. */
export async function findNextAvailableSlots(input: {
  businessId: string;
  serviceId: string;
  now?: Date;
  days?: number;
  limit?: number;
}): Promise<{ date: string; weekday: string; time: string }[]> {
  const now = input.now ?? new Date();
  const days = Math.min(input.days ?? 14, BOOKING_RULES.maxAdvanceDays);
  const limit = input.limit ?? 5;
  const service = await loadService(db, input.businessId, input.serviceId);
  const today = todayInZone(service.business.timezone, now);

  const found: { date: string; weekday: string; time: string }[] = [];
  for (let offset = 0; offset <= days && found.length < limit; offset++) {
    const date = addDays(today, offset);
    const query = await buildSlotQuery(db, service, date, now);
    const weekday = weekdayName(date, service.business.timezone);
    for (const slot of computeSlots(query)) {
      found.push({ date, weekday, time: slot.time });
      if (found.length === limit) break;
    }
  }
  return found;
}

/** A customer's bookings with this business, soonest first. Past ones only if asked. */
export async function findCustomerBookings(input: {
  businessId: string;
  customerId: string;
  includePast?: boolean;
  now?: Date;
}): Promise<BookingSummary[]> {
  const now = input.now ?? new Date();
  const rows = await db.booking.findMany({
    where: {
      businessId: input.businessId,
      customerId: input.customerId,
      ...(input.includePast ? {} : { status: "confirmed", startAt: { gt: now } }),
    },
    include: summaryInclude,
    orderBy: { startAt: "asc" },
  });
  return rows.map(toSummary);
}

// ---------------------------------------------------------------------------
// Writes

/** Books a slot. Throws BookingError (with nearby alternatives) if it can't. */
export async function createBooking(input: {
  businessId: string;
  serviceId: string;
  customerId: string;
  date: string;
  time: string;
  partySize?: number | null;
  notes?: string | null;
  source: BookingSource;
  now?: Date;
}): Promise<BookingSummary> {
  const date = parse(isoDateSchema, input.date, "date");
  const time = parse(clockTimeSchema, input.time, "time");
  const source = parse(bookingSourceSchema, input.source, "source");
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    const service = await loadService(tx, input.businessId, input.serviceId);
    const partySize = await resolvePartySize(tx, service, input.partySize);

    const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) throw new BookingError("CUSTOMER_NOT_FOUND", "We couldn't find that customer.");

    const slot = await requireSlot(tx, service, date, time, now);
    const booking = await tx.booking.create({
      data: {
        businessId: service.businessId,
        serviceId: service.id,
        customerId: customer.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        partySize,
        notes: input.notes?.trim() || null,
        status: "confirmed",
        source,
      },
      include: summaryInclude,
    });
    return toSummary(booking);
  });
}

/**
 * Moves a confirmed, upcoming booking to a new date and time. The booking's own
 * current slot doesn't count against it, so it can shift by less than its length.
 * Pass `customerId` when acting for a customer: other customers' bookings are not found.
 */
export async function rescheduleBooking(input: {
  businessId: string;
  bookingId: string;
  customerId?: string;
  date: string;
  time: string;
  now?: Date;
}): Promise<BookingSummary> {
  const date = parse(isoDateSchema, input.date, "date");
  const time = parse(clockTimeSchema, input.time, "time");
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    const existing = await loadChangeableBooking(tx, input, now);
    const service = await loadService(tx, input.businessId, existing.serviceId);
    const slot = await requireSlot(tx, service, date, time, now, existing.id);

    const booking = await tx.booking.update({
      where: { id: existing.id },
      data: { startAt: slot.startAt, endAt: slot.endAt },
      include: summaryInclude,
    });
    return toSummary(booking);
  });
}

/** Cancels a confirmed, upcoming booking. Same `customerId` rule as rescheduleBooking. */
export async function cancelBooking(input: {
  businessId: string;
  bookingId: string;
  customerId?: string;
  now?: Date;
}): Promise<BookingSummary> {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const existing = await loadChangeableBooking(tx, input, now);
    const booking = await tx.booking.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
      include: summaryInclude,
    });
    return toSummary(booking);
  });
}

// ---------------------------------------------------------------------------
// Internals

type ServiceWithBusiness = Awaited<ReturnType<typeof loadService>>;

async function loadService(client: Tx, businessId: string, serviceId: string) {
  const service = await client.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
    include: { business: { include: { workingHours: true } } },
  });
  if (!service) throw new BookingError("SERVICE_NOT_FOUND", "That service isn't offered here.");
  return service;
}

async function buildSlotQuery(
  client: Tx,
  service: ServiceWithBusiness,
  date: string,
  now: Date,
  excludeBookingId?: string,
): Promise<SlotQuery> {
  const { business } = service;
  const weekday = weekdayOf(date);
  const hours = business.workingHours.find((h) => h.weekday === weekday) ?? null;
  const dayStart = zonedDateTime(date, "00:00", business.timezone);
  const dayEnd = zonedDateTime(addDays(date, 1), "00:00", business.timezone);

  const bookings = await client.booking.findMany({
    where: {
      serviceId: service.id,
      status: { not: "cancelled" },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { startAt: true, endAt: true },
  });

  return {
    date,
    timeZone: business.timezone,
    hours: hours && { opensAt: hours.opensAt, closesAt: hours.closesAt },
    slotIntervalMin: business.slotIntervalMin,
    durationMin: service.durationMin,
    capacity: service.capacity,
    bookings,
    now,
  };
}

/** The slot at `time`, or a BookingError explaining why not, with the nearest open times. */
async function requireSlot(
  client: Tx,
  service: ServiceWithBusiness,
  date: string,
  time: string,
  now: Date,
  excludeBookingId?: string,
) {
  const query = await buildSlotQuery(client, service, date, now, excludeBookingId);
  const check = checkSlot(query, time);
  if (check.ok) return check.slot;

  const alternatives = nearestSlots(computeSlots(query), time).map((s) => s.time);
  throw new BookingError(check.reason, rejectionMessage(check.reason, service, query, time), alternatives);
}

function rejectionMessage(reason: SlotRejection, service: ServiceWithBusiness, query: SlotQuery, time: string): string {
  const { business } = service;
  const day = weekdayName(query.date, business.timezone);
  const at = formatClockTime(time);
  switch (reason) {
    case "CLOSED":
      return `${business.name} is closed on ${day}s.`;
    case "OUTSIDE_HOURS": {
      const hours = query.hours ? ` (open ${formatClockTime(query.hours.opensAt)} to ${formatClockTime(query.hours.closesAt)})` : "";
      return `A ${formatDuration(service.durationMin)} ${service.name} at ${at} doesn't fit within opening hours on ${day}${hours}.`;
    }
    case "NOT_ON_GRID":
      return `Bookings start every ${business.slotIntervalMin} minutes, so ${at} isn't available.`;
    case "IN_PAST":
      return `${at} on ${day} has already passed.`;
    case "TOO_SOON":
      return `Bookings need at least ${BOOKING_RULES.minNoticeMin} minutes' notice.`;
    case "TOO_FAR":
      return `Bookings can be made up to ${BOOKING_RULES.maxAdvanceDays} days ahead.`;
    case "FULL":
      return `${service.name} at ${at} on ${day} is fully booked.`;
  }
}

/** Table services need a party size that fits; other services ignore it. */
async function resolvePartySize(
  client: Tx,
  service: ServiceWithBusiness,
  requested: number | null | undefined,
): Promise<number | null> {
  if (service.partySize === null) return null;
  if (requested == null) {
    throw new BookingError("PARTY_SIZE_REQUIRED", "How many people is the booking for?");
  }
  if (!Number.isInteger(requested) || requested < 1) {
    throw new BookingError("INVALID_INPUT", "Party size must be a whole number of at least 1.");
  }
  if (requested > service.partySize) {
    const tables = await client.service.findMany({
      where: { businessId: service.businessId, isActive: true, partySize: { not: null } },
      select: { name: true, partySize: true },
    });
    const better = pickTableService(tables, requested);
    const hint = better ? ` Book a ${better.name} instead.` : " Please contact the restaurant for large groups.";
    throw new BookingError("PARTY_TOO_LARGE", `A ${service.name} seats up to ${service.partySize}.${hint}`);
  }
  return requested;
}

async function loadChangeableBooking(
  client: Tx,
  input: { businessId: string; bookingId: string; customerId?: string },
  now: Date,
) {
  const booking = await client.booking.findFirst({
    where: {
      id: input.bookingId,
      businessId: input.businessId,
      ...(input.customerId ? { customerId: input.customerId } : {}),
    },
  });
  if (!booking) throw new BookingError("BOOKING_NOT_FOUND", "We couldn't find that booking.");
  if (booking.status !== "confirmed") {
    throw new BookingError("NOT_CHANGEABLE", `That booking is already ${booking.status}.`);
  }
  if (booking.startAt <= now) {
    throw new BookingError("NOT_CHANGEABLE", "That booking has already started, so it can't be changed.");
  }
  return booking;
}

const summaryInclude = {
  service: { select: { name: true, durationMin: true } },
  customer: { select: { name: true } },
  business: { select: { timezone: true } },
} as const;

type BookingWithSummaryInclude = Prisma.BookingGetPayload<{ include: typeof summaryInclude }>;

function toSummary(row: BookingWithSummaryInclude): BookingSummary {
  const tz = row.business.timezone;
  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    customerId: row.customerId,
    customerName: row.customer.name,
    date: formatInZone(row.startAt, tz, "yyyy-MM-dd"),
    time: formatInZone(row.startAt, tz, "HH:mm"),
    endTime: formatInZone(row.endAt, tz, "HH:mm"),
    durationMin: row.service.durationMin,
    partySize: row.partySize,
    status: bookingStatusSchema.parse(row.status),
    source: bookingSourceSchema.parse(row.source),
    notes: row.notes,
  };
}

function weekdayName(date: string, timeZone: string): string {
  return formatInZone(zonedDateTime(date, "12:00", timeZone), timeZone, "EEEE");
}

function parse<T>(schema: z.ZodType<T>, value: unknown, field: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BookingError("INVALID_INPUT", `Invalid ${field}: ${result.error.issues[0]?.message ?? "bad value"}.`);
  }
  return result.data;
}
