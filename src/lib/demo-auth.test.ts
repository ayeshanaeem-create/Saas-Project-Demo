import { describe, expect, it } from "vitest";

import { isAuthorized } from "@/lib/demo-auth";

const basic = (user: string, password: string) =>
  `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${password}`)))}`;

describe("isAuthorized", () => {
  it("accepts the right password with any username", () => {
    expect(isAuthorized(basic("demo", "s3cret"), "s3cret")).toBe(true);
    expect(isAuthorized(basic("", "s3cret"), "s3cret")).toBe(true);
  });

  it("handles passwords with colons and non-ASCII characters", () => {
    expect(isAuthorized(basic("x", "a:b:c"), "a:b:c")).toBe(true);
    expect(isAuthorized(basic("x", "pässwörd✨"), "pässwörd✨")).toBe(true);
  });

  it("rejects wrong, missing or malformed credentials", () => {
    expect(isAuthorized(basic("demo", "nope"), "s3cret")).toBe(false);
    expect(isAuthorized(basic("demo", "s3cret!"), "s3cret")).toBe(false);
    expect(isAuthorized(null, "s3cret")).toBe(false);
    expect(isAuthorized("Bearer abc", "s3cret")).toBe(false);
    expect(isAuthorized("Basic !!!not-base64!!!", "s3cret")).toBe(false);
  });
});
