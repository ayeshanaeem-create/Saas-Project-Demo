import { describe, expect, it } from "vitest";

import {
  addDays,
  clockToMinutes,
  daysBetween,
  formatCallDuration,
  formatChatDay,
  formatChatListTime,
  formatClockTime,
  formatInZone,
  formatMessageTime,
  isValidIsoDate,
  minutesToClock,
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

describe("minutesToClock / isValidIsoDate", () => {
  it("formats minutes as HH:mm", () => {
    expect(minutesToClock(0)).toBe("00:00");
    expect(minutesToClock(14 * 60 + 5)).toBe("14:05");
    expect(() => minutesToClock(1440)).toThrow();
  });

  it("accepts real dates only", () => {
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-1-1")).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts calendar days in either direction", () => {
    expect(daysBetween("2026-11-18", "2026-11-18")).toBe(0);
    expect(daysBetween("2026-11-17", "2026-11-18")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2);
    expect(daysBetween("2026-11-18", "2026-11-11")).toBe(-7);
  });
});

describe("chat time labels", () => {
  // Wednesday 18 Nov 2026, 3 PM in Karachi.
  const now = zonedDateTime("2026-11-18", "15:00", KARACHI);
  const at = (date: string, time: string) => zonedDateTime(date, time, KARACHI);

  it("formats bubble times in the given timezone", () => {
    expect(formatMessageTime(at("2026-11-18", "14:05"), KARACHI)).toBe("2:05 PM");
  });

  it("labels chat days relative to now", () => {
    expect(formatChatDay(at("2026-11-18", "00:30"), KARACHI, now)).toBe("Today");
    expect(formatChatDay(at("2026-11-17", "23:59"), KARACHI, now)).toBe("Yesterday");
    expect(formatChatDay(at("2026-11-16", "10:00"), KARACHI, now)).toBe("Monday");
    expect(formatChatDay(at("2026-11-10", "10:00"), KARACHI, now)).toBe("10 November 2026");
  });

  it("formats the chat-list time column", () => {
    expect(formatChatListTime(at("2026-11-18", "09:15"), KARACHI, now)).toBe("9:15 AM");
    expect(formatChatListTime(at("2026-11-17", "09:15"), KARACHI, now)).toBe("Yesterday");
    expect(formatChatListTime(at("2026-11-14", "09:15"), KARACHI, now)).toBe("Saturday");
    expect(formatChatListTime(at("2026-11-01", "09:15"), KARACHI, now)).toBe("01/11/2026");
  });
});

describe("formatCallDuration", () => {
  it("formats like a call timer", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(7)).toBe("0:07");
    expect(formatCallDuration(83)).toBe("1:23");
    expect(formatCallDuration(3725)).toBe("1:02:05");
  });
});
