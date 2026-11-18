import "server-only";

import type { AgentBusiness } from "@/lib/agent/system-prompt";
import { db } from "@/lib/db";

/** A business as both agents (Claude and scripted) see it: active services with ids, hours, persona. */
export type LoadedBusiness = Omit<AgentBusiness, "services"> & {
  id: string;
  services: (AgentBusiness["services"][number] & { id: string })[];
};

export async function loadAgentBusiness(businessId: string): Promise<LoadedBusiness> {
  const b = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      workingHours: true,
      persona: true,
    },
  });
  return {
    id: b.id,
    name: b.name,
    tagline: b.tagline,
    address: b.address,
    phone: b.phone,
    timezone: b.timezone,
    currency: b.currency,
    slotIntervalMin: b.slotIntervalMin,
    services: b.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMin: s.durationMin,
      partySize: s.partySize,
    })),
    hours: b.workingHours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })),
    persona: b.persona ?? {
      agentName: "the assistant",
      tone: "Friendly and concise.",
      greeting: `Hello! Thanks for contacting ${b.name}.`,
      instructions: "No special rules.",
    },
  };
}
