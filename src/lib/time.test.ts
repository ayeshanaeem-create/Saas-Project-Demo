import { describe, expect, it } from "vitest";

import {
  addDays,
  clockToMinutes,
  formatClockTime,
  formatInZone,
  todayInZone,
  weekdayOf,
  zonedDateTime,
} from "@/lib/time";

const KARACHI = "Asia/Karachi"; // UTC+5, no DST

describe("todayInZone", () => {
  it("uses the business timezone, not UTC", () => {
    // 20:30 UTC on 18 Nov is already 01:30 on 19 Nov in Karachi.
    expect(todayInZone(KARACHI, new Date("2026-11-18T20:30:00Z"))).toBe("2026-11-19");
    expect(todayInZone("UTC", new Date("2026-11-18T20:30:00Z"))).toBe("2026-11-18");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday and 3 for Wednesday", () => {
    expect(weekdayOf("2026-11-22")).toBe(0);
    expect(weekdayOf("2026-11-18")).toBe(3);
  });
});

describe("zonedDateTime", () => {
  it("converts local Karachi time to the UTC instant", () => {
    expect(zonedDateTime("2026-11-18", "14:00", KARACHI).toISOString()).toBe("2026-11-18T09:00:00.000Z");
  });

  it("handles early-morning times that fall on the previous UTC day", () => {
    expect(zonedDateTime("2026-11-18", "03:30", KARACHI).toISOString()).toBe("2026-11-17T22:30:00.000Z");
  });

  it("round-trips through formatInZone", () => {
    const instant = zonedDateTime("2026-11-18", "21:15", KARACHI);
    expect(formatInZone(instant, KARACHI, "yyyy-MM-dd HH:mm")).toBe("2026-11-18 21:15");
  });

  it("rejects malformed input", () => {
    expect(() => zonedDateTime("18-11-2026", "14:00", KARACHI)).toThrow();
    expect(() => zonedDateTime("2026-11-18", "25:00", KARACHI)).toThrow();
  });
});

describe("clock helpers", () => {
  it("converts HH:mm to minutes", () => {
    expect(clockToMinutes("00:00")).toBe(0);
    expect(clockToMinutes("23:30")).toBe(1410);
  });

  it("formats 12-hour times", () => {
    expect(formatClockTime("00:15")).toBe("12:15 AM");
    expect(formatClockTime("12:00")).toBe("12:00 PM");
    expect(formatClockTime("21:30")).toBe("9:30 PM");
  });
});
