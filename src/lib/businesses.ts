import "server-only";

import { db } from "@/lib/db";
import { addDays, todayInZone, weekdayOf, zonedDateTime } from "@/lib/time";
import { businessCategorySchema } from "@/types/domain";

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
