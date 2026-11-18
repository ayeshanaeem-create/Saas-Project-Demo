import { beforeEach, describe, expect, it } from "vitest";

import { runScriptedTurn } from "@/lib/agent/scripted/run-scripted";
import { createBooking } from "@/lib/booking/bookings";
import { db } from "@/lib/db";
import { SIMULATOR_CUSTOMER_PHONE } from "@/lib/simulator/constants";
import { zonedDateTime } from "@/lib/time";
import type { AgentEvent } from "@/types/agent-events";

const TZ = "Asia/Karachi";
const NOW = zonedDateTime("2026-11-18", "10:00", TZ); // Wednesday morning
const THU = "2026-11-19";

let salonId: string;
let restaurantId: string;
let customerId: string;
let otherCustomerId: string;

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

  const openDays = [0, 2, 3, 4, 5, 6]; // closed Mondays
  salonId = (
    await db.business.create({
      data: {
        slug: "salon",
        name: "Glamour Salon",
        emoji: "💇‍♀️",
        category: "salon",
        tagline: "Hair",
        address: "Main Boulevard, Lahore",
        phone: "+924235550101",
        timezone: TZ,
        workingHours: { create: openDays.map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "21:00" })) },
        services: {
          create: [
            { name: "Haircut", description: "", price: 1500, durationMin: 45, capacity: 2, sortOrder: 0 },
            { name: "Facial", description: "", price: 3500, durationMin: 60, capacity: 1, sortOrder: 1 },
          ],
        },
        persona: { create: { agentName: "Sana", tone: "", greeting: "Hi!", instructions: "" } },
      },
    })
  ).id;

  restaurantId = (
    await db.business.create({
      data: {
        slug: "restaurant",
        name: "Spice Garden",
        emoji: "🍛",
        category: "restaurant",
        tagline: "Food",
        address: "MM Alam Road, Lahore",
        phone: "+924235550303",
        timezone: TZ,
        workingHours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: "12:00", closesAt: "23:30" })) },
        services: {
          create: [2, 4, 6, 8].map((size, i) => ({
            name: `Table for ${size}`,
            description: "",
            price: 0,
            durationMin: 90,
            capacity: 3,
            partySize: size,
            sortOrder: i,
          })),
        },
        persona: { create: { agentName: "Bilal", tone: "", greeting: "Hello!", instructions: "" } },
      },
    })
  ).id;

  customerId = (await db.customer.create({ data: { phone: SIMULATOR_CUSTOMER_PHONE } })).id;
  otherCustomerId = (await db.customer.create({ data: { phone: "+923001110001", name: "Hira" } })).id;
});

/** Sends one message as the simulator customer and returns the reply bubbles. */
async function send(text: string, businessId = salonId): Promise<string[]> {
  const events: AgentEvent[] = [];
  await runScriptedTurn({
    businessId,
    customerId,
    channel: "chat",
    texts: [text],
    onEvent: (e) => events.push(e),
    now: () => NOW,
    delay: async () => {},
  });
  expect(events[0]?.type).toBe("accepted");
  expect(events.at(-1)?.type).toBe("done");
  // Prices use a non-breaking space ("Rs 1,500"); compare as plain spaces.
  return events.flatMap((e) => (e.type === "message" ? [e.message.text.replace(/ /g, " ")] : []));
}

const serviceId = async (name: string) => (await db.service.findFirstOrThrow({ where: { name } })).id;

