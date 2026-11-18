// Rule-based reading of customer messages for the scripted agent. Pure functions only:
// everything is relative to a `today` date passed in, so it's fully testable.

import { addDays, isValidIsoDate, weekdayOf } from "@/lib/time";

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};
const NUMBER = String.raw`(\d{1,2}|${Object.keys(WORD_NUMBERS).join("|")})`;
const toNumber = (token: string) => WORD_NUMBERS[token] ?? Number(token);

const normalize = (text: string) => text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Dates

const WEEKDAY_PATTERNS: [RegExp, number][] = [
  [/^sun(day)?$/, 0],
  [/^mon(day)?$/, 1],
  [/^tue(s|sday)?$/, 2],
  [/^wed(nesday)?$/, 3],
  [/^thu(r|rs|rsday)?$/, 4],
  [/^fri(day)?$/, 5],
  [/^sat(urday)?$/, 6],
];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = String.raw`(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*`;

/** A calendar date mentioned in `text`, as "YYYY-MM-DD", or null. Dates without a year are the next such date. */
export function parseDate(text: string, today: string): string | null {
  const t = normalize(text);

  if (/\bday after tomorrow\b/.test(t)) return addDays(today, 2);
  if (/\b(tomorrow|tmrw|tmr|tomorow|tommorow|tommorrow)\b/.test(t)) return addDays(today, 1);
  if (/\b(today|tonight|this (morning|afternoon|evening))\b/.test(t)) return today;

  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(t);
  if (iso && isValidIsoDate(iso[0])) return iso[0];

  const dayMonth = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MONTH}\b`).exec(t);
  if (dayMonth) return nextDate(today, monthIndex(dayMonth[2]!), Number(dayMonth[1]));
  const monthDay = new RegExp(String.raw`\b${MONTH} (\d{1,2})(?:st|nd|rd|th)?\b`).exec(t);
  if (monthDay) return nextDate(today, monthIndex(monthDay[1]!), Number(monthDay[2]));

  // Pakistani style: day/month[/year].
  const numeric = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?\b/.exec(t);
  if (numeric) {
    const [, d, m, y] = numeric;
    if (y) {
      const year = y.length === 2 ? 2000 + Number(y) : Number(y);
      const date = isoOf(year, Number(m), Number(d));
      return isValidIsoDate(date) ? date : null;
    }
    return nextDate(today, Number(m) - 1, Number(d));
  }

  for (const match of t.matchAll(/\b(next |this )?([a-z]+)\b/g)) {
    const weekday = WEEKDAY_PATTERNS.find(([pattern]) => pattern.test(match[2]!))?.[1];
    if (weekday === undefined) continue;
    let ahead = (weekday - weekdayOf(today) + 7) % 7;
    if (match[1] === "next " && ahead === 0) ahead = 7;
    return addDays(today, ahead);
  }

  const ordinal = /\b(?:on )?the (\d{1,2})(?:st|nd|rd|th)\b/.exec(t);
  if (ordinal) {
    const [year, month] = today.split("-").map(Number) as [number, number];
    const thisMonth = isoOf(year, month, Number(ordinal[1]));
    if (isValidIsoDate(thisMonth) && thisMonth >= today) return thisMonth;
    const next = month === 12 ? isoOf(year + 1, 1, Number(ordinal[1])) : isoOf(year, month + 1, Number(ordinal[1]));
    return isValidIsoDate(next) ? next : null;
  }

  return null;
}

function monthIndex(token: string): number {
  return MONTHS.indexOf(token.slice(0, 3));
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The next occurrence (today or later) of a month (0-based) and day. */
function nextDate(today: string, month: number, day: number): string | null {
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const date = isoOf(y, month + 1, day);
    if (isValidIsoDate(date) && date >= today) return date;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Times

/** A clock time from the message. `explicit` is false when AM/PM is unclear ("at 5", "5:30"). */
export type ParsedTime = { hour: number; minute: number; explicit: boolean };

export function parseTime(text: string, options: { allowBareNumber?: boolean } = {}): ParsedTime | null {
  const t = normalize(text);

  if (/\b(noon|midday)\b/.test(t)) return { hour: 12, minute: 0, explicit: true };

  const meridiem = /\b(\d{1,2})(?:[:.](\d{2}))? ?(a\.?m\.?|p\.?m\.?)(?=\W|$)/.exec(t);
  if (meridiem) {
    const hour12 = Number(meridiem[1]);
    const minute = Number(meridiem[2] ?? 0);
    if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
    const pm = meridiem[3]!.startsWith("p");
    return { hour: (hour12 % 12) + (pm ? 12 : 0), minute, explicit: true };
  }

  const clock = /\b(\d{1,2})[:.]([0-5]\d)\b/.exec(t);
  if (clock) {
    const hour = Number(clock[1]);
    if (hour > 23) return null;
    // "17:00" or "08:30" are unambiguous; "5:30" could be morning or evening.
    return { hour, minute: Number(clock[2]), explicit: hour >= 13 || clock[1]!.startsWith("0") };
  }

  const loose =
    /\b(?:at|around|by|about) (\d{1,2})\b(?![:./\d]| ?(?:people|persons?|guests|pax))/.exec(t) ??
    /\b(\d{1,2}) ?o'?clock\b/.exec(t) ??
    (options.allowBareNumber ? /^(\d{1,2})$/.exec(t) : null);
  if (loose) {
    const hour = Number(loose[1]);
    if (hour > 23) return null;
    return { hour, minute: 0, explicit: hour >= 13 || hour === 0 };
  }

  return null;
}

/**
 * Turns a parsed time into "HH:mm". When AM/PM is unclear, picks the reading that falls
 * within opening hours, preferring the afternoon/evening one if both do.
 */
export function resolveTime(time: ParsedTime, hours: { opensAt: string; closesAt: string } | null): string {
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
  if (time.explicit || time.hour >= 12) return fmt(time.hour);

  const candidates = [time.hour + 12, time.hour];
  if (hours) {
    const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
    const open = toMin(hours.opensAt);
    const close = toMin(hours.closesAt);
    const fits = candidates.find((h) => h * 60 + time.minute >= open && h * 60 + time.minute < close);
    if (fits !== undefined) return fmt(fits);
  }
  return fmt(time.hour < 8 ? time.hour + 12 : time.hour);
}

export type DayPart = "morning" | "afternoon" | "evening";

export function parseDayPart(text: string): DayPart | null {
  const t = normalize(text);
  if (/\bmorning\b/.test(t)) return "morning";
  if (/\bafternoon\b/.test(t)) return "afternoon";
  if (/\b(evening|tonight|night|dinner)\b/.test(t)) return "evening";
  return null;
}

// ---------------------------------------------------------------------------
// Party size, services, names

export function parsePartySize(text: string, options: { allowBareNumber?: boolean } = {}): number | null {
  const t = normalize(text);
  const counted = new RegExp(String.raw`\b${NUMBER} ?(people|persons?|guests|pax|adults|of us)\b`).exec(t);
  if (counted) return toNumber(counted[1]!);
  const framed = new RegExp(
    String.raw`\b(?:table for|party of|group of|we are|we're|for) ${NUMBER}\b(?! ?(?:am|pm|a\.m|p\.m|o'?clock|[:./]\d))`,
  ).exec(t);
  if (framed) return toNumber(framed[1]!);
  if (options.allowBareNumber) {
    const bare = new RegExp(String.raw`^${NUMBER}$`).exec(t);
    if (bare) return toNumber(bare[1]!);
  }
  return null;
}

/** Extra words customers use for the demo services, keyed by lower-case service name. */
const SERVICE_SYNONYMS: Record<string, string[]> = {
  haircut: ["haircut", "hair cut", "cut", "trim", "hair"],
  facial: ["facial", "face", "skin care", "skincare"],
  "bridal makeup": ["bridal", "bride", "wedding", "makeup", "make up", "make-up", "barat", "walima", "mehndi"],
  checkup: ["checkup", "check up", "check-up", "exam", "examination", "dental check"],
  cleaning: ["cleaning", "clean", "scaling", "polishing", "polish"],
  "root canal consultation": ["root canal", "rct", "toothache", "tooth pain", "tooth ache"],
  "free trial": ["free trial", "trial", "try out", "try the gym", "first visit"],
  "personal trainer session": ["personal trainer", "personal training", "trainer", "pt session", "pt", "coach"],
};

/** The service the message refers to (longest matching phrase wins), or null. Tables are matched by party size instead. */
export function matchService(text: string, serviceNames: string[]): string | null {
  const t = normalize(text);
  let best: { name: string; length: number } | null = null;
  for (const name of serviceNames) {
    const phrases = [name.toLowerCase(), ...(SERVICE_SYNONYMS[name.toLowerCase()] ?? [])];
    for (const phrase of phrases) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(String.raw`\b${escaped}\b`).test(t) && (!best || phrase.length > best.length)) {
        best = { name, length: phrase.length };
      }
    }
  }
  return best?.name ?? null;
}

const NOT_NAMES = /^(yes|no|ok|okay|sure|hi|hello|hey|thanks|thank you|please|book|cancel|today|tomorrow)$/;
const FILLER_WORDS = new Set(["please", "thanks", "thank", "you", "sir", "madam", "here"]);

/** A name the customer gives: "my name is …" anywhere, or the whole reply when we just asked for it. */
export function extractName(text: string, options: { awaitingName?: boolean } = {}): string | null {
  const trimmed = text.trim();
  const stated = /\bmy name is ([a-z][a-z' -]{0,40})/i.exec(trimmed);
  let candidate = stated?.[1] ?? null;
  if (!candidate && options.awaitingName) {
    candidate = trimmed.replace(/^(it'?s|i'?m|i am|this is|name is|name:|the name is)\s+/i, "");
  }
  if (!candidate) return null;

  const words = candidate
    .replace(/[.!,]+$/, "")
    .split(/\s+/)
    .filter((w) => /^[a-z][a-z'-]*$/i.test(w) && !FILLER_WORDS.has(w.toLowerCase()))
    .slice(0, 3);
  const name = words.join(" ");
  if (!name || NOT_NAMES.test(name.toLowerCase())) return null;
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
}

// ---------------------------------------------------------------------------
// Intents and answers

export type Intent =
  | "handoff"
  | "cancel"
  | "reschedule"
  | "list"
  | "prices"
  | "hours"
  | "location"
  | "book"
  | "greeting"
  | "thanks";

const INTENT_PATTERNS: [Intent, RegExp][] = [
  [
    "handoff",
    /\b(talk|speak|chat) (to|with) (a |an |the )?(human|person|someone|somebody|staff|manager|owner|real)|\b(real person|human|manager|complain|complaint|customer care)\b/,
  ],
  ["cancel", /\bcancel/],
  [
    "reschedule",
    /\b(reschedul\w*|postpone)\b|\b(change|move|shift)\b.{0,25}\b(booking|appointment|reservation)\b/,
  ],
  ["list", /\b(my|existing|upcoming|any) (bookings?|appointments?|reservations?)\b|\bwhat (did|have) i book/],
  ["prices", /\b(price|prices|pricing|cost|costs|rate|rates|charges?|fees?|how much|menu|services|what do you (offer|do|have))\b/],
  ["hours", /\b(hours|opening|closing|timings?|what time do you|when do you|are you open|open today|open on)\b/],
  ["location", /\b(where|address|location|located|directions|map|reach you)\b/],
  ["book", /\b(book|booking|appointment|reserve|reservation|slot|slots|available|availability|schedule|table)\b/],
  ["greeting", /^(hi|hii+|hello|hey|salam|assalam|aoa|good (morning|afternoon|evening))\b/],
  ["thanks", /\b(thanks|thank you|thx|shukriya|jazakallah)\b/],
];

export function detectIntents(text: string): Set<Intent> {
  const t = normalize(text);
  return new Set(INTENT_PATTERNS.filter(([, pattern]) => pattern.test(t)).map(([intent]) => intent));
}

// `\b` doesn't work next to emoji, so answers end at whitespace, punctuation or the end.
const END = String.raw`(?=$|[\s!.,?])`;
const YES = new RegExp(
  String.raw`^(yes|yeah|yea|yep|yup|ya|sure|ok|okay|k|confirm|confirmed|correct|right|perfect|great|go ahead|please do|please|book it|do it|done|haan|han|ji|jee|👍|✅)${END}`,
  "u",
);
const NO = new RegExp(String.raw`^(no|nope|nah|not now|don'?t|do not|wait|hold on|stop|nahi|👎)${END}`, "u");

export function isYes(text: string): boolean {
  return YES.test(normalize(text));
}

export function isNo(text: string): boolean {
  return NO.test(normalize(text));
}

/** "1", "2nd", "the second one" → 1-based index, or null. */
export function parseChoice(text: string): number | null {
  const t = normalize(text);
  const digit = /^(?:#|no\.? ?|number )?(\d)\b/.exec(t) ?? /\b(\d)(?:st|nd|rd|th)\b/.exec(t);
  if (digit) return Number(digit[1]);
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  const word = ordinals.findIndex((o) => new RegExp(String.raw`\b${o}\b`).test(t));
  return word === -1 ? null : word + 1;
}
