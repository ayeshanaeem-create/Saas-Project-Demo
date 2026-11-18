import { describe, expect, it } from "vitest";

import { refusalFallbackParams } from "@/lib/agent/config";

describe("refusalFallbackParams", () => {
  it("turns on the server-side fallback for models that support it", () => {
    expect(refusalFallbackParams("claude-opus-5-5")).toEqual({
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    expect(refusalFallbackParams("claude-sonnet-5-5")).toMatchObject({ fallbacks: "default" });
  });

  it("sends nothing for Haiku 5.5, which has no server-side fallback", () => {
    expect(refusalFallbackParams("claude-haiku-5-5")).toEqual({});
  });
});
