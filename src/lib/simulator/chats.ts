import "server-only";

import { getSimulatorCustomer } from "@/lib/agent/conversations";
import { toChatMessages } from "@/lib/agent/history";
import { db } from "@/lib/db";
import { messageRoleSchema } from "@/types/domain";
import type { ChatMessage, SimulatorChat } from "@/types/simulator";

/**
 * The simulator customer's saved chat with each business, keyed by business slug, with
 * their voice calls to that business shown as call bubbles.
 */
export async function getSimulatorChats(): Promise<Record<string, SimulatorChat>> {
  const customer = await getSimulatorCustomer();
  const [conversations, calls] = await Promise.all([
    db.conversation.findMany({
      where: { customerId: customer.id, channel: "chat", status: { not: "closed" } },
      orderBy: { updatedAt: "desc" },
      include: { business: { select: { slug: true } }, messages: { orderBy: { position: "asc" } } },
    }),
    db.conversation.findMany({
      where: { customerId: customer.id, channel: "voice" },
      orderBy: { createdAt: "asc" },
      include: {
        business: { select: { slug: true } },
        messages: { orderBy: { position: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  const chats: Record<string, SimulatorChat> = {};
  for (const conversation of conversations) {
    const slug = conversation.business.slug;
    if (chats[slug]) continue; // keep the most recent conversation per business
    chats[slug] = {
      startedAt: conversation.createdAt.toISOString(),
      messages: toChatMessages(conversation.messages.map((m) => ({ ...m, role: messageRoleSchema.parse(m.role) }))),
    };
  }

  for (const call of calls) {
    const slug = call.business.slug;
    // A call that was never hung up properly lasted until its last message.
    const end = call.endedAt ?? call.messages[0]?.createdAt ?? call.createdAt;
    const bubble: ChatMessage = {
      id: `call-${call.id}`,
      direction: "outgoing",
      kind: "call",
      text: "Voice call",
      sentAt: call.createdAt.toISOString(),
      durationSec: Math.max(0, Math.round((end.getTime() - call.createdAt.getTime()) / 1000)),
    };
    const chat = (chats[slug] ??= { startedAt: call.createdAt.toISOString(), messages: [] });
    chat.messages.push(bubble);
  }

  for (const chat of Object.values(chats)) chat.messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  return chats;
}
