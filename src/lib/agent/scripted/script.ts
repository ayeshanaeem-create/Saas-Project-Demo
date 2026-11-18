import "server-only";

import { z } from "zod";

import type { LoadedBusiness } from "@/lib/agent/business";
import { pickTableService } from "@/lib/booking/availability";
import {
  cancelBooking,
  createBooking,
  findCustomerBookings,
  findNextAvailableSlots,
  getAvailability,
  rescheduleBooking,
  type BookingSummary,
  type DayAvailability,
} from "@/lib/booking/bookings";
import { BookingError } from "@/lib/booking/errors";
import { db } from "@/lib/db";
import { formatDuration, formatPhone, formatPrice } from "@/lib/format";
import { addDays, clockToMinutes, formatClockTime, formatInZone, todayInZone, weekdayOf, zonedDateTime } from "@/lib/time";
import type { Channel } from "@/types/domain";

import {
  detectIntents,
  extractName,
  isNo,
  isYes,
  matchService,
  parseChoice,
  parseDate,
  parseDayPart,
  parsePartySize,
  parseTime,
  resolveTime,
  type DayPart,
  type Intent,
  type ParsedTime,
} from "./parse";

// The scripted agent: a rule-based booking assistant that needs no API key. It reads each
// message with ./parse.ts, keeps its place in the conversation in ScriptState (saved on the
// Conversation row) and books through the same booking engine as the Claude agent.

export const scriptStateSchema = z.object({
  flow: z.enum(["idle", "booking", "reschedule", "cancel"]),
  awaiting: z.enum(["service", "party_size", "date", "time", "name", "confirm", "pick_booking", "confirm_cancel", "book_offer"]).nullable(),
  draft: z.object({
    service: z.string().optional(),
    partySize: z.number().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    dayPart: z.enum(["morning", "afternoon", "evening"]).optional(),
    name: z.string().optional(),
  }),
  /** The booking being cancelled or rescheduled. */
  bookingId: z.string().nullable(),
  /** Booking ids offered in a numbered list, in order. */
  candidates: z.array(z.string()),
});

export type ScriptState = z.infer<typeof scriptStateSchema>;

const idle = (): ScriptState => ({ flow: "idle", awaiting: null, draft: {}, bookingId: null, candidates: [] });

export function parseScriptState(json: string | null): ScriptState {
  if (!json) return idle();
  try {
    return scriptStateSchema.parse(JSON.parse(json));
  } catch {
    return idle();
  }
}

export type ScriptTurn = {
  business: LoadedBusiness;
  customer: { id: string; name: string | null };
  state: ScriptState;
  /** The customer's new messages, joined. */
  text: string;
  now: Date;
  /** On a call, replies are spoken: fewer options, no "reply yes". */
  channel: Channel;
};

export type ScriptOutcome = {
  /** One chat bubble each. */
  replies: string[];
  state: ScriptState;
  /** The customer should be passed to a person. */
  handoff: boolean;
};

export function runScript(turn: ScriptTurn): Promise<ScriptOutcome> {
  return new ScriptRun(turn).run();
}

type Details = {
  service: string | null;
  partySize: number | null;
  date: string | null;
  time: ParsedTime | null;
  dayPart: DayPart | null;
  name: string | null;
};

const SLOT_QUESTIONS = new Set(["service", "party_size", "date", "time", "name"]);

class ScriptRun {
  private readonly replies: string[] = [];
  private state: ScriptState;
  private handoff = false;
  private readonly business: LoadedBusiness;
  private readonly voice: boolean;
  private readonly tz: string;
  private readonly today: string;
  private customerName: string | null;

  constructor(private readonly turn: ScriptTurn) {
    this.state = structuredClone(turn.state);
    this.business = turn.business;
    this.tz = turn.business.timezone;
    this.today = todayInZone(this.tz, turn.now);
    this.customerName = turn.customer.name;
    this.voice = turn.channel === "voice";
  }

