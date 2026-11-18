import type { BusinessCategory } from "../../src/types/domain";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type SeedService = {
  /** Local key that seed bookings use to refer to this service. Not stored. */
  key: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  capacity: number;
  partySize?: number;
};

export type SeedBooking = {
  /** Days from today in the business timezone (negative = past). */
  dayOffset: number;
  /** Local start time, "HH:mm". */
  time: string;
  service: string;
  customerPhone: string;
  partySize?: number;
  cancelled?: boolean;
  notes?: string;
};

export type SeedBusiness = {
  slug: string;
  name: string;
  emoji: string;
  category: BusinessCategory;
  tagline: string;
  address: string;
  phone: string;
  slotIntervalMin: number;
  hours: Partial<Record<Weekday, readonly [opensAt: string, closesAt: string]>>;
  services: SeedService[];
  persona: {
    agentName: string;
    tone: string;
    greeting: string;
    instructions: string;
  };
  bookings: SeedBooking[];
};

/** The same opening hours on each listed weekday. */
export function hoursOn(
  weekdays: Weekday[],
  opensAt: string,
  closesAt: string,
): SeedBusiness["hours"] {
  return Object.fromEntries(weekdays.map((day) => [day, [opensAt, closesAt] as const]));
}
