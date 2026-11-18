// Puts the database in the demo state: four businesses, fictional customers and bookings
// placed relative to today. Used by `npm run db:seed` and by the "Reset demo" button.
// Not server-only: the seed script runs it outside Next.js.

import type { PrismaClient } from "@/generated/prisma/client";
import { addDays, clockToMinutes, todayInZone, weekdayOf, zonedDateTime } from "@/lib/time";
import type { BookingStatus } from "@/types/domain";

import { DEMO_CUSTOMER_PHONE, customers } from "./seed-data/customers";
import { seedBusinesses } from "./seed-data/index";
import type { SeedBusiness, Weekday } from "./seed-data/types";

const TIMEZONE = "Asia/Karachi";

export type SeedSummary = {
  emoji: string;
  name: string;
  services: number;
  bookings: number;
  /** Seed bookings left out because they'd fall on a closed day or outside opening hours. */
  skipped: string[];
};

/** Deletes everything and recreates the demo data. */
export async function seedDemo(prisma: PrismaClient, now: Date = new Date()): Promise<SeedSummary[]> {
  // Children before parents.
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.agentPersona.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.service.deleteMany(),
    prisma.business.deleteMany(),
    prisma.customer.deleteMany(),
  ]);

  const customerIdByPhone = new Map<string, string>();
  for (const { phone, name } of [{ phone: DEMO_CUSTOMER_PHONE, name: null }, ...Object.values(customers)]) {
    const customer = await prisma.customer.create({ data: { phone, name } });
    customerIdByPhone.set(phone, customer.id);
  }

  const summaries: SeedSummary[] = [];
  for (const seed of seedBusinesses) {
    const { created, skipped } = await seedBusiness(prisma, seed, customerIdByPhone, now);
    summaries.push({ emoji: seed.emoji, name: seed.name, services: seed.services.length, bookings: created, skipped });
  }
  return summaries;
}

async function seedBusiness(
  prisma: PrismaClient,
  seed: SeedBusiness,
  customerIdByPhone: Map<string, string>,
  now: Date,
) {
  const business = await prisma.business.create({
    data: {
      slug: seed.slug,
      name: seed.name,
      emoji: seed.emoji,
      category: seed.category,
      tagline: seed.tagline,
      address: seed.address,
      phone: seed.phone,
      timezone: TIMEZONE,
      currency: "PKR",
      slotIntervalMin: seed.slotIntervalMin,
      services: {
        create: seed.services.map((service, index) => ({
          name: service.name,
          description: service.description,
          price: service.price,
          durationMin: service.durationMin,
          capacity: service.capacity,
          partySize: service.partySize ?? null,
          sortOrder: index,
        })),
      },
      workingHours: {
        create: Object.entries(seed.hours).map(([weekday, [opensAt, closesAt]]) => ({
          weekday: Number(weekday),
          opensAt,
          closesAt,
        })),
      },
      persona: { create: seed.persona },
    },
    include: { services: true },
  });

  const serviceByKey = new Map(
    seed.services.map((s) => {
      const row = business.services.find((created) => created.name === s.name);
      if (!row) throw new Error(`Service "${s.name}" was not created for ${seed.name}`);
      return [s.key, { id: row.id, durationMin: s.durationMin }] as const;
    }),
  );

  const today = todayInZone(TIMEZONE, now);
  let created = 0;
  const skipped: string[] = [];

  for (const booking of seed.bookings) {
    const service = serviceByKey.get(booking.service);
    if (!service) throw new Error(`${seed.name}: unknown service key "${booking.service}"`);
    const customerId = customerIdByPhone.get(booking.customerPhone);
    if (!customerId) throw new Error(`${seed.name}: unknown customer ${booking.customerPhone}`);

    // Bookings are placed relative to today, so some land on a closed day or
    // outside that day's hours. Skip those rather than seed impossible bookings.
    const date = addDays(today, booking.dayOffset);
    const hours = seed.hours[weekdayOf(date) as Weekday];
    const startMin = clockToMinutes(booking.time);
    if (!hours || startMin < clockToMinutes(hours[0]) || startMin + service.durationMin > clockToMinutes(hours[1])) {
      skipped.push(`${booking.service} ${date} ${booking.time}`);
      continue;
    }

    const startAt = zonedDateTime(date, booking.time, TIMEZONE);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
    const status: BookingStatus = booking.cancelled ? "cancelled" : endAt <= now ? "completed" : "confirmed";

    await prisma.booking.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        customerId,
        startAt,
        endAt,
        partySize: booking.partySize ?? null,
        status,
        source: "staff",
        notes: booking.notes ?? null,
      },
    });
    created++;
  }

  return { created, skipped };
}