  async run(): Promise<ScriptOutcome> {
    const text = this.turn.text.trim();
    const intents = detectIntents(text);
    const s = this.state;

    if (intents.has("handoff")) return this.passToPerson();

    if ((s.awaiting === "confirm" || s.awaiting === "confirm_cancel") && isYes(text)) {
      await this.carryOutPending();
      return this.finish();
    }

    const details = this.readDetails(text);

    if (s.awaiting === "confirm_cancel" && (isNo(text) || !this.hasAny(details))) {
      this.say("No problem, your booking stays as it is. Anything else I can help with?");
      this.reset();
      return this.finish();
    }

    if (s.awaiting === "confirm" && (isNo(text) || intents.has("cancel") || this.hasAny(details))) {
      if (this.apply(details)) {
        s.awaiting = null;
        await this.advance();
      } else if (intents.has("cancel")) {
        this.say(`No problem, I won't ${s.flow === "reschedule" ? "move" : "book"} that. Anything else I can help with?`);
        this.reset();
      } else {
        s.awaiting = null;
        this.say("No problem. What would you like to change: the day, the time or the service?");
      }
      return this.finish();
    }

    if (s.awaiting === "pick_booking") {
      const booking = await this.pickBooking(text, details);
      if (booking) {
        await this.continueWith(booking, details);
        return this.finish();
      }
      if (!intents.size) {
        await this.offerBookings(s.flow === "reschedule" ? "reschedule" : "cancel", "Sorry, which one? Reply with its number.");
        return this.finish();
      }
    }

    // Explicit requests about existing bookings.
    if (intents.has("cancel")) {
      const draftInProgress = s.flow === "booking" && Object.keys(s.draft).length > 0;
      if (draftInProgress && !/\b(booking|appointment|reservation)\b/i.test(text)) {
        this.say("No problem, I won't book that. Anything else I can help with?");
        this.reset();
      } else {
        await this.offerBookings("cancel");
      }
      return this.finish();
    }
    if (intents.has("reschedule")) {
      this.state = { ...idle(), flow: "reschedule" };
      await this.offerBookings("reschedule", undefined, details);
      return this.finish();
    }
    if (intents.has("list")) {
      await this.listBookings();
      return this.finish();
    }

    // "How much is a facial?": the price of that service, then an offer (not a push) to book it.
    const priceOf = details.service ? this.service(details.service) : undefined;
    if (intents.has("prices") && priceOf && !intents.has("book") && !details.date && !details.time && s.flow !== "reschedule") {
      const price = priceOf.price > 0 ? formatPrice(priceOf.price, this.business.currency) : "free";
      this.say(`*${priceOf.name}* is ${price} and takes ${formatDuration(priceOf.durationMin)}. Would you like to book one?`);
      this.state = { ...idle(), awaiting: "book_offer", draft: { service: priceOf.name } };
      return this.finish();
    }

    // Answering "Would you like to book one?": yes starts that booking; no drops it.
    if (s.awaiting === "book_offer" && !this.hasAny(details)) {
      if (isYes(text)) {
        this.state = { ...idle(), flow: "booking", draft: { ...s.draft } };
        await this.advance();
        return this.finish();
      }
      if (isNo(text)) {
        this.say("No problem! Anything else I can help with?");
        this.reset();
        return this.finish();
      }
    }

    // Questions: answer, then pick up where we were.
    const wantsBooking =
      intents.has("book") || details.service !== null || details.time !== null || details.partySize !== null;
    const answered = !wantsBooking && this.answerQuestions(intents, details);
    if (answered) {
      if (s.flow !== "idle" && s.awaiting && SLOT_QUESTIONS.has(s.awaiting)) await this.advance();
      return this.finish();
    }

    // Booking details, or an answer to the question we asked.
    const answeringUs = s.awaiting !== null && SLOT_QUESTIONS.has(s.awaiting);
    if (wantsBooking || answeringUs || (details.date !== null && s.flow !== "idle")) {
      if (s.flow === "idle" || s.flow === "cancel") {
        // "Tomorrow at 5" right after a price offer books the service we offered.
        this.state = { ...idle(), flow: "booking", draft: s.awaiting === "book_offer" ? { ...s.draft } : {} };
      }
      const changed = this.apply(details);
      // A bare "yes" to "Which day?" just means "go on": ask again without apologising.
      if (!changed && answeringUs && !isYes(text)) this.say("Sorry, I didn't quite catch that.");
      this.state.awaiting = null;
      await this.advance();
      return this.finish();
    }

    if (intents.has("greeting")) {
      this.say(
        `Hi! I'm ${this.business.persona.agentName}. I can book ${this.serviceChoices()} for you, or tell you about prices and opening hours. What would you like?`,
      );
      return this.finish();
    }
    if (intents.has("thanks")) {
      this.say("You're welcome! Anything else I can help with?");
      this.reset();
      return this.finish();
    }

    this.say(
      `Sorry, I didn't quite get that. I can book ${this.serviceChoices()}, share prices and opening hours, or change an existing booking.`,
    );
    return this.finish();
  }

