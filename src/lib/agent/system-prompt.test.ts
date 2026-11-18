import { describe, expect, it } from "vitest";

import { buildSystemPrompt, buildTurnNote, type AgentBusiness } from "@/lib/agent/system-prompt";
import { zonedDateTime } from "@/lib/time";

const restaurant: AgentBusiness = {
  name: "Spice Garden Restaurant",
  tagline: "Desi and BBQ, family style",
  address: "MM Alam Road, Lahore",
  phone: "+924235550303",
  timezone: "Asia/Karachi",
  currency: "PKR",
  slotIntervalMin: 30,
  services: [
    { name: "Table for 2", description: "Up to 2 guests.", price: 0, durationMin: 90, partySize: 2 },
    { name: "Table for 4", description: "Up to 4 guests.", price: 0, durationMin: 90, partySize: 4 },
  ],
  hours: [{ weekday: 5, opensAt: "12:00", closesAt: "23:30" }],
  persona: {
    agentName: "Bilal",
    tone: "Hospitable and cheerful.",
    greeting: "Hello and welcome to Spice Garden!",
    instructions: "Reservations are free.",
  },
};

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt(restaurant);

  it("introduces the persona and business", () => {
    expect(prompt).toMatch(/^You are Bilal, the AI booking assistant for Spice Garden Restaurant/);
    expect(prompt).toContain("Phone: +92 42 3555 0303");
  });

  it("lists services with price, duration and seats", () => {
    expect(prompt).toContain("- Table for 4: Free, 1 hr 30 min, seats up to 4. Up to 4 guests.");
  });

  it("lists the week Monday-first, including closed days", () => {
    const hours = prompt.slice(prompt.indexOf("Opening hours"));
    expect(hours.indexOf("- Monday: closed")).toBeLessThan(hours.indexOf("- Friday: 12:00 PM to 11:30 PM"));
    expect(hours).toContain("- Sunday: closed");
  });

  it("includes booking rules, house rules and the greeting", () => {
    expect(prompt).toContain("at least 30 minutes' notice");
    expect(prompt).toContain("up to 60 days ahead");
    expect(prompt).toContain("# House rules\nReservations are free.");
    expect(prompt).toContain('greeting: "Hello and welcome to Spice Garden!"');
  });

  it("is deterministic, so it can be prompt-cached", () => {
    expect(buildSystemPrompt(restaurant)).toBe(prompt);
  });
});

describe("buildTurnNote", () => {
  const now = zonedDateTime("2026-11-18", "14:05", "Asia/Karachi");

  it("gives the local time and customer details", () => {
    expect(buildTurnNote({ now, timeZone: "Asia/Karachi", customer: { phone: "+923000000000", name: "Sara" } })).toBe(
      "Current time: Wednesday 18 November 2026, 2:05 PM (Asia/Karachi).\nCustomer: WhatsApp +92 300 0000000. Name on file: Sara.",
    );
  });

  it("tells the agent to ask for a missing name", () => {
    const note = buildTurnNote({ now, timeZone: "Asia/Karachi", customer: { phone: "+923000000000", name: null } });
    expect(note).toContain("Name on file: not known yet (ask for it before booking).");
  });
});
