// Phase 2 stand-in for the AI agent. Answers a few obvious questions from the
// business's real data so the simulator can be demoed before Phase 4 connects Claude.
// Delete this module once the agent endpoint is live.

import { formatDuration, formatPrice } from "@/lib/format";
import { formatClockTime, todayInZone, weekdayOf } from "@/lib/time";
import type { SimulatorBusiness } from "@/types/simulator";

const ASK_PRICES = /\b(price|prices|cost|costs|rate|rates|charges?|how much|menu|services?|offer)\b/i;
const ASK_HOURS = /\b(hours?|open|opening|close|closing|timings?)\b/i;
const ASK_BOOKING = /\b(book|booking|appointment|reserve|reservation|table|slot|available|availability)\b/i;
const GREETING = /^\s*(hi|hello|hey|salam|assalam|good (morning|afternoon|evening))\b/i;

const HINT = "Try asking about *prices* or *opening hours*.";

export function placeholderReply(business: SimulatorBusiness, text: string, now: Date): string {
  if (ASK_PRICES.test(text)) return servicesReply(business);
  if (ASK_HOURS.test(text)) return hoursReply(business, now);
  if (ASK_BOOKING.test(text)) {
    return `I'd love to help you book! Live booking switches on once the AI agent is connected. ${HINT}`;
  }
  if (GREETING.test(text)) return `Hi! I'm ${business.agentName}. ${HINT}`;
  return `Thanks for your message! I'm a placeholder until the AI agent is connected. ${HINT}`;
}

function servicesReply(business: SimulatorBusiness): string {
  const lines = business.services.map(
    (s) => `• *${s.name}*: ${formatDuration(s.durationMin)}, ${formatPrice(s.price, business.currency)}`,
  );
  return [`Here's what we offer at ${business.name}:`, "", ...lines].join("\n");
}

function hoursReply(business: SimulatorBusiness, now: Date): string {
  const today = weekdayOf(todayInZone(business.timezone, now));
  const hours = business.hours.find((h) => h.weekday === today);
  if (!hours) return `We're closed today. ${HINT}`;
  return `We're open today from ${formatClockTime(hours.opensAt)} to ${formatClockTime(hours.closesAt)}.`;
}