  // -------------------------------------------------------------------------
  // Reading the message

  private readDetails(text: string): Details {
    const awaiting = this.state.awaiting;
    return {
      service: matchService(text, this.business.services.map((s) => s.name)),
      partySize: parsePartySize(text, { allowBareNumber: awaiting === "party_size" }),
      date: parseDate(text, this.today),
      time: parseTime(text, { allowBareNumber: awaiting === "time" }),
      dayPart: parseDayPart(text),
      name: extractName(text, { awaitingName: awaiting === "name" }),
    };
  }

  private hasAny(d: Details): boolean {
    return Object.values(d).some((v) => v !== null);
  }

  /** Copies new details into the draft. Returns whether anything changed. */
  private apply(d: Details): boolean {
    const draft = this.state.draft;
    const before = JSON.stringify(draft);
    if (d.service && this.state.flow !== "reschedule") draft.service = d.service;
    if (d.partySize !== null && this.state.flow !== "reschedule") draft.partySize = d.partySize;
    if (d.date) draft.date = d.date;
    if (d.dayPart) draft.dayPart = d.dayPart;
    if (d.time) {
      draft.time = resolveTime(d.time, this.hoursOn(draft.date ?? this.today) ?? this.anyHours());
      delete draft.dayPart;
    }
    if (d.name) draft.name = d.name;
    return JSON.stringify(draft) !== before;
  }

  // -------------------------------------------------------------------------
  // Booking and rescheduling: ask for whatever is missing, then confirm

