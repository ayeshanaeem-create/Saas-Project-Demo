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

/** A saved chat between the simulator customer and one business. */
export type SimulatorChat = {
  /** When the conversation began (ISO), which dates the business's greeting. */
  startedAt: string;
  messages: ChatMessage[];
};

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type ChatMessage = {
  id: string;
  /** Relative to the phone's owner, the customer: outgoing = sent by the customer. */
  direction: "incoming" | "outgoing";
  text: string;
  /** ISO instant. */
  sentAt: string;
  /** Delivery ticks; outgoing messages only. */
  status?: MessageStatus;
  /**
   * "notice": from the simulator itself (e.g. "the assistant couldn't reply"), a centred pill.
   * "call": a voice call the customer made, shown as a call bubble with its length.
   */
  kind?: "notice" | "call";
  /** Calls only: how long the call lasted. */
  durationSec?: number;
};
