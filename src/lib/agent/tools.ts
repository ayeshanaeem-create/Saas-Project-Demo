import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  cancelBooking,
  createBooking,
  findCustomerBookings,
  findNextAvailableSlots,
  getAvailability,
  rescheduleBooking,
  type BookingSummary,
} from "@/lib/booking/bookings";
import { BookingError } from "@/lib/booking/errors";
import { db } from "@/lib/db";
import { formatClockTime, formatInZone, zonedDateTime } from "@/lib/time";

// The agent's tools. Each is defined once in zod: the schema becomes the strict JSON
// Schema sent to Claude and validates what comes back. The business, customer and
// conversation are fixed when the tools are created; the model can never choose them.
// Tools stay thin: the booking rules live in src/lib/booking.

type BetaTool = Anthropic.Beta.Messages.BetaTool;

export type ToolContext = {
  businessId: string;
  customerId: string;
  conversationId: string;
  timeZone: string;
  /** Active services, in display order. */
  services: { id: string; name: string }[];
  now: () => Date;
};

export type ToolOutcome = { content: string; isError: boolean };

type ToolSpec<S extends z.ZodType> = {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<S>) => Promise<unknown>;
};

const DATE = "Date as YYYY-MM-DD, in the business's local calendar.";
const TIME = "Start time as HH:mm on the 24-hour clock, exactly as returned by an availability tool (e.g. 14:30).";

