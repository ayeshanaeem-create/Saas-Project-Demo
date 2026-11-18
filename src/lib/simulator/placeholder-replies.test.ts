import { describe, expect, it } from "vitest";

import { placeholderReply } from "@/lib/simulator/placeholder-replies";
import { zonedDateTime } from "@/lib/time";
import type { SimulatorBusiness } from "@/types/simulator";

const salon: SimulatorBusiness = {
  slug: "glamour-salon",
  name: "Glamour Salon",
  emoji: "💇‍♀️",
  tagline: "Hair, skin and bridal studio",
  phone: "+924235550101",
  timezone: "Asia/Karachi",
  currency: "PKR",
  agentName: "Sana",
  greeting: "Hi!",
  services: [
    { name: "Haircut", price: 1500, durationMin: 45, partySize: null },
    { name: "Bridal Makeup", price: 45000, durationMin: 180, partySize: null },
  ],
  hours: [{ weekday: 3, opensAt: "11:00", closesAt: "21:00" }], // Wednesdays only
};

const wednesday = zonedDateTime("2026-11-18", "12:00", "Asia/Karachi");
const monday = zonedDateTime("2026-11-16", "12:00", "Asia/Karachi");

describe("placeholderReply", () => {
  it("lists services with duration and price", () => {
    const reply = placeholderReply(salon, "How much is a haircut?", wednesday);
    expect(reply).toContain("*Haircut*: 45 min");
    expect(reply).toContain("1,500");
    expect(reply).toContain("*Bridal Makeup*: 3 hr");
  });

  it("gives today's hours in the business timezone", () => {
    expect(placeholderReply(salon, "what time do you open?", wednesday)).toBe(
      "We're open today from 11:00 AM to 9:00 PM.",
    );
    expect(placeholderReply(salon, "are you open?", monday)).toMatch(/^We're closed today/);
  });

  it("greets by agent name and falls back to a hint", () => {
    expect(placeholderReply(salon, "Hello", wednesday)).toMatch(/^Hi! I'm Sana/);
    expect(placeholderReply(salon, "asdf", wednesday)).toMatch(/placeholder/);
  });
});