describe("booking", () => {
  it("asks for what's missing, confirms, then books", async () => {
    const [times] = await send("Hi, I'd like a haircut tomorrow");
    expect(times).toBe(
      // 19 open times, 8 shown spread evenly from first to last.
      "I have openings from 11:00 AM to 8:00 PM, for example 11:00 AM, 12:30 PM, 1:30 PM, 3:00 PM, 4:00 PM, 5:30 PM, 6:30 PM or 8:00 PM tomorrow. What time suits you?",
    );

    expect(await send("5pm")).toEqual(["Great! What name should I put the booking under?"]);

    expect(await send("Sara")).toEqual([
      "Just to confirm: *Haircut* (Rs 1,500, 45 min) *tomorrow* (Thursday 19 November) at *5:00 PM*, under the name *Sara*. Shall I book it?",
    ]);

    expect(await send("yes please")).toEqual(["You're booked! ✅ *Haircut* tomorrow at *5:00 PM*. See you then, Sara!"]);

    const booking = await db.booking.findFirstOrThrow({ include: { customer: true } });
    expect(booking).toMatchObject({ source: "agent", status: "confirmed" });
    expect(booking.startAt.toISOString()).toBe("2026-11-19T12:00:00.000Z");
    expect(booking.customer.name).toBe("Sara");
  });

  it("books in one message when the customer's name is on file", async () => {
    await db.customer.update({ where: { id: customerId }, data: { name: "Ali" } });
    const [confirm] = await send("can I book a facial on friday at 3pm?");
    expect(confirm).toContain("*Facial* (Rs 3,500, 1 hr) on *Friday 20 November* at *3:00 PM*, under the name *Ali*");
    expect(await send("yes")).toEqual(["You're booked! ✅ *Facial* on Friday 20 November at *3:00 PM*. See you then, Ali!"]);
  });

  it("offers the nearest free times when the requested one is taken", async () => {
    await createBooking({
      businessId: salonId,
      serviceId: await serviceId("Facial"),
      customerId: otherCustomerId,
      date: THU,
      time: "15:00",
      source: "staff",
      now: NOW,
    });
    expect(await send("facial tomorrow at 3pm")).toEqual([
      "3:00 PM isn't available tomorrow. The closest free times are 1:30 PM, 2:00 PM or 4:00 PM. Would one of those work?",
    ]);
    // A bare number now counts as a time.
    expect(await send("4")).toEqual(["Great! What name should I put the booking under?"]);
  });

  it("says when the business is closed", async () => {
    expect(await send("haircut on monday")).toEqual(["We're closed on Mondays. Which other day works for you?"]);
  });

  it("lets the customer change a detail instead of confirming", async () => {
    await db.customer.update({ where: { id: customerId }, data: { name: "Ali" } });
    await send("haircut tomorrow at 5pm");
    const [reconfirm] = await send("no, make it 6pm");
    expect(reconfirm).toContain("at *6:00 PM*");
  });

  it("answers a question mid-booking, then asks again", async () => {
    await send("haircut tomorrow");
    const replies = await send("how much does it cost?");
    expect(replies[0]).toMatch(/^Here's what we offer:\n• \*Haircut\*: Rs 1,500, 45 min/);
    expect(replies[1]).toMatch(/What time suits you\?$/);
  });

  it("picks a table from the party size", async () => {
    await db.customer.update({ where: { id: customerId }, data: { name: "Omar" } });
    const [confirm] = await send("table for 5 tomorrow at 8pm", restaurantId);
    expect(confirm).toBe(
      "Just to confirm: *Table for 6* (party of 5) *tomorrow* (Thursday 19 November) at *8:00 PM*, under the name *Omar*. Shall I book it?",
    );
    expect(await send("yes", restaurantId)).toEqual([
      "You're booked! ✅ *Table for 6* (party of 5) tomorrow at *8:00 PM*. See you then, Omar!",
    ]);
    expect((await db.booking.findFirstOrThrow()).partySize).toBe(5);
  });

  it("asks restaurant guests how many are coming", async () => {
    expect(await send("I'd like to reserve for tonight", restaurantId)).toEqual(["How many people will be joining?"]);
    const [times] = await send("4", restaurantId);
    expect(times).toMatch(/today\. What time suits you\?$/);
  });

  it("hands very large groups to a person", async () => {
    const [reply] = await send("table for 12 on saturday", restaurantId);
    expect(reply).toMatch(/^Our largest table seats 8/);
    expect((await db.conversation.findFirstOrThrow({ where: { businessId: restaurantId } })).status).toBe("handoff");
  });
});

describe("existing bookings", () => {
  async function bookForCustomer(service: string, date: string, time: string) {
    return createBooking({
      businessId: salonId,
      serviceId: await serviceId(service),
      customerId,
      date,
      time,
      source: "staff",
      now: NOW,
    });
  }

  it("cancels the only booking after confirmation", async () => {
    const booking = await bookForCustomer("Haircut", THU, "17:00");
    expect(await send("I need to cancel my booking")).toEqual(["Cancel your *Haircut* tomorrow at 5:00 PM? Reply *yes* to confirm."]);
    expect(await send("yes")).toEqual(["Done. Your *Haircut* tomorrow at 5:00 PM is cancelled."]);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("cancelled");
  });

  it("asks which booking when there are several, and can keep it", async () => {
    await bookForCustomer("Haircut", THU, "17:00");
    await bookForCustomer("Facial", "2026-11-20", "12:00");
    expect(await send("cancel my appointment")).toEqual([
      "Which booking would you like to cancel?\n1. *Haircut*, tomorrow, Thursday 19 November at 5:00 PM\n2. *Facial*, Friday 20 November at 12:00 PM",
    ]);
    expect(await send("2")).toEqual(["Cancel your *Facial* on Friday 20 November at 12:00 PM? Reply *yes* to confirm."]);
    expect(await send("no")).toEqual(["No problem, your booking stays as it is. Anything else I can help with?"]);
    expect(await db.booking.count({ where: { status: "confirmed" } })).toBe(2);
  });

  it("reschedules in one message when the new time is given", async () => {
    const booking = await bookForCustomer("Haircut", THU, "17:00");
    expect(await send("can I move my appointment to friday at 4pm?")).toEqual([
      "Just to confirm: move your *Haircut* to *Friday 20 November* at *4:00 PM*? Reply *yes* to confirm.",
    ]);
    expect(await send("yes")).toEqual(["All set! Your *Haircut* is now on Friday 20 November at *4:00 PM*."]);
    const moved = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(moved.startAt.toISOString()).toBe("2026-11-20T11:00:00.000Z");
  });

  it("lists upcoming bookings", async () => {
    await bookForCustomer("Haircut", THU, "17:00");
    expect(await send("do I have any bookings?")).toEqual([
      "Here is your upcoming booking:\n1. *Haircut*, tomorrow, Thursday 19 November at 5:00 PM",
    ]);
  });
});

describe("conversation", () => {
  it("greets, answers questions, and hands off on request", async () => {
    expect(await send("hello")).toEqual([
      "Hi! I'm Sana. I can book a Haircut or a Facial for you, or tell you about prices and opening hours. What would you like?",
    ]);
    expect(await send("are you open on sunday?")).toEqual(["Sunday 22 November we're open from 11:00 AM to 9:00 PM."]);
    expect(await send("where are you?")).toEqual(["We're at Main Boulevard, Lahore. You can also call us on +92 42 3555 0101."]);
    expect(await send("I want to speak to a manager")).toEqual([
      "Of course. I've asked someone from the Glamour Salon team to take over. They'll reply in this chat shortly.",
    ]);
    expect((await db.conversation.findFirstOrThrow()).status).toBe("handoff");
  });

  it("falls back politely and saves everything for replay", async () => {
    expect(await send("asdfgh")).toEqual([
      "Sorry, I didn't quite get that. I can book a Haircut or a Facial, share prices and opening hours, or change an existing booking.",
    ]);
    const rows = await db.message.findMany({ orderBy: { position: "asc" } });
    expect(rows.map((r) => [r.role, JSON.parse(r.content)])).toEqual([
      ["user", [{ type: "text", text: "asdfgh" }]],
      ["assistant", [{ type: "text", text: expect.stringMatching(/^Sorry/) }]],
    ]);
  });
});
