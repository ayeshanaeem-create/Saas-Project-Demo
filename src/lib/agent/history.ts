// Pure conversions between stored Message rows, the Anthropic API's message list and
// the simulator's chat bubbles. No database access here.

import type Anthropic from "@anthropic-ai/sdk";

import type { MessageRole } from "@/types/domain";
import type { ChatMessage } from "@/types/simulator";

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type ContentBlock = Anthropic.Beta.Messages.BetaContentBlock;

export type StoredMessage = {
  id: string;
  position: number;
  role: MessageRole;
  /** JSON: the API content exactly as sent or received. */
  content: string;
  text: string;
  createdAt: Date;
};

/**
 * The API message list for a conversation, replayed exactly as stored.
 * Consecutive user rows (several customer messages, or tool results followed by a new
 * customer message after a failed turn) merge into one user turn. The merge is
 * deterministic, so the replayed prefix stays identical turn after turn.
 */
export function toApiMessages(rows: StoredMessage[]): MessageParam[] {
  const messages: MessageParam[] = [];

  rows.forEach((row, i) => {
    const content: unknown = JSON.parse(row.content);

    if (row.role === "system") {
      // A system note is only valid right before an assistant turn (or at the end).
      // Our writes guarantee that; this guard only protects against a damaged history.
      const next = rows[i + 1];
      if (next && next.role !== "assistant") return;
      messages.push({ role: "system", content: content as string });
      return;
    }

    const blocks = (typeof content === "string" ? [{ type: "text", text: content }] : content) as Exclude<
      MessageParam["content"],
      string | undefined
    >;
    const previous = messages.at(-1);
    if (row.role === "user" && previous?.role === "user" && Array.isArray(previous.content)) {
      previous.content = [...previous.content, ...blocks] as typeof previous.content;
      return;
    }
    messages.push({ role: row.role, content: blocks } as MessageParam);
  });

  return messages;
}

/** Chat bubbles for the rows the customer sees: their own messages and the business's replies. */
export function toChatMessages(rows: StoredMessage[]): ChatMessage[] {
  return rows
    .filter((row) => row.text.trim() !== "" && row.role !== "system")
    .map((row) => ({
      id: row.id,
      direction: row.role === "user" ? "outgoing" : "incoming",
      text: row.text,
      sentAt: row.createdAt.toISOString(),
      ...(row.role === "user" ? { status: "read" as const } : {}),
    }));
}

/** The reply text in an assistant response: its text blocks, in order. */
export function replyText(content: ContentBlock[]): string {
  return content
    .flatMap((block) => (block.type === "text" ? [block.text.trim()] : []))
    .filter(Boolean)
    .join("\n\n");
}
