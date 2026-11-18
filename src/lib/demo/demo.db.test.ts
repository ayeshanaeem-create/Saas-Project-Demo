import { beforeEach, describe, expect, it } from "vitest";

import { runScriptedTurn } from "@/lib/agent/scripted/run-scripted";
import { db } from "@/lib/db";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { seedDemo } from "@/lib/demo/seed";
import { SIMULATOR_CUSTOMER_PHONE } from "@/lib/simulator/constants";
import { zonedDateTime } from "@/lib/time";
import { businessCategorySchema } from "@/types/domain";

const NOW = zonedDateTime("2026-11-18", "10:00", "Asia/Karachi"); // a Wednesday morning

describe("seedDemo", () => {
  it("creates the four demo businesses with their data, and can run again", async () => {
    const first = await seedDemo(db, NOW);
    const second = await seedDemo(db, NOW);
    expect(second).toEqual(first);
    expect(first.map((s) => s.name)).toEqual([
      "Glamour Salon",
      "SmileCare Dental Clinic",
      "Spice Garden Restaurant",
      "FitZone Gym",
    ]);
    expect(await db.business.count()).toBe(4);
    expect(await db.agentPersona.count()).toBe(4);
    expect(await db.customer.findUnique({ where: { phone: SIMULATOR_CUSTOMER_PHONE } })).toMatchObject({ name: null });
    expect(await db.booking.count()).toBe(first.reduce((n, s) => n + s.bookings, 0));
  });

  it("wipes demo activity", async () => {
    await seedDemo(db, NOW);
    const business = await db.business.findFirstOrThrow();
    const customer = await db.customer.findUniqueOrThrow({ where: { phone: SIMULATOR_CUSTOMER_PHONE } });
    await db.conversation.create({ data: { businessId: business.id, customerId: customer.id, channel: "chat" } });
    await db.customer.update({ where: { id: customer.id }, data: { name: "Someone" } });

    await seedDemo(db, NOW);
    expect(await db.conversation.count()).toBe(0);
    expect((await db.customer.findUniqueOrThrow({ where: { phone: SIMULATOR_CUSTOMER_PHONE } })).name).toBeNull();
  });
});

describe("demo scenarios", () => {
  beforeEach(async () => {
    await seedDemo(db, NOW);
  });

  for (const business of ["glamour-salon", "smilecare-dental", "spice-garden", "fitzone-gym"]) {
    it(`${business}: every suggested message gets a real answer`, async () => {
      const row = await db.business.findUniqueOrThrow({ where: { slug: business } });
      const customer = await db.customer.findUniqueOrThrow({ where: { phone: SIMULATOR_CUSTOMER_PHONE } });
      const transcript: string[] = [];

      for (const { message } of SCENARIOS[businessCategorySchema.parse(row.category)]) {
        const replies: string[] = [];
        await runScriptedTurn({
          businessId: row.id,
          customerId: customer.id,
          channel: "chat",
          texts: [message],
          onEvent: (e) => e.type === "message" && replies.push(e.message.text),
          now: () => NOW,
          delay: async () => {},
        });
        transcript.push(`> ${message}`, ...replies.map((r) => `< ${r}`));
        for (const reply of replies) expect(reply, transcript.join("\n")).not.toMatch(/didn't quite (get|catch) that/);
        expect(replies.length, transcript.join("\n")).toBeGreaterThan(0);
      }

      if (process.env.SHOW_TRANSCRIPTS) console.log(`\n## ${business}\n${transcript.join("\n")}`);

      // Each scenario books something along the way.
      expect(await db.booking.count({ where: { businessId: row.id, source: "agent" } })).toBe(1);
    });
  }
});
