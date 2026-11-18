import { beforeEach, describe, expect, it } from "vitest";

import {
  cancelBooking,
  createBooking,
  findCustomerBookings,
  findNextAvailableSlots,
  getAvailability,
  rescheduleBooking,
} from "@/lib/booking/bookings";
import { BookingError, type BookingErrorCode } from "@/lib/booking/errors";
import { db } from "@/lib/db";
import { zonedDateTime } from "@/lib/time";

const TZ = "Asia/Karachi";
const WED = "2026-11-18";
const THU = "2026-11-19";
const MON = "2026-11-23"; // closed
const NOW = zonedDateTime(WED, "10:00", TZ); // an hour before opening

let businessId: string;
let haircut: string;
let table4: string;
let otherBusinessService: string;
let alice: string;
let bob: string;

beforeEach(async () => {
  await db.$transaction([
    db.message.deleteMany(),
    db.conversation.deleteMany(),
    db.booking.deleteMany(),
    db.agentPersona.deleteMany(),
    db.workingHours.deleteMany(),
    db.service.deleteMany(),
    db.business.deleteMany(),
    db.customer.deleteMany(),
  ]);

  const business = await db.business.create({
    data: {
      slug: "test-place",
      name: "Test Place",
      emoji: "🧪",
      category: "salon",
      tagline: "",
      address: "",
      phone: "+920000000001",
      timezone: TZ,
      slotIntervalMin: 30,
      // Open 11:00–21:00 every day except Monday.
      workingHours: { create: [0, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "21:00" })) },
      services: {
        create: [
          { name: "Haircut", description: "", price: 1500, durationMin: 45, capacity: 2, sortOrder: 0 },
          { name: "Table for 4", description: "", price: 0, durationMin: 90, capacity: 1, partySize: 4, sortOrder: 1 },
          { name: "Table for 6", description: "", price: 0, durationMin: 120, capacity: 1, partySize: 6, sortOrder: 2 },
        ],
      },
    },
    include: { services: true },
  });
  businessId = business.id;
  haircut = business.services.find((s) => s.name === "Haircut")!.id;
  table4 = business.services.find((s) => s.name === "Table for 4")!.id;

  const other = await db.business.create({
    data: {
      slug: "other-place",
      name: "Other Place",
      emoji: "🏪",
      category: "salon",
      tagline: "",
      address: "",
      phone: "+920000000002",
      services: { create: [{ name: "Other Haircut", description: "", price: 1000, durationMin: 30 }] },
    },
    include: { services: true },
  });
  otherBusinessService = other.services[0]!.id;

  alice = (await db.customer.create({ data: { phone: "+920000000101", name: "Alice" } })).id;
  bob = (await db.customer.create({ data: { phone: "+920000000102", name: "Bob" } })).id;
});

async function bookingError(promise: Promise<unknown>): Promise<BookingError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BookingError) return error;
    throw error;
  }
  throw new Error("Expected a BookingError, but the call succeeded");
}

async function expectCode(promise: Promise<unknown>, code: BookingErrorCode) {
  const error = await bookingError(promise);
  expect(error.code).toBe(code);
  return error;
}

const book = (overrides: Partial<Parameters<typeof createBooking>[0]> = {}) =>
  createBooking({
    businessId,
    serviceId: haircut,
    customerId: alice,
    date: WED,
    time: "14:00",
    source: "agent",
    now: NOW,
    ...overrides,
  });

describe("getAvailability", () => {
  it("lists open start times with remaining capacity", async () => {
    const day = await getAvailability({ businessId, serviceId: haircut, date: WED, now: NOW });
    expect(day.weekday).toBe("Wednesday");
    expect(day.hours).toEqual({ opensAt: "11:00", closesAt: "21:00" });
    expect(day.slots[0]).toEqual({ time: "11:00", remaining: 2 });
    expect(day.slots.at(-1)).toEqual({ time: "20:00", remaining: 2 });
  });

  it("reports closed days", async () => {
    const day = await getAvailability({ businessId, serviceId: haircut, date: MON, now: NOW });
    expect(day).toEqual({ date: MON, weekday: "Monday", hours: null, slots: [] });
  });

  it("does not offer another business's service", async () => {
    await expectCode(getAvailability({ businessId, serviceId: otherBusinessService, date: WED, now: NOW }), "SERVICE_NOT_FOUND");
  });
});

