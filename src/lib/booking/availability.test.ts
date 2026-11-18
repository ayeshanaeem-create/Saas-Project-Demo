import { describe, expect, it } from "vitest";

import {
  checkSlot,
  computeSlots,
  maxConcurrent,
  nearestSlots,
  pickTableService,
  type BookedInterval,
  type SlotQuery,
} from "@/lib/booking/availability";
import { zonedDateTime } from "@/lib/time";

const TZ = "Asia/Karachi";
const at = (date: string, time: string) => zonedDateTime(date, time, TZ);
const booking = (date: string, from: string, to: string): BookedInterval => ({
  startAt: at(date, from),
  endAt: at(date, to),
});

// Wednesday 18 Nov 2026, 9 AM in Karachi; the salon opens at 11.
const WED = "2026-11-18";
const base: SlotQuery = {
  date: WED,
  timeZone: TZ,
  hours: { opensAt: "11:00", closesAt: "21:00" },
  slotIntervalMin: 30,
  durationMin: 45,
  capacity: 2,
  bookings: [],
  now: at(WED, "09:00"),
};
const times = (q: SlotQuery) => computeSlots(q).map((s) => s.time);

describe("computeSlots", () => {
  it("offers every grid time whose service fits before closing", () => {
    const slots = times(base);
    expect(slots[0]).toBe("11:00");
    expect(slots.at(-1)).toBe("20:00"); // 20:00 + 45 min = 20:45 ≤ 21:00
    expect(slots).not.toContain("20:30"); // would end 21:15
    expect(slots).toHaveLength(19);
  });

  it("returns nothing on a closed day", () => {
    expect(computeSlots({ ...base, hours: null })).toEqual([]);
  });

  it("skips past slots and enforces the notice period", () => {
    const slots = times({ ...base, now: at(WED, "14:10") });
    expect(slots[0]).toBe("15:00"); // 14:30 is under 30 minutes away
  });

  it("returns nothing for a date in the past", () => {
    expect(computeSlots({ ...base, date: "2026-11-17" })).toEqual([]);
  });

  it("subtracts overlapping bookings from capacity", () => {
    const slots = computeSlots({ ...base, bookings: [booking(WED, "15:00", "15:45")] });
    expect(slots.find((s) => s.time === "15:00")?.remaining).toBe(1);
    expect(slots.find((s) => s.time === "16:00")?.remaining).toBe(2);
  });

  it("drops slots that would overlap a full period", () => {
    const full = [booking(WED, "15:00", "15:45"), booking(WED, "15:00", "15:45")];
    const slots = times({ ...base, bookings: full });
    expect(slots).not.toContain("14:30"); // 14:30–15:15 overlaps both
    expect(slots).not.toContain("15:00");
    expect(slots).not.toContain("15:30"); // 15:30–16:15 overlaps both until 15:45
    expect(slots).toContain("14:00"); // ends 14:45, before they start
    expect(slots).toContain("16:00");
  });

  it("ignores bookings on other days", () => {
    const yesterday = [booking("2026-11-17", "15:00", "15:45"), booking("2026-11-17", "15:00", "15:45")];
    expect(times({ ...base, bookings: yesterday })).toContain("15:00");
  });

  it("respects a service with capacity 1", () => {
    const slots = times({ ...base, capacity: 1, bookings: [booking(WED, "12:00", "12:45")] });
    expect(slots).not.toContain("11:30");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:30");
    expect(slots).toContain("11:00"); // ends 11:45, before 12:00
    expect(slots).toContain("13:00");
  });
});

describe("checkSlot", () => {
  const reason = (q: SlotQuery, time: string) => {
    const result = checkSlot(q, time);
    return result.ok ? "ok" : result.reason;
  };

  it("explains why a time can't be booked", () => {
    expect(reason({ ...base, hours: null }, "12:00")).toBe("CLOSED");
    expect(reason(base, "10:30")).toBe("OUTSIDE_HOURS");
    expect(reason(base, "20:30")).toBe("OUTSIDE_HOURS");
    expect(reason(base, "11:15")).toBe("NOT_ON_GRID");
    expect(reason({ ...base, now: at(WED, "14:10") }, "14:00")).toBe("IN_PAST");
    expect(reason({ ...base, now: at(WED, "14:10") }, "14:30")).toBe("TOO_SOON");
    expect(reason({ ...base, date: "2027-01-18" }, "12:00")).toBe("TOO_FAR"); // 61 days ahead
    expect(reason({ ...base, date: "2027-01-17" }, "12:00")).toBe("ok"); // 60 days ahead
    expect(reason({ ...base, capacity: 1, bookings: [booking(WED, "12:00", "12:45")] }, "12:00")).toBe("FULL");
  });

  it("reports date problems before a closed day", () => {
    expect(reason({ ...base, hours: null, date: "2027-01-18" }, "12:00")).toBe("TOO_FAR");
    expect(reason({ ...base, hours: null, date: "2026-11-16" }, "12:00")).toBe("IN_PAST");
  });

  it("returns the slot with UTC instants and remaining capacity", () => {
    const result = checkSlot(base, "14:00");
    expect(result).toEqual({
      ok: true,
      slot: { time: "14:00", startAt: at(WED, "14:00"), endAt: at(WED, "14:45"), remaining: 2 },
    });
    expect(result.ok && result.slot.startAt.toISOString()).toBe("2026-11-18T09:00:00.000Z");
  });
});

describe("maxConcurrent", () => {
  const window = [at(WED, "15:30"), at(WED, "16:15")] as const;

  it("counts bookings that are active at the same time", () => {
    const overlapping = [booking(WED, "15:00", "16:00"), booking(WED, "15:45", "16:30")];
    expect(maxConcurrent(overlapping, ...window)).toBe(2);
  });

  it("does not add up bookings that touch the window but never overlap each other", () => {
    const sequential = [booking(WED, "15:00", "15:45"), booking(WED, "15:45", "16:30")];
    expect(maxConcurrent(sequential, ...window)).toBe(1);
  });

  it("treats back-to-back bookings as not overlapping", () => {
    expect(maxConcurrent([booking(WED, "14:45", "15:30")], ...window)).toBe(0);
  });
});

describe("nearestSlots", () => {
  it("picks the closest open times and returns them in order", () => {
    const slots = computeSlots({ ...base, capacity: 1, bookings: [booking(WED, "15:00", "15:45")] });
    // 14:00 and 16:00 are 60 min away; 13:30 and 16:30 tie at 90 min, so the earlier one wins.
    expect(nearestSlots(slots, "15:00").map((s) => s.time)).toEqual(["13:30", "14:00", "16:00"]);
  });

  it("prefers the earlier slot on a tie", () => {
    const slots = computeSlots(base);
    expect(nearestSlots(slots, "15:15", 2).map((s) => s.time)).toEqual(["15:00", "15:30"]);
  });
});

describe("pickTableService", () => {
  const tables = [
    { name: "Table for 2", partySize: 2 },
    { name: "Table for 4", partySize: 4 },
    { name: "Table for 6", partySize: 6 },
    { name: "Table for 8", partySize: 8 },
    { name: "Gift card", partySize: null },
  ];

  it("chooses the smallest table that fits", () => {
    expect(pickTableService(tables, 1)?.name).toBe("Table for 2");
    expect(pickTableService(tables, 3)?.name).toBe("Table for 4");
    expect(pickTableService(tables, 8)?.name).toBe("Table for 8");
  });

  it("returns null when the party is too big", () => {
    expect(pickTableService(tables, 9)).toBeNull();
  });
});
