import type { ChatMessage } from "@/types/simulator";

/**
 * Events streamed by POST /api/agent/chat as newline-delimited JSON, in this order:
 * accepted → typing → message* → done. `error` can replace any event after `accepted`.
 */
export type AgentEvent =
  /** The customer's messages are saved. */
  | { type: "accepted" }
  /** The agent has read the messages and is working on a reply. */
  | { type: "typing" }
  /** One complete reply bubble from the business. A turn can send several. */
  | { type: "message"; message: ChatMessage }
  | { type: "done" }
  /** `message` is safe to show in the simulator. */
  | { type: "error"; message: string };

/** Body of POST /api/agent/chat. */
export type AgentChatRequest = {
  slug: string;
  /** The customer's messages since the last request, oldest first. */
  texts: string[];
};
