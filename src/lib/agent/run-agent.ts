import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import {
  AGENT_EFFORT,
  AGENT_MAX_TOKENS,
  AGENT_MODEL,
  MAX_TOOL_ROUNDS,
  anthropic,
  refusalFallbackParams,
} from "@/lib/agent/config";
import { loadAgentBusiness } from "@/lib/agent/business";
import {
  appendMessages,
  conversationForTurn,
  loadMessages,
  withConversationLock,
  type NewMessage,
} from "@/lib/agent/conversations";
import { replyText, toApiMessages, toChatMessages } from "@/lib/agent/history";
import { buildSystemPrompt, buildTurnNote } from "@/lib/agent/system-prompt";
import { createAgentTools } from "@/lib/agent/tools";
import { db } from "@/lib/db";
import type { AgentEvent } from "@/types/agent-events";
import type { Channel } from "@/types/domain";

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type ToolUseBlock = Anthropic.Beta.Messages.BetaToolUseBlock;
type ToolResultBlockParam = Anthropic.Beta.Messages.BetaToolResultBlockParam;

const REFUSAL_REPLY = "Sorry, I can't help with that here. I'm happy to help with bookings or questions about us.";

export type RunAgentTurnInput = {
  businessId: string;
  customerId: string;
  channel: Channel;
  /** Required for voice turns: the call's conversation. Chat turns use the current chat. */
  conversationId?: string;
  /** The customer's new messages, oldest first. */
  texts: string[];
  onEvent: (event: AgentEvent) => void;
  /** Injectable for tests. */
  client?: Anthropic;
  now?: () => Date;
};

/**
 * Runs one customer turn: saves the customer's messages, calls Claude with the booking
 * tools until it finishes, saves every step and emits each reply bubble as it is ready.
 *
 * History rules (see CLAUDE.md): rows are append-only and replayed verbatim. The turn's
 * system note is saved together with the first assistant response, and a tool-using
 * response is saved together with its tool results, so a failure at any point leaves a
 * history the API will still accept.
 */
export async function runAgentTurn(input: RunAgentTurnInput): Promise<void> {
  const client = input.client ?? anthropic();
  const now = input.now ?? (() => new Date());
  const conversation = await conversationForTurn(input);

  await withConversationLock(conversation.id, async () => {
    await appendMessages(
      conversation.id,
      input.texts.map((text) => ({ role: "user", content: [{ type: "text", text }], text })),
    );
    input.onEvent({ type: "accepted" });
    input.onEvent({ type: "typing" });

    const business = await loadAgentBusiness(input.businessId);
    const customer = await db.customer.findUniqueOrThrow({ where: { id: input.customerId } });
    const tools = createAgentTools({
      businessId: input.businessId,
      customerId: input.customerId,
      conversationId: conversation.id,
      timeZone: business.timezone,
      services: business.services,
      now,
    });

    const note = buildTurnNote({ now: now(), timeZone: business.timezone, customer });
    let pendingNote: NewMessage | null = { role: "system", content: note, text: "" };
    const messages: MessageParam[] = [
      ...toApiMessages(await loadMessages(conversation.id)),
      { role: "system", content: note },
    ];
    const system = buildSystemPrompt(business, input.channel);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages
        .stream({
          model: AGENT_MODEL,
          max_tokens: AGENT_MAX_TOKENS,
          system,
          tools: tools.definitions,
          messages,
          output_config: { effort: AGENT_EFFORT },
          cache_control: { type: "ephemeral" },
          ...refusalFallbackParams(AGENT_MODEL),
        })
        .finalMessage();

      const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
      const refused = response.stop_reason === "refusal";
      const text = replyText(response.content) || (refused ? REFUSAL_REPLY : "");
      const assistant: NewMessage = { role: "assistant", content: response.content, text };
      messages.push({ role: "assistant", content: response.content });

      // A refusal can cut a tool call off mid-input, so never run that turn's tools.
      if (response.stop_reason !== "tool_use" || toolUses.length === 0 || refused) {
        const saved = await appendMessages(conversation.id, [...(pendingNote ? [pendingNote] : []), assistant]);
        emitReply(saved.at(-1)!, input.onEvent);
        input.onEvent({ type: "done" });
        return;
      }

      const results: ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (use) => {
          const outcome = await tools.run(use.name, use.input);
          return {
            type: "tool_result" as const,
            tool_use_id: use.id,
            content: outcome.content,
            ...(outcome.isError ? { is_error: true } : {}),
          };
        }),
      );
      // All results for one response go back in a single user message.
      const saved = await appendMessages(conversation.id, [
        ...(pendingNote ? [pendingNote] : []),
        assistant,
        { role: "user", content: results, text: "" },
      ]);
      pendingNote = null;
      emitReply(saved.at(-2)!, input.onEvent);
      messages.push({ role: "user", content: results });
    }

    console.error(`[agent] conversation ${conversation.id} hit ${MAX_TOOL_ROUNDS} tool rounds without finishing`);
    input.onEvent({ type: "error", message: "The assistant got stuck on that one. Please try rephrasing." });
  });
}

function emitReply(row: Parameters<typeof toChatMessages>[0][number], onEvent: (event: AgentEvent) => void) {
  const [bubble] = toChatMessages([row]);
  if (bubble) onEvent({ type: "message", message: bubble });
}