describe("findNextAvailableSlots", () => {
  it("starts from the next bookable time", async () => {
    const slots = await findNextAvailableSlots({ businessId, serviceId: haircut, now: NOW, limit: 2 });
    expect(slots).toEqual([
      { date: WED, weekday: "Wednesday", time: "11:00" },
      { date: WED, weekday: "Wednesday", time: "11:30" },
    ]);
  });

  it("rolls over to the next open day late in the evening", async () => {
    const late = zonedDateTime(WED, "20:45", TZ);
    const [first] = await findNextAvailableSlots({ businessId, serviceId: haircut, now: late, limit: 1 });
    expect(first).toEqual({ date: THU, weekday: "Thursday", time: "11:00" });
  });
});

describe("createBooking", () => {
  it("books a slot and returns local times", async () => {
    const booking = await book();
    expect(booking).toMatchObject({
      serviceName: "Haircut",
      customerName: "Alice",
      date: WED,
      time: "14:00",
      endTime: "14:45",
      durationMin: 45,
      partySize: null,
      status: "confirmed",
      source: "agent",
    });
    const row = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row.startAt.toISOString()).toBe("2026-11-18T09:00:00.000Z");
  });

  it("fills capacity, then refuses with the nearest open times", async () => {
    await book();
    await book({ customerId: bob });
    const error = await expectCode(book(), "FULL");
    expect(error.message).toBe("Haircut at 2:00 PM on Wednesday is fully booked.");
    // 13:30 and 14:30 overlap both 14:00 bookings; 12:30 beats 15:30 on the tie.
    expect(error.alternatives).toEqual(["12:30", "13:00", "15:00"]);

    const day = await getAvailability({ businessId, serviceId: haircut, date: WED, now: NOW });
    expect(day.slots.map((s) => s.time)).not.toContain("14:00");
  });

  it("never double-books the last table when requests arrive together", async () => {
    const attempts = await Promise.allSettled(
      [alice, bob, alice].map((customerId) =>
        book({ serviceId: table4, customerId, time: "19:00", partySize: 4 }),
      ),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    for (const attempt of attempts.filter((a) => a.status === "rejected")) {
      expect((attempt as PromiseRejectedResult).reason).toMatchObject({ code: "FULL" });
    }
    expect(await db.booking.count({ where: { serviceId: table4 } })).toBe(1);
  });

  it("explains each kind of unavailable time", async () => {
    await expectCode(book({ date: MON }), "CLOSED");
    await expectCode(book({ time: "10:30" }), "OUTSIDE_HOURS");
    await expectCode(book({ time: "20:30" }), "OUTSIDE_HOURS"); // would end 21:15
    await expectCode(book({ time: "14:15" }), "NOT_ON_GRID");
    await expectCode(book({ date: "2026-11-17" }), "IN_PAST");
    await expectCode(book({ time: "11:00", now: zonedDateTime(WED, "10:45", TZ) }), "TOO_SOON");
    await expectCode(book({ date: "2027-01-18" }), "TOO_FAR");
  });

  it("rejects bad input and unknown references", async () => {
    await expectCode(book({ date: "2026-02-30" }), "INVALID_INPUT");
    await expectCode(book({ time: "2pm" }), "INVALID_INPUT");
    await expectCode(book({ serviceId: otherBusinessService }), "SERVICE_NOT_FOUND");
    await expectCode(book({ customerId: "nobody" }), "CUSTOMER_NOT_FOUND");
  });

  it("requires a party size that fits the table", async () => {
    await expectCode(book({ serviceId: table4, time: "19:00" }), "PARTY_SIZE_REQUIRED");
    const tooBig = await expectCode(book({ serviceId: table4, time: "19:00", partySize: 5 }), "PARTY_TOO_LARGE");
    expect(tooBig.message).toBe("A Table for 4 seats up to 4. Book a Table for 6 instead.");

    const ok = await book({ serviceId: table4, time: "19:00", partySize: 3 });
    expect(ok.partySize).toBe(3);
  });

  it("ignores party size for non-table services", async () => {
    expect((await book({ partySize: 3 })).partySize).toBeNull();
  });
});

