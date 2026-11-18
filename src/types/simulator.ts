// Shapes the WhatsApp-style simulator works with. Plain JSON, so the server can
// pass them to client components as props.

/** What the simulator phone needs to know about a business. */
export type SimulatorBusiness = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  phone: string;
  timezone: string;
  currency: string;
  agentName: string;
  greeting: string;
  services: { name: string; price: number; durationMin: number; partySize: number | null }[];
  hours: { weekday: number; opensAt: string; closesAt: string }[];
};

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type ChatMessage = {
  id: string;
  /** Relative to the phone's owner, the customer: outgoing = sent by the customer. */
  direction: "incoming" | "outgoing";
  text: string;
  /** ISO instant. */
  sentAt: string;
  /** Delivery ticks; outgoing messages only. */
  status?: MessageStatus;
};
