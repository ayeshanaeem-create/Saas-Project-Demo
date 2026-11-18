import "server-only";

import { loadAgentBusiness } from "@/lib/agent/business";
import { appendMessages, getOrCreateConversation, withConversationLock } from "@/lib/agent/conversations";
import { toChatMessages } from "@/lib/agent/history";
import type { RunAgentTurnInput } from "@/lib/agent/run-agent";
import { db } from "@/lib/db";

import { parseScriptState, runScript } from "./script";

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Roughly how long a person takes to type a reply, so the scripted agent feels human. */
export function typingDelayMs(reply: string): number {
  return Math.min(2200, 500 + reply.length * 12);
}

export type RunScriptedTurnInput = Omit<RunAgentTurnInput, "client"> & {
  /** Injectable so tests don't wait. */
  delay?: (ms: number) => Promise<void>;
};

/**
 * The scripted agent's version of runAgentTurn: same events, same saved history, no API.
 * Replies are stored as plain assistant text, so the conversation can later continue
 * with Claude.
 */
export async function runScriptedTurn(input: RunScriptedTurnInput): Promise<void> {
  const now = input.now ?? (() => new Date());
  const delay = input.delay ?? pause;
  const conversation = await getOrCreateConversation(input.businessId, input.customerId, input.channel);

  await withConversationLock(conversation.id, async () => {
    await appendMessages(
      conversation.id,
      input.texts.map((text) => ({ role: "user", content: [{ type: "text", text }], text })),
    );
    input.onEvent({ type: "accepted" });

    const [business, customer, current] = await Promise.all([
      loadAgentBusiness(input.businessId),
      db.customer.findUniqueOrThrow({ where: { id: input.customerId } }),
      db.conversation.findUniqueOrThrow({ where: { id: conversation.id }, select: { agentState: true } }),
    ]);

    await delay(400);
    input.onEvent({ type: "typing" });

    const outcome = await runScript({
      business,
      customer,
      state: parseScriptState(current.agentState),
      text: input.texts.join("\n"),
      now: now(),
    });

    for (const reply of outcome.replies) {
      await delay(typingDelayMs(reply));
      const [row] = await appendMessages(conversation.id, [
        { role: "assistant", content: [{ type: "text", text: reply }], text: reply },
      ]);
      const [bubble] = toChatMessages([row!]);
      if (bubble) input.onEvent({ type: "message", message: bubble });
    }

    await db.conversation.update({
      where: { id: conversation.id },
      data: { agentState: JSON.stringify(outcome.state), ...(outcome.handoff ? { status: "handoff" } : {}) },
    });
    input.onEvent({ type: "done" });
  });
}
