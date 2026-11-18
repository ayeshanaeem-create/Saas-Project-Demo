import "server-only";

import { getSimulatorCustomer } from "@/lib/agent/conversations";
import { toChatMessages } from "@/lib/agent/history";
import { db } from "@/lib/db";
import { messageRoleSchema } from "@/types/domain";
import type { SimulatorChat } from "@/types/simulator";

/** The simulator customer's saved chat with each business, keyed by business slug. */
export async function getSimulatorChats(): Promise<Record<string, SimulatorChat>> {
  const customer = await getSimulatorCustomer();
  const conversations = await db.conversation.findMany({
    where: { customerId: customer.id, channel: "chat", status: { not: "closed" } },
    orderBy: { updatedAt: "desc" },
    include: { business: { select: { slug: true } }, messages: { orderBy: { position: "asc" } } },
  });

  const chats: Record<string, SimulatorChat> = {};
  for (const conversation of conversations) {
    const slug = conversation.business.slug;
    if (chats[slug]) continue; // keep the most recent conversation per business
    chats[slug] = {
      startedAt: conversation.createdAt.toISOString(),
      messages: toChatMessages(conversation.messages.map((m) => ({ ...m, role: messageRoleSchema.parse(m.role) }))),
    };
  }
  return chats;
}
