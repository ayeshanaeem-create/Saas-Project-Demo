import "server-only";

import { db } from "@/lib/db";
import { addDays, todayInZone, weekdayOf, zonedDateTime } from "@/lib/time";
import { businessCategorySchema } from "@/types/domain";
import type { SimulatorBusiness } from "@/types/simulator";

/** Every business, shaped for the simulator phone (plain JSON for client components). */
export async function getSimulatorBusinesses(): Promise<SimulatorBusiness[]> {
  const businesses = await db.business.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      workingHours: { orderBy: { weekday: "asc" } },
      persona: true,
    },
  });

  return businesses.map((b) => ({
    slug: b.slug,
    name: b.name,
    emoji: b.emoji,
    tagline: b.tagline,
    phone: b.phone,
    timezone: b.timezone,
    currency: b.currency,
    agentName: b.persona?.agentName ?? b.name,
    greeting: b.persona?.greeting ?? `Hello! Thanks for contacting ${b.name}. How can we help?`,
    services: b.services.map((s) => ({
      name: s.name,
      price: s.price,
      durationMin: s.durationMin,
      partySize: s.partySize,
    })),
    hours: b.workingHours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })),
  }));
}

export type BusinessSummary = Awaited<ReturnType<typeof getBusinessSummaries>>[number];

/** Every business with its services, persona, today's hours and booking counts. */
export async function getBusinessSummaries(now: Date = new Date()) {
  const businesses = await db.business.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      workingHours: true,
      persona: true,
    },
  });

  return Promise.all(
    businesses.map(async ({ workingHours, ...business }) => {
      const today = todayInZone(business.timezone, now);
      const dayStart = zonedDateTime(today, "00:00", business.timezone);
      const dayEnd = zonedDateTime(addDays(today, 1), "00:00", business.timezone);

      const [bookingsToday, upcomingBookings] = await Promise.all([
        db.booking.count({
          where: { businessId: business.id, status: { not: "cancelled" }, startAt: { gte: dayStart, lt: dayEnd } },
        }),
        db.booking.count({
          where: { businessId: business.id, status: "confirmed", startAt: { gte: now } },
        }),
      ]);

      return {
        ...business,
        category: businessCategorySchema.parse(business.category),
        hoursToday: workingHours.find((h) => h.weekday === weekdayOf(today)) ?? null,
        bookingsToday,
        upcomingBookings,
      };
    }),
  );
}