export function createAgentTools(ctx: ToolContext) {
  const serviceNames = ctx.services.map((s) => s.name);
  if (serviceNames.length === 0) throw new Error("A business needs at least one active service for the agent to book");
  const service = z.enum(serviceNames as [string, ...string[]]).describe("Exact service name.");
  const serviceId = (name: string) => ctx.services.find((s) => s.name === name)!.id;

  const specs = [
    tool({
      name: "check_availability",
      description:
        "Open start times for one service on one date. Returns 24-hour times (HH:mm); say them to the customer in 12-hour form. An empty list means the day is closed or full.",
      input: z.strictObject({ service, date: z.string().describe(DATE) }),
      run: async ({ service: name, date }) => {
        const day = await getAvailability({ businessId: ctx.businessId, serviceId: serviceId(name), date, now: ctx.now() });
        return {
          service: name,
          date: day.date,
          weekday: day.weekday,
          open: day.hours !== null,
          opening_hours: day.hours && `${formatClockTime(day.hours.opensAt)} to ${formatClockTime(day.hours.closesAt)}`,
          available_times: day.slots.map((s) => s.time),
        };
      },
    }),

    tool({
      name: "find_next_available",
      description:
        "The next open start times for a service from now on, across the coming days. Use when the customer asks for the earliest or next free time.",
      input: z.strictObject({ service }),
      run: async ({ service: name }) => ({
        service: name,
        next_available: await findNextAvailableSlots({
          businessId: ctx.businessId,
          serviceId: serviceId(name),
          now: ctx.now(),
          limit: 6,
        }),
      }),
    }),

    tool({
      name: "create_booking",
      description:
        "Books a service for this customer. Only call it after the customer has confirmed the service, date, time and their name. If the time can't be booked, the result explains why and suggests alternative_times.",
      input: z.strictObject({
        service,
        date: z.string().describe(DATE),
        time: z.string().describe(TIME),
        customer_name: z.string().describe("The customer's name as they gave it."),
        party_size: z.number().int().describe("Number of people. Required for table bookings; omit otherwise.").optional(),
        notes: z.string().describe("Anything the business should know, in a few words.").optional(),
      }),
      run: async (input) => {
        const name = input.customer_name.trim();
        if (name) await db.customer.update({ where: { id: ctx.customerId }, data: { name } });
        const booking = await createBooking({
          businessId: ctx.businessId,
          serviceId: serviceId(input.service),
          customerId: ctx.customerId,
          date: input.date,
          time: input.time,
          partySize: input.party_size ?? null,
          notes: input.notes ?? null,
          source: "agent",
          now: ctx.now(),
        });
        return { ok: true, booking: describe(booking, ctx.timeZone) };
      },
    }),

    tool({
      name: "list_my_bookings",
      description: "This customer's upcoming confirmed bookings with this business, soonest first. Use before changing or cancelling.",
      input: z.strictObject({}),
      run: async () => ({
        bookings: (
          await findCustomerBookings({ businessId: ctx.businessId, customerId: ctx.customerId, now: ctx.now() })
        ).map((b) => describe(b, ctx.timeZone)),
      }),
    }),

    tool({
      name: "reschedule_booking",
      description: "Moves one of this customer's upcoming bookings to a new date and time. Confirm the change with the customer first.",
      input: z.strictObject({
        booking_id: z.string().describe("booking_id from list_my_bookings."),
        date: z.string().describe(DATE),
        time: z.string().describe(TIME),
      }),
      run: async ({ booking_id, date, time }) => {
        const booking = await rescheduleBooking({
          businessId: ctx.businessId,
          customerId: ctx.customerId,
          bookingId: booking_id,
          date,
          time,
          now: ctx.now(),
        });
        return { ok: true, booking: describe(booking, ctx.timeZone) };
      },
    }),

    tool({
      name: "cancel_booking",
      description: "Cancels one of this customer's upcoming bookings. Confirm with the customer first.",
      input: z.strictObject({ booking_id: z.string().describe("booking_id from list_my_bookings.") }),
      run: async ({ booking_id }) => {
        const booking = await cancelBooking({
          businessId: ctx.businessId,
          customerId: ctx.customerId,
          bookingId: booking_id,
          now: ctx.now(),
        });
        return { ok: true, booking: describe(booking, ctx.timeZone) };
      },
    }),

    tool({
      name: "request_human_handoff",
      description:
        "Flags this chat for a team member to take over. Use when the customer asks for a person, is unhappy, or needs something you can't do.",
      input: z.strictObject({ reason: z.string().describe("One sentence for the team about what the customer needs.") }),
      run: async ({ reason }) => {
        await db.conversation.update({ where: { id: ctx.conversationId }, data: { status: "handoff" } });
        console.info(`[agent] handoff requested for conversation ${ctx.conversationId}: ${reason}`);
        return { ok: true, note: "The team has been notified and will reply in this chat." };
      },
    }),
  ];

  const definitions: BetaTool[] = specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    input_schema: toInputSchema(spec.input),
    strict: true,
  }));

  async function run(name: string, input: unknown): Promise<ToolOutcome> {
    const spec = specs.find((s) => s.name === name);
    if (!spec) return { content: `Unknown tool "${name}".`, isError: true };

    const parsed = spec.input.safeParse(input);
    if (!parsed.success) {
      return { content: `Invalid input for ${name}: ${z.prettifyError(parsed.error)}`, isError: true };
    }

    try {
      return { content: JSON.stringify(await spec.run(parsed.data)), isError: false };
    } catch (error) {
      if (error instanceof BookingError) {
        // An expected outcome, not a tool failure: the agent relays it to the customer.
        const outcome = { ok: false, error: error.code, message: error.message, alternative_times: error.alternatives };
        return { content: JSON.stringify(outcome), isError: false };
      }
      console.error(`[agent] tool ${name} failed`, error);
      return { content: "Something went wrong on our side. Apologise and offer to connect the customer with the team.", isError: true };
    }
  }

  return { definitions, run };
}

/** Keeps each spec's run() typed against its own schema. */
function tool<S extends z.ZodType>(spec: ToolSpec<S>) {
  return spec as ToolSpec<z.ZodType> & { run: (input: unknown) => Promise<unknown> };
}

function toInputSchema(schema: z.ZodType): BetaTool["input_schema"] {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  // Strict tool schemas don't take numeric bounds; the booking engine validates ranges.
  return stripNumericBounds(json) as BetaTool["input_schema"];
}

function stripNumericBounds(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripNumericBounds);
  if (node === null || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => !["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(key))
      .map(([key, value]) => [key, stripNumericBounds(value)]),
  );
}

/** A booking as the agent sees it: ids for follow-up calls, plus ready-to-say times. */
function describe(b: BookingSummary, timeZone: string) {
  const start = zonedDateTime(b.date, b.time, timeZone);
  return {
    booking_id: b.id,
    service: b.serviceName,
    date: b.date,
    when: `${formatInZone(start, timeZone, "EEEE d MMMM")}, ${formatClockTime(b.time)} to ${formatClockTime(b.endTime)}`,
    time: b.time,
    party_size: b.partySize,
    customer_name: b.customerName,
    status: b.status,
    notes: b.notes,
  };
}
