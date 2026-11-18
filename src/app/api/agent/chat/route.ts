import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { agentMode, hasAnthropicCredentials } from "@/lib/agent/config";
import { getSimulatorCustomer } from "@/lib/agent/conversations";
import { runAgentTurn } from "@/lib/agent/run-agent";
import { runScriptedTurn } from "@/lib/agent/scripted/run-scripted";
import { db } from "@/lib/db";
import type { AgentEvent } from "@/types/agent-events";
import { channelSchema } from "@/types/domain";

const requestSchema = z
  .object({
    slug: z.string().min(1).max(100),
    texts: z.array(z.string().trim().min(1).max(2000)).min(1).max(20),
    channel: channelSchema.default("chat"),
    /** Voice turns name their call (from POST /api/agent/call). */
    conversationId: z.string().min(1).max(100).optional(),
  })
  .refine((body) => body.channel === "chat" || body.conversationId, {
    message: "Voice turns need the call's conversationId",
  });

/**
 * One customer turn in the simulator, answered by Claude or by the scripted agent (see
 * agentMode() in src/lib/agent/config.ts). Streams AgentEvents as newline-delimited JSON.
 * The turn keeps running if the browser disconnects, so a booking in progress still
 * completes and is saved; the simulator picks it up from the DB on its next load.
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const mode = agentMode();
  if (mode === "claude" && !hasAnthropicCredentials()) {
    return Response.json(
      {
        error:
          "AGENT_MODE is \"claude\" but no API key is set. Add ANTHROPIC_API_KEY to .env.local, or set AGENT_MODE=\"auto\" to use the scripted agent, then restart the dev server.",
      },
      { status: 503 },
    );
  }
  const runTurn = mode === "claude" ? runAgentTurn : runScriptedTurn;

  const business = await db.business.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (!business) return Response.json({ error: "Unknown business." }, { status: 404 });
  const customer = await getSimulatorCustomer();

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: AgentEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false; // the browser went away; keep working, stop writing
        }
      };

      try {
        await runTurn({
          businessId: business.id,
          customerId: customer.id,
          channel: parsed.data.channel,
          conversationId: parsed.data.conversationId,
          texts: parsed.data.texts,
          onEvent: send,
        });
      } catch (error) {
        console.error("[agent] turn failed", error);
        send({ type: "error", message: describeError(error) });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "This API key can't use the configured model. Check ANTHROPIC_MODEL in .env.local.";
  }
  if (error instanceof Anthropic.RateLimitError) return "The assistant is busy right now. Try again in a moment.";
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach the assistant. Check your internet connection.";
  return "The assistant couldn't reply. Please try again.";
}
