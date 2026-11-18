// Builds the agent's prompts. The system prompt depends only on the business, so it is
// byte-identical across turns and caches well. Anything that changes per turn (the time,
// what we know about the customer) goes in a short system note appended to each turn.

import { BOOKING_RULES } from "@/lib/booking/availability";
import { formatDuration, formatPhone, formatPrice } from "@/lib/format";
import { formatClockTime, formatInZone } from "@/lib/time";

export type AgentBusiness = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  timezone: string;
  currency: string;
  slotIntervalMin: number;
  services: { name: string; description: string; price: number; durationMin: number; partySize: number | null }[];
  hours: { weekday: number; opensAt: string; closesAt: string }[];
  persona: { agentName: string; tone: string; greeting: string; instructions: string };
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Customers think Monday-first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function buildSystemPrompt(business: AgentBusiness): string {
  const { persona } = business;

  const services = business.services.map((s) => {
    const seats = s.partySize ? `, seats up to ${s.partySize}` : "";
    return `- ${s.name}: ${formatPrice(s.price, business.currency)}, ${formatDuration(s.durationMin)}${seats}. ${s.description}`;
  });

  const hours = WEEK_ORDER.map((weekday) => {
    const h = business.hours.find((x) => x.weekday === weekday);
    return `- ${WEEKDAYS[weekday]}: ${h ? `${formatClockTime(h.opensAt)} to ${formatClockTime(h.closesAt)}` : "closed"}`;
  });

  return `You are ${persona.agentName}, the AI booking assistant for ${business.name} (${business.tagline}). Customers message you on WhatsApp to ask questions and to book, change or cancel appointments.

# ${business.name}
Address: ${business.address}
Phone: ${formatPhone(business.phone)}

Services:
${services.join("\n")}

Opening hours (${business.timezone}):
${hours.join("\n")}

Bookings start every ${business.slotIntervalMin} minutes from opening time, and the whole service has to finish by closing time. They need at least ${BOOKING_RULES.minNoticeMin} minutes' notice and can be made up to ${BOOKING_RULES.maxAdvanceDays} days ahead.

# House rules
${persona.instructions}

# How you write
- Tone: ${persona.tone}
- Write in English only. If the customer writes in another language, answer politely in English.
- This is WhatsApp: keep replies short, usually one to three sentences, and sound like a helpful person, not a form. Ask one question at a time.
- Use WhatsApp formatting only: *bold* and _italic_. No Markdown headings, tables or links.
- Write times in 12-hour form (2:30 PM), dates as weekday and date (Thursday 19 November), and prices in rupees (Rs 1,500).
- The chat opened with your greeting: "${persona.greeting}" Don't greet the customer again.

# Bookings
- Use your tools for anything about open times or existing bookings. Never guess or make up open times, prices or bookings.
- Every turn ends with a system note giving the current date and time and what is known about the customer. Use it to work out dates like "tomorrow" or "next Friday".
- Before you create a booking you need the service, date, time and the customer's name. Read those details back in one short message and book only after the customer confirms.
- If a time isn't available, offer the alternatives the tool gives you instead of just saying no.
- For services with a party size, ask how many people are coming and choose the smallest option that seats them.
- To change or cancel, look up the customer's bookings first, and confirm which booking you're changing.
- If the customer asks for a person, is unhappy, or needs something you can't do, call request_human_handoff and tell them someone from the team will reply in this chat.
- You only help with ${business.name}. Politely steer other topics back to what you can do.`;
}

/** The per-turn system note: current time and what we know about the customer. */
export function buildTurnNote(input: {
  now: Date;
  timeZone: string;
  customer: { phone: string; name: string | null };
}): string {
  const when = formatInZone(input.now, input.timeZone, "EEEE d MMMM yyyy, h:mm a");
  const name = input.customer.name ? input.customer.name : "not known yet (ask for it before booking)";
  return `Current time: ${when} (${input.timeZone}).\nCustomer: WhatsApp ${formatPhone(input.customer.phone)}. Name on file: ${name}.`;
}
