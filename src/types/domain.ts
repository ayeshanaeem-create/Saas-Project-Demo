import { z } from "zod";

import { isValidIsoDate } from "@/lib/time";

// String-literal unions for the String columns in prisma/schema.prisma.
// Validate with these schemas wherever a DB value or external input enters typed code.

export const businessCategorySchema = z.enum(["salon", "dental", "restaurant", "fitness"]);
export type BusinessCategory = z.infer<typeof businessCategorySchema>;

export const channelSchema = z.enum(["chat", "voice"]);
export type Channel = z.infer<typeof channelSchema>;

export const conversationStatusSchema = z.enum(["open", "handoff", "closed"]);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const bookingStatusSchema = z.enum(["confirmed", "cancelled", "completed"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** `staff` covers bookings made outside the agent (dashboard, phone, walk-in, seed data). */
export const bookingSourceSchema = z.enum(["agent", "staff"]);
export type BookingSource = z.infer<typeof bookingSourceSchema>;

/** "HH:mm", 24-hour clock. */
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

/** "YYYY-MM-DD" calendar date in a business's timezone. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine(isValidIsoDate, "Not a real calendar date");
