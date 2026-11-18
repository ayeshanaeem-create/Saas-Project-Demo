import "server-only";

import type { StoredMessage } from "@/lib/agent/history";
import { db } from "@/lib/db";
import { SIMULATOR_CUSTOMER_PHONE } from "@/lib/simulator/constants";
import { messageRoleSchema, type Channel, type MessageRole } from "@/types/domain";

/** The customer holding the simulator phone. Created if the seed data is missing it. */
export function getSimulatorCustomer() {
  return db.customer.upsert({
    where: { phone: SIMULATOR_CUSTOMER_PHONE },
    create: { phone: SIMULATOR_CUSTOMER_PHONE },
    update: {},
  });
}

/**
 * The customer's current (not closed) conversation with a business on a channel, or a new one.
 * Find-or-create runs in one transaction so two simultaneous first messages share a conversation.
 */
export async function getOrCreateConversation(businessId: string, customerId: string, channel: Channel) {
  return db.$transaction(async (tx) => {
    const existing = await tx.conversation.findFirst({
      where: { businessId, customerId, channel, status: { not: "closed" } },
      orderBy: { updatedAt: "desc" },
    });
    return existing ?? tx.conversation.create({ data: { businessId, customerId, channel } });
  });
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const rows = await db.message.findMany({ where: { conversationId }, orderBy: { position: "asc" } });
  return rows.map(toStored);
}

export type NewMessage = { role: MessageRole; content: unknown; text: string };

/** Appends rows after the conversation's last position, atomically. */
export async function appendMessages(conversationId: string, messages: NewMessage[]): Promise<StoredMessage[]> {
  return db.$transaction(async (tx) => {
    const last = await tx.message.findFirst({
      where: { conversationId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let position = (last?.position ?? -1) + 1;

    const saved: StoredMessage[] = [];
    for (const message of messages) {
      const row = await tx.message.create({
        data: {
          conversationId,
          position: position++,
          role: message.role,
          content: JSON.stringify(message.content),
          text: message.text,
        },
      });
      saved.push(toStored(row));
    }
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return saved;
  });
}

// One turn at a time per conversation, so concurrent requests can't interleave history.
// In-process only, which is enough for the single-server demo.
const conversationLocks = new Map<string, Promise<void>>();

export async function withConversationLock(conversationId: string, run: () => Promise<void>): Promise<void> {
  const previous = conversationLocks.get(conversationId) ?? Promise.resolve();
  const current = previous.then(run);
  const tail = current.catch(() => {});
  conversationLocks.set(conversationId, tail);
  try {
    await current;
  } finally {
    if (conversationLocks.get(conversationId) === tail) conversationLocks.delete(conversationId);
  }
}

function toStored(row: {
  id: string;
  position: number;
  role: string;
  content: string;
  text: string;
  createdAt: Date;
}): StoredMessage {
  return { ...row, role: messageRoleSchema.parse(row.role) };
}
