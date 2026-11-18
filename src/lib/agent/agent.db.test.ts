import type Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it } from "vitest";

import { loadMessages } from "@/lib/agent/conversations";
import { toApiMessages } from "@/lib/agent/history";
import { runAgentTurn } from "@/lib/agent/run-agent";
import { createAgentTools } from "@/lib/agent/tools";
import { db } from "@/lib/db";
import { SIMULATOR_CUSTOMER_PHONE } from "@/lib/simulator/constants";
import { zonedDateTime } from "@/lib/time";
import type { AgentEvent } from "@/types/agent-events";

const TZ = "Asia/Karachi";
const THU = "2026-11-19";
const MON = "2026-11-23"; // closed
const NOW = zonedDateTime("2026-11-18", "10:00", TZ); // Wednesday

type Params = Anthropic.Beta.Messages.MessageCreateParams;
type FakeResponse = { stop_reason: string; content: unknown[] };

/** A stand-in for the Anthropic client that replays canned responses and records requests. */
function fakeClient(responses: (FakeResponse | Error)[], delayMs = 0) {
  const requests: Params[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Params) {
          requests.push(structuredClone(params));
          const next = responses.shift();
          return {
            async finalMessage() {
              if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
              if (!next) throw new Error("fake client: no response left");
              if (next instanceof Error) throw next;
              return { id: "msg", type: "message", role: "assistant", model: "fake", usage: {}, ...next };
            },
          };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, requests };
}

const toolUse = (id: string, name: string, input: unknown) => ({ type: "tool_use", id, name, input });
const text = (t: string) => ({ type: "text", text: t, citations: null });
const thinking = { type: "thinking", thinking: "", signature: "sig-1" };

let businessId: string;
let customerId: string;

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
      slug: "test-salon",
      name: "Test Salon",
      emoji: "✂️",
      category: "salon",
      tagline: "Cuts",
      address: "Somewhere, Lahore",
      phone: "+924235550101",
      timezone: TZ,
      workingHours: { create: [0, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "21:00" })) },
      services: {
        create: [
          { name: "Haircut", description: "Cut.", price: 1500, durationMin: 45, capacity: 2, sortOrder: 0 },
          { name: "Table for 4", description: "Table.", price: 0, durationMin: 90, capacity: 1, partySize: 4, sortOrder: 1 },
        ],
      },
      persona: { create: { agentName: "Sana", tone: "Warm.", greeting: "Hi! I'm Sana.", instructions: "Be nice." } },
    },
  });
  businessId = business.id;
  customerId = (await db.customer.create({ data: { phone: SIMULATOR_CUSTOMER_PHONE } })).id;
});

async function turn(texts: string[], responses: (FakeResponse | Error)[]) {
  const events: AgentEvent[] = [];
  const fake = fakeClient(responses);
  let thrown: unknown;
  try {
    await runAgentTurn({ businessId, customerId, channel: "chat", texts, onEvent: (e) => events.push(e), client: fake.client, now: () => NOW });
  } catch (error) {
    thrown = error;
  }
  return { events, requests: fake.requests, thrown };
}

async function storedRows() {
  const conversation = await db.conversation.findFirstOrThrow({ where: { businessId, customerId } });
  return loadMessages(conversation.id);
}

