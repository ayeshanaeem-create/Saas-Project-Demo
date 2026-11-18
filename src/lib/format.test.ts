import { describe, expect, it } from "vitest";

import { formatDuration, formatPhone, formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats rupees without decimals and says Free for zero", () => {
    expect(formatPrice(45000, "PKR")).toMatch(/^Rs\s45,000$/);
    expect(formatPrice(0, "PKR")).toBe("Free");
  });
});

describe("formatDuration", () => {
  it("uses hours and minutes", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
  });
});

describe("formatPhone", () => {
  it("formats Pakistani mobile and landline numbers", () => {
    expect(formatPhone("+923000000000")).toBe("+92 300 0000000");
    expect(formatPhone("+924235550101")).toBe("+92 42 3555 0101");
  });

  it("leaves other numbers alone", () => {
    expect(formatPhone("+14155550100")).toBe("+14155550100");
  });
});
