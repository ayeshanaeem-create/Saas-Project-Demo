import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { loadMessages } from "@/lib/agent/conversations";
import { buildTranscript, type TranscriptItem } from "@/lib/dashboard/transcript";
import { db } from "@/lib/db";
import { addDays, formatInZone, todayInZone, zonedDateTime } from "@/lib/time";
import {
  bookingSourceSchema,
  bookingStatusSchema,
  businessCategorySchema,
  channelSchema,
  conversationStatusSchema,
  type BookingSource,
  type BookingStatus,
  type BusinessCategory,
  type Channel,
  type ConversationStatus,
} from "@/types/domain";

// Read models for the owner dashboard. Everything is scoped to one business and returns
// plain JSON-friendly values, with local dates and times in the business timezone.

export type DashboardBusiness = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  category: BusinessCategory;
  tagline: string;
  timezone: string;
  currency: string;
  slotIntervalMin: number;
};

export type DashboardBooking = {
  id: string;
  serviceName: string;
  customerName: string | null;
  customerPhone: string;
  date: string;
  time: string;
  endTime: string;
  partySize: number | null;
  status: BookingStatus;
  source: BookingSource;
  notes: string | null;
  /** True while the booking can still be cancelled (confirmed and not started). */
  upcoming: boolean;
};

export type ConversationSummary = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  channel: Channel;
  status: ConversationStatus;
  updatedAt: string;
  lastMessage: string | null;
  lastFromCustomer: boolean;
  messageCount: number;
};

export async function listBusinesses() {
  return db.business.findMany({ orderBy: { createdAt: "asc" }, select: { slug: true, name: true, emoji: true } });
}

export async function getBusinessBySlug(slug: string): Promise<DashboardBusiness | null> {
  const business = await db.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      emoji: true,
      category: true,
      tagline: true,
      timezone: true,
      currency: true,
      slotIntervalMin: true,
    },
  });
  return business && { ...business, category: businessCategorySchema.parse(business.category) };
}

/** Bookings starting on `days` local days from `fromDate`, earliest first. */
export async function getBookingsBetween(
  business: DashboardBusiness,
  fromDate: string,
  days: number,
  now: Date = new Date(),
): Promise<DashboardBooking[]> {
  const rows = await db.booking.findMany({
    where: {
      businessId: business.id,
      startAt: {
        gte: zonedDateTime(fromDate, "00:00", business.timezone),
        lt: zonedDateTime(addDays(fromDate, days), "00:00", business.timezone),
      },
    },
    include: bookingInclude,
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((b) => toDashboardBooking(b, business, now));
}

/** The agent's most recently made bookings (any date), newest first. */
export async function getRecentAgentBookings(
  business: DashboardBusiness,
  limit: number,
  now: Date = new Date(),
): Promise<DashboardBooking[]> {
  const rows = await db.booking.findMany({
    where: { businessId: business.id, source: "agent" },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((b) => toDashboardBooking(b, business, now));
}

const bookingInclude = {
  service: { select: { name: true } },
  customer: { select: { name: true, phone: true } },
} as const;

function toDashboardBooking(
  b: Prisma.BookingGetPayload<{ include: typeof bookingInclude }>,
  business: DashboardBusiness,
  now: Date,
): DashboardBooking {
  const status = bookingStatusSchema.parse(b.status);
  return {
    id: b.id,
    serviceName: b.service.name,
    customerName: b.customer.name,
    customerPhone: b.customer.phone,
    date: formatInZone(b.startAt, business.timezone, "yyyy-MM-dd"),
    time: formatInZone(b.startAt, business.timezone, "HH:mm"),
    endTime: formatInZone(b.endAt, business.timezone, "HH:mm"),
    partySize: b.partySize,
    status,
    source: bookingSourceSchema.parse(b.source),
    notes: b.notes,
    upcoming: status === "confirmed" && b.startAt > now,
  };
}

export async function getOverview(business: DashboardBusiness, now: Date = new Date()) {
  const today = todayInZone(business.timezone, now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [todays, next7Count, agentThisWeek, handoffs, recent] = await Promise.all([
    getBookingsBetween(business, today, 1, now),
    db.booking.count({
      where: {
        businessId: business.id,
        status: "confirmed",
        startAt: { gte: now, lt: zonedDateTime(addDays(today, 7), "00:00", business.timezone) },
      },
    }),
    db.booking.count({ where: { businessId: business.id, source: "agent", createdAt: { gte: weekAgo } } }),
    db.conversation.count({ where: { businessId: business.id, status: "handoff" } }),
    getConversations(business, { limit: 5 }),
  ]);

  return {
    today,
    todaysBookings: todays.filter((b) => b.status !== "cancelled"),
    stats: { today: todays.filter((b) => b.status !== "cancelled").length, next7Count, agentThisWeek, handoffs },
    recentConversations: recent,
  };
}

/** Conversations with this business, most recently active first. */
export async function getConversations(
  business: DashboardBusiness,
  options: { limit?: number; id?: string } = {},
): Promise<ConversationSummary[]> {
  const rows = await db.conversation.findMany({
    where: { businessId: business.id, ...(options.id ? { id: options.id } : {}) },
    orderBy: { updatedAt: "desc" },
    take: options.limit,
    include: {
      customer: { select: { name: true, phone: true } },
      messages: { where: { text: { not: "" } }, orderBy: { position: "desc" }, take: 1, select: { text: true, role: true } },
      _count: { select: { messages: { where: { text: { not: "" } } } } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    customerName: c.customer.name,
    customerPhone: c.customer.phone,
    channel: channelSchema.parse(c.channel),
    status: conversationStatusSchema.parse(c.status),
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.messages[0]?.text ?? null,
    lastFromCustomer: c.messages[0]?.role === "user",
    messageCount: c._count.messages,
  }));
}

export async function getConversationDetail(
  business: DashboardBusiness,
  conversationId: string,
): Promise<{ summary: ConversationSummary; transcript: TranscriptItem[] } | null> {
  const [summary] = await getConversations(business, { id: conversationId });
  if (!summary) return null;
  return { summary, transcript: buildTranscript(await loadMessages(summary.id)) };
}

export async function getServicesAndHours(business: DashboardBusiness) {
  const [services, hours] = await Promise.all([
    db.service.findMany({ where: { businessId: business.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.workingHours.findMany({ where: { businessId: business.id }, orderBy: { weekday: "asc" } }),
  ]);
  return {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMin: s.durationMin,
      capacity: s.capacity,
      partySize: s.partySize,
      isActive: s.isActive,
    })),
    hours: hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })),
  };
}

export async function getPersona(business: DashboardBusiness) {
  const persona = await db.agentPersona.findUnique({ where: { businessId: business.id } });
  return {
    agentName: persona?.agentName ?? "",
    tone: persona?.tone ?? "",
    greeting: persona?.greeting ?? "",
    instructions: persona?.instructions ?? "",
  };
}
