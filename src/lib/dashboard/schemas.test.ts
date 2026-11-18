import { describe, expect, it } from "vitest";

import {
  fieldErrorsOf,
  normalizePakistaniPhone,
  parseHoursForm,
  serviceFormSchema,
  staffBookingSchema,
} from "@/lib/dashboard/schemas";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("serviceFormSchema", () => {
  const valid = { name: "Haircut", description: "Cut", price: "1500", durationMin: "45", capacity: "2", partySize: "", isActive: "on" };

  it("coerces form strings", () => {
    expect(serviceFormSchema.parse(valid)).toEqual({
      name: "Haircut",
      description: "Cut",
      price: 1500,
      durationMin: 45,
      capacity: 2,
      partySize: null,
      isActive: true,
    });
    expect(serviceFormSchema.parse({ ...valid, isActive: undefined }).isActive).toBe(false);
  });

  it("explains bad values per field", () => {
    const result = serviceFormSchema.safeParse({ ...valid, name: "", price: "-5", durationMin: "40", capacity: "0" });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toEqual({
      name: "Give the service a name",
      price: "Price can't be negative",
      durationMin: "Use steps of 15 minutes",
      capacity: "At least 1",
    });
  });
});

describe("parseHoursForm", () => {
  it("reads open days and closed days", () => {
    const { data } = parseHoursForm(
      form({ slotIntervalMin: "30", "open-1": "on", "opens-1": "09:00", "closes-1": "17:00", "opens-2": "", "closes-2": "" }),
    );
    expect(data?.slotIntervalMin).toBe(30);
    expect(data?.days[1]).toEqual({ weekday: 1, open: true, opensAt: "09:00", closesAt: "17:00" });
    expect(data?.days[2]?.open).toBe(false);
  });

  it("rejects closing before opening and odd intervals", () => {
    const { fieldErrors } = parseHoursForm(form({ slotIntervalMin: "20", "open-3": "on", "opens-3": "18:00", "closes-3": "09:00" }));
    expect(fieldErrors).toEqual({ slotIntervalMin: "Choose 15, 30 or 60 minutes", "day-3": "Closing must be after opening" });
  });
});

describe("normalizePakistaniPhone", () => {
  it("accepts the usual ways of writing a number", () => {
    for (const input of ["0300 1234567", "+92 300 1234567", "92-300-1234567", "00923001234567", "3001234567"]) {
      expect(normalizePakistaniPhone(input)).toBe("+923001234567");
    }
    expect(normalizePakistaniPhone("042 3555 0101")).toBe("+924235550101");
  });

  it("rejects non-numbers", () => {
    expect(normalizePakistaniPhone("12345")).toBeNull();
    expect(normalizePakistaniPhone("call me")).toBeNull();
  });
});

describe("staffBookingSchema", () => {
  it("normalizes the phone and optional fields", () => {
    expect(
      staffBookingSchema.parse({
        serviceId: "s1",
        date: "2026-11-19",
        time: "17:00",
        customerName: " Hira Khan ",
        customerPhone: "0300 1110001",
        partySize: "",
        notes: "",
      }),
    ).toEqual({
      serviceId: "s1",
      date: "2026-11-19",
      time: "17:00",
      customerName: "Hira Khan",
      customerPhone: "+923001110001",
      partySize: null,
      notes: "",
    });
  });

  it("reports a bad phone number", () => {
    const result = staffBookingSchema.safeParse({ serviceId: "s1", date: "2026-11-19", time: "17:00", customerName: "Hira", customerPhone: "123" });
    expect(fieldErrorsOf(result.error!)).toEqual({ customerPhone: "Enter a Pakistani number, e.g. 0300 1234567" });
  });
});
