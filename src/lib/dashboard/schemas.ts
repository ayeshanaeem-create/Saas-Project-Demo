// Validation for the owner dashboard's forms. Server Actions parse FormData with these;
// the same rules are unit-tested in schemas.test.ts.

import { z } from "zod";

import { clockTimeSchema, isoDateSchema } from "@/types/domain";

/** What a dashboard form's Server Action returns to useActionState. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Nearby open times ("HH:mm") when a booking time wasn't available. */
  alternatives?: string[];
};

export const idleForm: FormState = { status: "idle" };

const blankToNull = (value: unknown) => (value === "" || value === undefined ? null : value);
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Give the service a name").max(60),
  description: z.string().trim().max(300).default(""),
  price: z.coerce.number().int("Use whole rupees").min(0, "Price can't be negative").max(1_000_000),
  durationMin: z.coerce
    .number()
    .int()
    .min(15, "At least 15 minutes")
    .max(480, "At most 8 hours")
    .refine((m) => m % 15 === 0, "Use steps of 15 minutes"),
  capacity: z.coerce.number().int().min(1, "At least 1").max(50),
  partySize: z.preprocess(blankToNull, z.coerce.number().int().min(1).max(50).nullable()),
  isActive: checkbox,
});
export type ServiceForm = z.infer<typeof serviceFormSchema>;

export const personaFormSchema = z.object({
  agentName: z.string().trim().min(1, "Give the agent a name").max(40),
  tone: z.string().trim().max(300),
  greeting: z.string().trim().min(1, "Write a greeting").max(500),
  instructions: z.string().trim().max(2000),
});
export type PersonaForm = z.infer<typeof personaFormSchema>;

export const SLOT_INTERVALS = [15, 30, 60] as const;

export type HoursForm = {
  slotIntervalMin: (typeof SLOT_INTERVALS)[number];
  days: { weekday: number; open: boolean; opensAt: string; closesAt: string }[];
};

/** Reads the hours form: per weekday `open-N`, `opens-N`, `closes-N`, plus `slotIntervalMin`. */
export function parseHoursForm(form: FormData): { data?: HoursForm; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const interval = Number(form.get("slotIntervalMin"));
  if (!SLOT_INTERVALS.includes(interval as HoursForm["slotIntervalMin"])) {
    fieldErrors.slotIntervalMin = "Choose 15, 30 or 60 minutes";
  }

  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const open = form.get(`open-${weekday}`) === "on";
    const opensAt = String(form.get(`opens-${weekday}`) ?? "");
    const closesAt = String(form.get(`closes-${weekday}`) ?? "");
    if (open) {
      if (!clockTimeSchema.safeParse(opensAt).success || !clockTimeSchema.safeParse(closesAt).success) {
        fieldErrors[`day-${weekday}`] = "Enter both times";
      } else if (closesAt <= opensAt) {
        fieldErrors[`day-${weekday}`] = "Closing must be after opening";
      }
    }
    return { weekday, open, opensAt, closesAt };
  });

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { data: { slotIntervalMin: interval as HoursForm["slotIntervalMin"], days } };
}

/**
 * Normalizes a Pakistani phone number to E.164: "0300 1234567", "92-300-1234567" and
 * "+92 300 1234567" all become "+923001234567". Returns null if it isn't one.
 */
export function normalizePakistaniPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+92")) national = digits.slice(3);
  else if (digits.startsWith("0092")) national = digits.slice(4);
  else if (digits.startsWith("92") && digits.length >= 11) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  return /^\d{9,10}$/.test(national) ? `+92${national}` : null;
}

export const staffBookingSchema = z.object({
  serviceId: z.string().min(1, "Choose a service"),
  date: isoDateSchema,
  time: clockTimeSchema,
  customerName: z.string().trim().min(2, "Enter the customer's name").max(60),
  customerPhone: z
    .string()
    .transform((value, ctx) => {
      const phone = normalizePakistaniPhone(value);
      if (!phone) ctx.addIssue({ code: "custom", message: "Enter a Pakistani number, e.g. 0300 1234567" });
      return phone ?? "";
    }),
  partySize: z.preprocess(blankToNull, z.coerce.number().int().min(1).max(50).nullable()),
  notes: z.string().trim().max(200).default(""),
});
export type StaffBookingForm = z.infer<typeof staffBookingSchema>;

/** First error message per field, for showing under inputs. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** FormData as a plain object (string values only), ready for a zod schema. */
export function formObject(form: FormData): Record<string, string> {
  const object: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") object[key] = value;
  return object;
}
