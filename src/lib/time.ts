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

/** Whole calendar days from one "YYYY-MM-DD" date to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = parseIsoDate(from);
  const [ty, tm, td] = parseIsoDate(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** "2:05 PM": the time shown inside a chat bubble. */
export function formatMessageTime(instant: Date, timeZone: string): string {
  return formatInZone(instant, timeZone, "h:mm a");
}

/** Date separator in a chat: "Today", "Yesterday", "Monday" (this week) or "12 November 2026". */
export function formatChatDay(instant: Date, timeZone: string, now: Date): string {
  const days = daysBetween(todayInZone(timeZone, instant), todayInZone(timeZone, now));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return formatInZone(instant, timeZone, "EEEE");
  return formatInZone(instant, timeZone, "d MMMM yyyy");
}

/** Time column in the chat list: "2:05 PM", "Yesterday", "Monday" or "12/11/2026". */
export function formatChatListTime(instant: Date, timeZone: string, now: Date): string {
  const days = daysBetween(todayInZone(timeZone, instant), todayInZone(timeZone, now));
  if (days === 0) return formatMessageTime(instant, timeZone);
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return formatInZone(instant, timeZone, "EEEE");
  return formatInZone(instant, timeZone, "dd/MM/yyyy");
}

/** Call length as a timer: 7 → "0:07", 83 → "1:23", 3725 → "1:02:05". */
export function formatCallDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** "HH:mm" → minutes after midnight. */
export function clockToMinutes(clockTime: string): number {
  const [hh, mm] = parseClockTime(clockTime);
  return hh * 60 + mm;
}

/** Minutes after midnight → "HH:mm". */
export function minutesToClock(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new Error(`Invalid minutes ${minutes}, expected 0–1439`);
  }
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** True for a real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isValidIsoDate(isoDate: string): boolean {
  try {
    parseIsoDate(isoDate);
    return true;
  } catch {
    return false;
  }
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
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const roundTrip = new Date(Date.UTC(y, m - 1, d));
  if (roundTrip.getUTCFullYear() !== y || roundTrip.getUTCMonth() !== m - 1 || roundTrip.getUTCDate() !== d) {
    throw new Error(`Invalid date "${isoDate}": no such calendar day`);
  }
  return [y, m, d];
}

function parseClockTime(clockTime: string): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clockTime);
  if (!match) throw new Error(`Invalid time "${clockTime}", expected HH:mm`);
  return [Number(match[1]), Number(match[2])];
}