  private async advance(): Promise<void> {
    const s = this.state;
    const draft = s.draft;
    const rescheduling = s.flow === "reschedule";

    // Tables are chosen from the party size.
    if (!rescheduling && this.tables().length > 0 && draft.partySize) {
      const current = this.service(draft.service);
      if (!current || current.partySize === null || current.partySize < draft.partySize) {
        const table = pickTableService(this.tables(), draft.partySize);
        if (!table) {
          const largest = Math.max(...this.tables().map((t) => t.partySize ?? 0));
          this.say(
            `Our largest table seats ${largest}. For a group of ${draft.partySize}, I'll ask our manager to help. They'll reply here shortly.`,
          );
          this.handoff = true;
          this.reset();
          return;
        }
        draft.service = table.name;
      }
    }

    const service = this.service(draft.service);
    if (!service) {
      if (this.tables().length === this.business.services.length) {
        s.awaiting = "party_size";
        this.say("How many people will be joining?");
      } else {
        s.awaiting = "service";
        this.say(`Which service would you like? We offer:\n${this.serviceLines()}`);
      }
      return;
    }

    if (!rescheduling && service.partySize !== null && !draft.partySize) {
      s.awaiting = "party_size";
      this.say("How many people will be joining?");
      return;
    }

    if (!draft.date) {
      s.awaiting = "date";
      const next = await findNextAvailableSlots({
        businessId: this.business.id,
        serviceId: service.id,
        now: this.turn.now,
        limit: 3,
      });
      const hint = next.length
        ? ` The next free times are ${this.nextTimes(next)}.`
        : "";
      this.say(`Which day would you like${rescheduling ? " to move it to" : ""}?${hint}`);
      return;
    }

    const day = await this.availability(service.id, draft.date);
    if (!day) return;
    if (!day.hours) {
      s.awaiting = "date";
      delete draft.date;
      this.say(`We're closed on ${day.weekday}s. Which other day works for you?`);
      return;
    }
    if (day.slots.length === 0) {
      const label = this.dayLabel(draft.date);
      delete draft.date;
      s.awaiting = "date";
      const next = await findNextAvailableSlots({ businessId: this.business.id, serviceId: service.id, now: this.turn.now, limit: 3 });
      const hint = next.length
        ? ` The next free times are ${this.nextTimes(next)}.`
        : "";
      this.say(`${service.name} is fully booked ${label === "today" ? "for the rest of today" : `on ${label}`}.${hint} Which day suits you?`);
      return;
    }

    const times = day.slots.map((slot) => slot.time);
    if (!draft.time) {
      s.awaiting = "time";
      this.say(this.timeOptions(times, draft.date, draft.dayPart));
      return;
    }
    if (!times.includes(draft.time)) {
      const requested = draft.time;
      const asked = formatClockTime(requested);
      delete draft.time;
      s.awaiting = "time";
      const nearest = this.nearest(times, clockToMinutes(requested), 3);
      this.say(
        `${asked} isn't available ${this.onDay(draft.date)}. The closest free times are ${this.joinOr(nearest.map(formatClockTime))}. Would one of those work?`,
      );
      return;
    }

    if (!rescheduling && !draft.name) {
      if (this.customerName) {
        draft.name = this.customerName;
      } else {
        s.awaiting = "name";
        this.say("Great! What name should I put the booking under?");
        return;
      }
    }

    s.awaiting = "confirm";
    const at = `at *${formatClockTime(draft.time)}*`;
    if (rescheduling) {
      this.say(`Just to confirm: move your *${service.name}* to ${this.boldDay(draft.date)} ${at}? ${this.confirmPrompt()}`);
    } else {
      const price = service.price > 0 ? ` (${formatPrice(service.price, this.business.currency)}, ${formatDuration(service.durationMin)})` : "";
      this.say(
        `Just to confirm: *${service.name}*${this.party(service.partySize, draft.partySize)}${price} ${this.boldDay(draft.date, "on")} ${at}, under the name *${draft.name}*. Shall I book it?`,
      );
    }
  }

