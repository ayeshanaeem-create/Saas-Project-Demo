import { z } from "zod";

import { endCall, getSimulatorCustomer, startCall } from "@/lib/agent/conversations";
import { db } from "@/lib/db";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), slug: z.string().min(1).max(100) }),
  z.object({ action: z.literal("end"), slug: z.string().min(1).max(100), conversationId: z.string().min(1).max(100) }),
]);

/**
 * Starts or ends a simulator voice call. "start" creates the call's conversation and
 * returns its id, which every spoken turn then sends to /api/agent/chat; "end" records
 * when the caller hung up.
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const business = await db.business.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (!business) return Response.json({ error: "Unknown business." }, { status: 404 });
  const customer = await getSimulatorCustomer();

  if (parsed.data.action === "start") {
    const call = await startCall(business.id, customer.id);
    return Response.json({ conversationId: call.id });
  }

  const ended = await endCall({ businessId: business.id, customerId: customer.id, conversationId: parsed.data.conversationId });
  return ended ? Response.json({ ok: true }) : Response.json({ error: "Unknown call." }, { status: 404 });
}