describe("runAgentTurn", () => {
  it("runs tools, saves every step in order and emits the reply", async () => {
    const firstResponse = [thinking, toolUse("tu1", "check_availability", { service: "Haircut", date: THU })];
    const { events, requests } = await turn(
      ["Any haircut tomorrow?"],
      [
        { stop_reason: "tool_use", content: firstResponse },
        { stop_reason: "end_turn", content: [text("Yes, *11:00 AM* is free.")] },
      ],
    );

    expect(events.map((e) => e.type)).toEqual(["accepted", "typing", "message", "done"]);
    expect(events[2]).toMatchObject({ message: { direction: "incoming", text: "Yes, *11:00 AM* is free." } });

    // First request: cached system prompt + tools, the customer's message, then the turn note.
    const [first, second] = requests;
    expect(first).toMatchObject({
      model: "claude-opus-5-5",
      output_config: { effort: "low" },
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      cache_control: { type: "ephemeral" },
    });
    expect(first?.system).toMatch(/^You are Sana, the AI booking assistant for Test Salon/);
    expect(first?.tools?.map((t) => ("name" in t ? t.name : ""))).toEqual([
      "check_availability",
      "find_next_available",
      "create_booking",
      "list_my_bookings",
      "reschedule_booking",
      "cancel_booking",
      "request_human_handoff",
    ]);
    expect(first?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "Any haircut tomorrow?" }] },
      {
        role: "system",
        content:
          "Current time: Wednesday 18 November 2026, 10:00 AM (Asia/Karachi).\nCustomer: WhatsApp +92 300 0000000. Name on file: not known yet (ask for it before booking).",
      },
    ]);

    // Second request: the tool call and its real result appended.
    const toolResult = second?.messages.at(-1);
    expect(toolResult?.role).toBe("user");
    const result = (toolResult?.content as { type: string; content: string }[])[0]!;
    expect(result.type).toBe("tool_result");
    expect(JSON.parse(result.content)).toMatchObject({ weekday: "Thursday", open: true, available_times: expect.arrayContaining(["11:00", "20:00"]) });

    const rows = await storedRows();
    expect(rows.map((r) => [r.position, r.role, r.text])).toEqual([
      [0, "user", "Any haircut tomorrow?"],
      [1, "system", ""],
      [2, "assistant", ""],
      [3, "user", ""],
      [4, "assistant", "Yes, *11:00 AM* is free."],
    ]);
  });

  it("replays the previous turn verbatim, including thinking blocks, and books", async () => {
    const firstResponse = [thinking, toolUse("tu1", "check_availability", { service: "Haircut", date: THU })];
    await turn(
      ["Any haircut tomorrow?"],
      [
        { stop_reason: "tool_use", content: firstResponse },
        { stop_reason: "end_turn", content: [text("Yes, 11 AM is free.")] },
      ],
    );
    const historyAfterTurnOne = toApiMessages(await storedRows());

    const { requests, events } = await turn(
      ["Book 11 please, I'm Sara"],
      [
        {
          stop_reason: "tool_use",
          content: [toolUse("tu2", "create_booking", { service: "Haircut", date: THU, time: "11:00", customer_name: "Sara" })],
        },
        { stop_reason: "end_turn", content: [text("Done, Sara!")] },
      ],
    );

    const sent = requests[0]!.messages;
    expect(sent.slice(0, historyAfterTurnOne.length)).toEqual(historyAfterTurnOne);
    expect(sent[2]).toEqual({ role: "assistant", content: firstResponse });

    const booking = await db.booking.findFirstOrThrow({ include: { customer: true } });
    expect(booking).toMatchObject({ source: "agent", status: "confirmed" });
    expect(booking.customer.name).toBe("Sara");
    expect(events.find((e) => e.type === "message")).toMatchObject({ message: { text: "Done, Sara!" } });
  });

  it("hands booking problems to the agent as results, not errors", async () => {
    const { requests } = await turn(
      ["Monday at noon"],
      [
        {
          stop_reason: "tool_use",
          content: [toolUse("tu1", "create_booking", { service: "Haircut", date: MON, time: "12:00", customer_name: "Ali" })],
        },
        { stop_reason: "end_turn", content: [text("We're closed Mondays.")] },
      ],
    );
    const result = (requests[1]!.messages.at(-1)!.content as { content: string; is_error?: boolean }[])[0]!;
    expect(result.is_error).toBeUndefined();
    expect(JSON.parse(result.content)).toMatchObject({ ok: false, error: "CLOSED", message: "Test Salon is closed on Mondays." });
  });

  it("flags invalid tool input as an error result", async () => {
    const { requests } = await turn(
      ["x"],
      [
        { stop_reason: "tool_use", content: [toolUse("tu1", "check_availability", { service: "Massage", date: THU })] },
        { stop_reason: "end_turn", content: [text("Sorry.")] },
      ],
    );
    const result = (requests[1]!.messages.at(-1)!.content as { content: string; is_error?: boolean }[])[0]!;
    expect(result.is_error).toBe(true);
    expect(result.content).toMatch(/^Invalid input for check_availability/);
  });

  it("keeps a valid history when the API fails, and merges the retry", async () => {
    const failed = await turn(["first try"], [new Error("network down")]);
    expect(failed.thrown).toBeInstanceOf(Error);
    expect(failed.events.map((e) => e.type)).toEqual(["accepted", "typing"]);
    expect((await storedRows()).map((r) => r.role)).toEqual(["user"]); // no orphaned system note

    const retry = await turn(["second try"], [{ stop_reason: "end_turn", content: [text("Hello!")] }]);
    expect(retry.requests[0]!.messages[0]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "first try" },
        { type: "text", text: "second try" },
      ],
    });
  });

  it("answers a refusal politely and never runs that response's tools", async () => {
    const { events } = await turn(
      ["something off-topic"],
      [{ stop_reason: "refusal", content: [toolUse("tu1", "cancel_booking", { booking_id: "x" })] }],
    );
    expect(events.find((e) => e.type === "message")).toMatchObject({
      message: { text: expect.stringMatching(/^Sorry, I can't help with that here/) },
    });
    expect((await storedRows()).map((r) => r.role)).toEqual(["user", "system", "assistant"]);
  });

  it("runs one turn at a time per conversation", async () => {
    const a = fakeClient([{ stop_reason: "end_turn", content: [text("Reply A")] }], 50);
    const b = fakeClient([{ stop_reason: "end_turn", content: [text("Reply B")] }]);
    const run = (texts: string[], client: Anthropic) =>
      runAgentTurn({ businessId, customerId, channel: "chat", texts, onEvent: () => {}, client, now: () => NOW });

    await Promise.all([run(["A"], a.client), run(["B"], b.client)]);

    expect(await db.conversation.count()).toBe(1); // both first messages share one conversation
    expect((await storedRows()).map((r) => r.text || r.role)).toEqual(["A", "system", "Reply A", "B", "system", "Reply B"]);
    expect(b.requests[0]!.messages.some((m) => m.role === "assistant")).toBe(true);
  });

  it("marks the conversation for a human on handoff", async () => {
    await turn(
      ["I want to talk to a person"],
      [
        { stop_reason: "tool_use", content: [toolUse("tu1", "request_human_handoff", { reason: "Wants a person." })] },
        { stop_reason: "end_turn", content: [text("Someone will reply here soon.")] },
      ],
    );
    expect((await db.conversation.findFirstOrThrow()).status).toBe("handoff");
  });
});

describe("createAgentTools", () => {
  it("sends strict schemas without $schema or numeric bounds", async () => {
    const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });
    const { definitions } = createAgentTools({
      businessId,
      customerId,
      conversationId: "c",
      timeZone: TZ,
      services,
      now: () => NOW,
    });
    const create = definitions.find((d) => d.name === "create_booking")!;
    expect(create.strict).toBe(true);
    expect(create.input_schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["service", "date", "time", "customer_name"],
      properties: { service: { type: "string", enum: ["Haircut", "Table for 4"] }, party_size: { type: "integer" } },
    });
    const json = JSON.stringify(definitions);
    expect(json).not.toMatch(/\$schema|"minimum"|"maximum"/);
  });
});
