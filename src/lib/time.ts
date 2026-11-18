import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

// All timezone math lives here. The DB stores UTC instants; businesses think in
// local calendar dates ("YYYY-MM-DD") and clock times ("HH:mm") in their own timezone.

/** Today's calendar date in `timeZone`, as "YYYY-MM-DD". */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return format(new TZDate(now, timeZone), "yyyy-MM-dd");
}

/** Shift a "YYYY-MM-DD" date by whole days. Pure calendar math, no timezone involved. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = parseIsoDate(isoDate);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Weekday of a "YYYY-MM-DD" date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = parseIsoDate(isoDate);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The UTC instant for a local date + "HH:mm" in `timeZone`. */
export function zonedDateTime(isoDate: string, clockTime: string, timeZone: string): Date {
  const [y, m, d] = parseIsoDate(isoDate);
  const [hh, mm] = parseClockTime(clockTime);
  return new Date(new TZDate(y, m - 1, d, hh, mm, timeZone).getTime());
}

/** Format a UTC instant in `timeZone` with a date-fns pattern. */
export function formatInZone(instant: Date, timeZone: string, pattern: string): string {
  return format(new TZDate(instant, timeZone), pattern);
}

/** "HH:mm" → minutes after midnight. */
export function clockToMinutes(clockTime: string): number {
  const [hh, mm] = parseClockTime(clockTime);
  return hh * 60 + mm;
}

/** "13:30" → "1:30 PM". */
export function formatClockTime(clockTime: string): string {
  const [hh, mm] = parseClockTime(clockTime);
  const suffix = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function parseIsoDate(isoDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid date "${isoDate}", expected YYYY-MM-DD`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseClockTime(clockTime: string): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clockTime);
  if (!match) throw new Error(`Invalid time "${clockTime}", expected HH:mm`);
  return [Number(match[1]), Number(match[2])];
}
