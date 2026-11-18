"use server";

import { refresh } from "next/cache";

import { cancelBooking, createBooking } from "@/lib/booking/bookings";
import { BookingError } from "@/lib/booking/errors";
import {
  fieldErrorsOf,
  formObject,
  parseHoursForm,
  personaFormSchema,
  serviceFormSchema,
  staffBookingSchema,
  type FormState,
} from "@/lib/dashboard/schemas";
import { db } from "@/lib/db";
import { formatClockTime, formatInZone, zonedDateTime } from "@/lib/time";

// Owner dashboard mutations. Each action is bound to a business slug by its form and
// only ever touches that business's rows. Bookings go through the booking engine, like
// the agents' bookings do. There's no login in this demo; see CLAUDE.md.

async function businessFor(slug: string) {
  const business = await db.business.findUnique({ where: { slug }, select: { id: true, name: true, timezone: true } });
  if (!business) throw new Error(`Unknown business "${slug}"`);
  return business;
}

const failed = (message: string, fieldErrors?: Record<string, string>): FormState => ({
  status: "error",
  message,
  fieldErrors,
});

export async function createStaffBookingAction(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = staffBookingSchema.safeParse(formObject(form));
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const input = parsed.data;
  const business = await businessFor(slug);

  // Walk-in and phone customers are matched by number; the name staff typed wins.
  const customer = await db.customer.upsert({
    where: { phone: input.customerPhone },
    create: { phone: input.customerPhone, name: input.customerName },
    update: { name: input.customerName },
  });

  try {
    const booking = await createBooking({
      businessId: business.id,
      serviceId: input.serviceId,
      customerId: customer.id,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      notes: input.notes || null,
      source: "staff",
    });
    refresh();
    const day = formatInZone(zonedDateTime(booking.date, "12:00", business.timezone), business.timezone, "EEEE d MMMM");
    return {
      status: "success",
      message: `Booked ${booking.serviceName} for ${input.customerName} on ${day} at ${formatClockTime(booking.time)}.`,
    };
  } catch (error) {
    if (error instanceof BookingError) return { status: "error", message: error.message, alternatives: error.alternatives };
    throw error;
  }
}

export async function cancelBookingAction(slug: string, bookingId: string): Promise<FormState> {
  const business = await businessFor(slug);
  try {
    await cancelBooking({ businessId: business.id, bookingId });
  } catch (error) {
    if (error instanceof BookingError) return failed(error.message);
    throw error;
  }
  refresh();
  return { status: "success", message: "Booking cancelled." };
}

/** Creates a service when `serviceId` is null, otherwise updates it. */
export async function saveServiceAction(
  slug: string,
  serviceId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = serviceFormSchema.safeParse(formObject(form));
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const business = await businessFor(slug);

  if (serviceId) {
    const { count } = await db.service.updateMany({ where: { id: serviceId, businessId: business.id }, data: parsed.data });
    if (count === 0) return failed("That service no longer exists.");
  } else {
    const last = await db.service.findFirst({ where: { businessId: business.id }, orderBy: { sortOrder: "desc" } });
    await db.service.create({ data: { ...parsed.data, businessId: business.id, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }
  refresh();
  return { status: "success", message: serviceId ? "Saved." : `Added ${parsed.data.name}.` };
}

export async function saveHoursAction(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { data, fieldErrors } = parseHoursForm(form);
  if (!data) return failed("Check the highlighted days.", fieldErrors);
  const business = await businessFor(slug);

  await db.$transaction([
    db.business.update({ where: { id: business.id }, data: { slotIntervalMin: data.slotIntervalMin } }),
    db.workingHours.deleteMany({ where: { businessId: business.id } }),
    db.workingHours.createMany({
      data: data.days
        .filter((d) => d.open)
        .map((d) => ({ businessId: business.id, weekday: d.weekday, opensAt: d.opensAt, closesAt: d.closesAt })),
    }),
  ]);
  refresh();
  return { status: "success", message: "Opening hours saved. Existing bookings are unchanged." };
}

export async function savePersonaAction(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = personaFormSchema.safeParse(formObject(form));
  if (!parsed.success) return failed("Check the highlighted fields.", fieldErrorsOf(parsed.error));
  const business = await businessFor(slug);

  await db.agentPersona.upsert({
    where: { businessId: business.id },
    create: { ...parsed.data, businessId: business.id },
    update: parsed.data,
  });
  refresh();
  return { status: "success", message: "Saved. The agent uses this from the next message." };
}

/** Marks a handed-off conversation as dealt with, so it leaves the "needs attention" count. */
export async function resolveHandoffAction(slug: string, conversationId: string): Promise<FormState> {
  const business = await businessFor(slug);
  await db.conversation.updateMany({
    where: { id: conversationId, businessId: business.id, status: "handoff" },
    data: { status: "open" },
  });
  refresh();
  return { status: "success", message: "Marked as resolved." };
}