describe("rescheduleBooking", () => {
  it("moves a booking, even onto part of its own current slot", async () => {
    const original = await book({ serviceId: table4, time: "19:00", partySize: 4 });
    const moved = await rescheduleBooking({ businessId, bookingId: original.id, customerId: alice, date: WED, time: "19:30", now: NOW });
    expect(moved).toMatchObject({ id: original.id, time: "19:30", endTime: "21:00", status: "confirmed" });

    // The old 19:00 slot is free again, but 19:00–20:30 now overlaps the moved booking.
    await expectCode(book({ serviceId: table4, customerId: bob, time: "19:00", partySize: 2 }), "FULL");
    await book({ serviceId: table4, customerId: bob, time: "17:30", partySize: 2 });
  });

  it("refuses a full slot and leaves the booking where it was", async () => {
    const mine = await book({ time: "12:00" });
    await book({ time: "15:00" });
    await book({ time: "15:00", customerId: bob });
    await expectCode(rescheduleBooking({ businessId, bookingId: mine.id, date: WED, time: "15:00", now: NOW }), "FULL");
    const [still] = await findCustomerBookings({ businessId, customerId: alice, now: NOW });
    expect(still?.time).toBe("12:00");
  });

  it("hides other customers' bookings", async () => {
    const mine = await book();
    await expectCode(
      rescheduleBooking({ businessId, bookingId: mine.id, customerId: bob, date: THU, time: "12:00", now: NOW }),
      "BOOKING_NOT_FOUND",
    );
  });
});

describe("cancelBooking", () => {
  it("cancels once and frees the slot", async () => {
    const booking = await book({ serviceId: table4, time: "19:00", partySize: 2 });
    const cancelled = await cancelBooking({ businessId, bookingId: booking.id, customerId: alice, now: NOW });
    expect(cancelled.status).toBe("cancelled");

    const day = await getAvailability({ businessId, serviceId: table4, date: WED, now: NOW });
    expect(day.slots.map((s) => s.time)).toContain("19:00");

    await expectCode(cancelBooking({ businessId, bookingId: booking.id, now: NOW }), "NOT_CHANGEABLE");
  });

  it("won't change a booking that has already started", async () => {
    const booking = await book({ time: "14:00" });
    const later = zonedDateTime(WED, "14:10", TZ);
    await expectCode(cancelBooking({ businessId, bookingId: booking.id, now: later }), "NOT_CHANGEABLE");
  });

  it("doesn't reach bookings in another business", async () => {
    const booking = await book();
    const other = await db.business.findUniqueOrThrow({ where: { slug: "other-place" } });
    await expectCode(cancelBooking({ businessId: other.id, bookingId: booking.id, now: NOW }), "BOOKING_NOT_FOUND");
  });
});

describe("findCustomerBookings", () => {
  it("returns upcoming confirmed bookings, soonest first", async () => {
    await book({ date: THU, time: "12:00" });
    await book({ date: WED, time: "16:00" });
    const cancelled = await book({ date: WED, time: "18:00" });
    await cancelBooking({ businessId, bookingId: cancelled.id, now: NOW });
    await book({ customerId: bob });

    const upcoming = await findCustomerBookings({ businessId, customerId: alice, now: NOW });
    expect(upcoming.map((b) => `${b.date} ${b.time}`)).toEqual([`${WED} 16:00`, `${THU} 12:00`]);

    const all = await findCustomerBookings({ businessId, customerId: alice, includePast: true, now: NOW });
    expect(all).toHaveLength(3);
  });
});