  private async carryOutPending(): Promise<void> {
    const s = this.state;
    try {
      if (s.awaiting === "confirm_cancel" && s.bookingId) {
        const booking = await cancelBooking({
          businessId: this.business.id,
          customerId: this.turn.customer.id,
          bookingId: s.bookingId,
          now: this.turn.now,
        });
        this.say(`Done. Your *${booking.serviceName}* ${this.onDay(booking.date)} at ${formatClockTime(booking.time)} is cancelled.`);
        this.reset();
        return;
      }

      const { draft } = s;
      const service = this.service(draft.service);
      if (!service || !draft.date || !draft.time) {
        s.awaiting = null;
        await this.advance();
        return;
      }

      if (s.flow === "reschedule" && s.bookingId) {
        const booking = await rescheduleBooking({
          businessId: this.business.id,
          customerId: this.turn.customer.id,
          bookingId: s.bookingId,
          date: draft.date,
          time: draft.time,
          now: this.turn.now,
        });
        this.say(`All set! Your *${booking.serviceName}* is now ${this.onDay(booking.date)} at *${formatClockTime(booking.time)}*.`);
        this.reset();
        return;
      }

      if (draft.name && draft.name !== this.customerName) {
        await db.customer.update({ where: { id: this.turn.customer.id }, data: { name: draft.name } });
        this.customerName = draft.name;
      }
      const booking = await createBooking({
        businessId: this.business.id,
        serviceId: service.id,
        customerId: this.turn.customer.id,
        date: draft.date,
        time: draft.time,
        partySize: service.partySize !== null ? (draft.partySize ?? null) : null,
        source: "agent",
        now: this.turn.now,
      });
      this.say(
        `You're booked! ✅ *${booking.serviceName}*${this.party(service.partySize, booking.partySize)} ${this.onDay(booking.date)} at *${formatClockTime(booking.time)}*. See you then, ${this.customerName ?? "and thank you"}!`,
      );
      this.reset();
    } catch (error) {
      if (!(error instanceof BookingError)) throw error;
      if (error.alternatives.length > 0) {
        delete s.draft.time;
        s.awaiting = "time";
        this.say(`${error.message} The closest free times are ${this.joinOr(error.alternatives.map(formatClockTime))}. Would one of those work?`);
      } else {
        this.say(error.message);
        this.reset();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Existing bookings

  private async customerBookings(): Promise<BookingSummary[]> {
    return findCustomerBookings({ businessId: this.business.id, customerId: this.turn.customer.id, now: this.turn.now });
  }

  private async offerBookings(flow: "cancel" | "reschedule", prefix?: string, details?: Details): Promise<void> {
    const bookings = await this.customerBookings();
    if (bookings.length === 0) {
      this.say(`You don't have any upcoming bookings with us. Would you like to make one?`);
      this.reset();
      return;
    }
    if (bookings.length === 1) {
      this.state = { ...idle(), flow };
      await this.continueWith(bookings[0]!, details ?? null);
      return;
    }
    this.state = { ...idle(), flow, awaiting: "pick_booking", candidates: bookings.map((b) => b.id) };
    const verb = flow === "cancel" ? "cancel" : "move";
    this.say(`${prefix ?? `Which booking would you like to ${verb}?`}\n${this.bookingLines(bookings)}`);
  }

  private async pickBooking(text: string, details: Details): Promise<BookingSummary | null> {
    const bookings = (await this.customerBookings()).filter((b) => this.state.candidates.includes(b.id));
    const ordered = this.state.candidates.map((id) => bookings.find((b) => b.id === id)).filter((b) => b !== undefined);
    const choice = parseChoice(text);
    if (choice && ordered[choice - 1]) return ordered[choice - 1]!;
    const matches = ordered.filter(
      (b) => (details.service && b.serviceName === details.service) || (details.date && b.date === details.date),
    );
    return matches.length === 1 ? matches[0]! : null;
  }

  /** Carries on cancelling or rescheduling once we know which booking. */
  private async continueWith(booking: BookingSummary, details: Details | null): Promise<void> {
    const s = this.state;
    s.bookingId = booking.id;
    s.candidates = [];
    const label = `*${booking.serviceName}* ${this.onDay(booking.date)} at ${formatClockTime(booking.time)}`;
    if (s.flow === "cancel") {
      s.awaiting = "confirm_cancel";
      this.say(`Cancel your ${label}? ${this.confirmPrompt()}`);
      return;
    }
    s.awaiting = null;
    s.draft = { service: booking.serviceName, partySize: booking.partySize ?? undefined };
    // Only the new day and time matter when moving a booking.
    if (details) this.apply({ ...details, service: null, partySize: null, name: null });
    if (!s.draft.date && !s.draft.time) this.say(`Sure, let's move your ${label}.`);
    await this.advance();
  }

  private async listBookings(): Promise<void> {
    const bookings = await this.customerBookings();
    this.reset();
    if (bookings.length === 0) {
      this.say("You don't have any upcoming bookings with us. Would you like to make one?");
      return;
    }
    this.say(`Here ${bookings.length === 1 ? "is your upcoming booking" : "are your upcoming bookings"}:\n${this.bookingLines(bookings)}`);
  }

  private bookingLines(bookings: BookingSummary[]): string {
    return bookings
      .map((b, i) => {
        const party = b.partySize ? ` (party of ${b.partySize})` : "";
        return `${i + 1}. *${b.serviceName}*${party}, ${this.dayLabel(b.date)} at ${formatClockTime(b.time)}`;
      })
      .join("\n");
  }

  // -------------------------------------------------------------------------
  // Questions

  private answerQuestions(intents: Set<Intent>, details: Details): boolean {
    let answered = false;
    if (intents.has("prices")) {
      this.say(`Here's what we offer:\n${this.serviceLines()}`);
      answered = true;
    }
    if (intents.has("hours")) {
      if (details.date) {
        const hours = this.hoursOn(details.date);
        this.say(
          hours
            ? `${capitalize(this.dayLabel(details.date))} we're open from ${formatClockTime(hours.opensAt)} to ${formatClockTime(hours.closesAt)}.`
            : `We're closed on ${this.weekdayName(details.date)}s.`,
        );
      } else {
        this.say(`Our opening hours:\n${this.hoursLines()}`);
      }
      answered = true;
    }
    if (intents.has("location")) {
      this.say(`We're at ${this.business.address}. You can also call us on ${formatPhone(this.business.phone)}.`);
      answered = true;
    }
    return answered;
  }

  private passToPerson(): ScriptOutcome {
    this.handoff = true;
    this.reset();
    this.say(`Of course. I've asked someone from the ${this.business.name} team to take over. They'll reply in this chat shortly.`);
    return this.finish();
  }

  // -------------------------------------------------------------------------
  // Helpers

  private say(text: string) {
    this.replies.push(text);
  }

  private reset() {
    this.state = idle();
  }

  private finish(): ScriptOutcome {
    return { replies: this.replies, state: this.state, handoff: this.handoff };
  }

  /** How to ask for a yes: typed in chat, spoken on a call. */
  private confirmPrompt(): string {
    return this.voice ? "Shall I go ahead?" : "Reply *yes* to confirm.";
  }

  private service(name: string | undefined) {
    return name ? this.business.services.find((s) => s.name === name) : undefined;
  }

  private tables() {
    return this.business.services.filter((s) => s.partySize !== null);
  }

  private async availability(serviceId: string, date: string): Promise<DayAvailability | null> {
    try {
      return await getAvailability({ businessId: this.business.id, serviceId, date, now: this.turn.now });
    } catch (error) {
      if (!(error instanceof BookingError)) throw error;
      delete this.state.draft.date;
      this.state.awaiting = "date";
      this.say(`${error.message} Which day would you like?`);
      return null;
    }
  }

  private timeOptions(times: string[], date: string, dayPart: DayPart | undefined): string {
    const inPart = dayPart ? times.filter((t) => partOf(t) === dayPart) : times;
    const pool = inPart.length > 0 ? inPart : times;
    const lead = dayPart && inPart.length === 0 ? `Nothing is free in the ${dayPart} ${this.onDay(date)}, but ` : "";
    const shown = sample(pool, this.voice ? 4 : 8).map(formatClockTime);
    const range =
      pool.length > shown.length
        ? `I have openings from ${formatClockTime(pool[0]!)} to ${formatClockTime(pool.at(-1)!)}, for example ${this.joinOr(shown)}`
        : `I can do ${this.joinOr(shown)}`;
    return `${lead}${lead ? range.charAt(0).toLowerCase() + range.slice(1) : range} ${this.onDay(date)}. What time suits you?`;
  }

  private nearest(times: string[], targetMinutes: number, count: number): string[] {
    return [...times]
      .sort((a, b) => Math.abs(clockToMinutes(a) - targetMinutes) - Math.abs(clockToMinutes(b) - targetMinutes) || a.localeCompare(b))
      .slice(0, count)
      .sort();
  }

  private hoursOn(date: string) {
    return this.business.hours.find((h) => h.weekday === weekdayOf(date)) ?? null;
  }

  private anyHours() {
    return this.business.hours[0] ?? null;
  }

  private serviceChoices(): string {
    return this.joinOr(this.business.services.map((s) => `a ${s.name}`));
  }

  private serviceLines(): string {
    return this.business.services
      .map((s) => {
        const seats = s.partySize !== null ? `, seats up to ${s.partySize}` : "";
        return `• *${s.name}*: ${formatPrice(s.price, this.business.currency)}, ${formatDuration(s.durationMin)}${seats}`;
      })
      .join("\n");
  }

  private hoursLines(): string {
    return [1, 2, 3, 4, 5, 6, 0]
      .map((weekday) => {
        const h = this.business.hours.find((x) => x.weekday === weekday);
        const name = WEEKDAY_NAMES[weekday];
        return `• ${name}: ${h ? `${formatClockTime(h.opensAt)} to ${formatClockTime(h.closesAt)}` : "closed"}`;
      })
      .join("\n");
  }

  private weekdayName(date: string): string {
    return WEEKDAY_NAMES[weekdayOf(date)]!;
  }

  /** "today", "tomorrow, Thursday 19 November" or "Friday 20 November". */
  private dayLabel(date: string): string {
    const full = formatInZone(zonedDateTime(date, "12:00", this.tz), this.tz, "EEEE d MMMM");
    if (date === this.today) return "today";
    if (date === addDays(this.today, 1)) return `tomorrow, ${full}`;
    return full;
  }

  /** "*today*", "*tomorrow* (Thursday 19 November)", or "on *Friday 20 November*" ("to …" when moving). */
  private boldDay(date: string, preposition: "on" | "to" = "to"): string {
    if (date === this.today) return "*today*";
    const full = formatInZone(zonedDateTime(date, "12:00", this.tz), this.tz, "EEEE d MMMM");
    if (date === addDays(this.today, 1)) return `*tomorrow* (${full})`;
    return preposition === "on" ? `on *${full}*` : `*${full}*`;
  }

  /** " (party of 3)" for a table that's bigger than the party; nothing otherwise. */
  private party(seats: number | null, size: number | null | undefined): string {
    return seats !== null && size && size !== seats ? ` (party of ${size})` : "";
  }

  /** "today", "tomorrow" or "on Friday 20 November", ready to follow a noun. */
  private onDay(date: string): string {
    if (date === this.today) return "today";
    if (date === addDays(this.today, 1)) return "tomorrow";
    return `on ${this.dayLabel(date)}`;
  }

  private shortDay(date: string): string {
    if (date === this.today) return "today";
    if (date === addDays(this.today, 1)) return "tomorrow";
    return this.weekdayName(date);
  }

  /** "today at 11:00 AM, 11:30 AM or 12:00 PM", or "today at 8:30 PM or tomorrow at 11:00 AM". */
  private nextTimes(next: { date: string; time: string }[]): string {
    const days: { date: string; times: string[] }[] = [];
    for (const { date, time } of next) {
      const last = days.at(-1);
      if (last?.date === date) last.times.push(formatClockTime(time));
      else days.push({ date, times: [formatClockTime(time)] });
    }
    if (days.length === 1) return `${this.shortDay(days[0]!.date)} at ${this.joinOr(days[0]!.times)}`;
    return this.joinOr(days.map((d) => `${this.shortDay(d.date)} at ${d.times.join(", ")}`));
  }

  private joinOr(items: string[]): string {
    if (items.length <= 1) return items.join("");
    return `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;
  }
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function partOf(time: string): DayPart {
  const minutes = clockToMinutes(time);
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  return "evening";
}

/** Up to `count` items spread evenly across the list, keeping the first and last. */
function sample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))]!);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
