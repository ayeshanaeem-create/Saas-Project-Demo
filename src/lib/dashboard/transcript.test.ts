import { describe, expect, it } from "vitest";

import type { StoredMessage } from "@/lib/agent/history";
import { buildTranscript, summarizeResult } from "@/lib/dashboard/transcript";

let n = 0;
const row = (role: StoredMessage["role"], content: unknown, text = ""): StoredMessage => ({
  id: `r${n}`,
  position: n++,
  role,
  content: JSON.stringify(content),
  text,
  createdAt: new Date(Date.UTC(2026, 10, 18, 9, n)),
});

describe("buildTranscript", () => {
  it("shows messages, tool calls with results, and notes; skips thinking", () => {
    const items = buildTranscript([
      row("user", [{ type: "text", text: "Haircut tomorrow?" }], "Haircut tomorrow?"),
      row("system", "Current time: Wednesday…"),
      row("assistant", [
        { type: "thinking", thinking: "", signature: "s" },
        { type: "tool_use", id: "t1", name: "check_availability", input: { service: "Haircut", date: "2026-11-19" } },
      ]),
      row("user", [
        {
          type: "tool_result",
          tool_use_id: "t1",
          content: JSON.stringify({ weekday: "Thursday", open: true, available_times: ["11:00", "11:30", "20:00"] }),
        },
      ]),
      row("assistant", [{ type: "text", text: "Yes! 11 AM is free." }], "Yes! 11 AM is free."),
    ]);

    expect(items.map((i) => i.kind)).toEqual(["customer", "note", "tool_call", "tool_result", "agent"]);
    expect(items[2]).toMatchObject({ name: "check_availability", input: { service: "Haircut", date: "2026-11-19" } });
    expect(items[3]).toMatchObject({
      tool: "check_availability",
      summary: "3 open times on Thursday (11:00–20:00)",
      failed: false,
    });
  });

  it("handles scripted-agent rows, which are plain text", () => {
    const items = buildTranscript([
      row("user", [{ type: "text", text: "hi" }], "hi"),
      row("assistant", [{ type: "text", text: "Hello!" }], "Hello!"),
    ]);
    expect(items.map((i) => [i.kind, "text" in i ? i.text : ""])).toEqual([
      ["customer", "hi"],
      ["agent", "Hello!"],
    ]);
  });
});

describe("summarizeResult", () => {
  it("describes each tool's result in one line", () => {
    expect(summarizeResult("create_booking", JSON.stringify({ ok: true, booking: { service: "Facial", when: "Friday 20 November, 3:00 PM to 4:00 PM" } }), false)).toEqual({
      summary: "Booked: Facial · Friday 20 November, 3:00 PM to 4:00 PM",
      failed: false,
    });
    expect(summarizeResult("cancel_booking", JSON.stringify({ ok: true, booking: { service: "Facial", when: "x" } }), false).summary).toBe(
      "Cancelled: Facial · x",
    );
    expect(summarizeResult("list_my_bookings", JSON.stringify({ bookings: [] }), false).summary).toBe("No upcoming bookings");
    expect(summarizeResult("check_availability", JSON.stringify({ weekday: "Monday", open: false, available_times: [] }), false).summary).toBe(
      "Closed on Monday",
    );
  });

  it("flags booking problems and tool errors", () => {
    expect(summarizeResult("create_booking", JSON.stringify({ ok: false, error: "FULL", message: "Fully booked." }), false)).toEqual({
      summary: "Fully booked.",
      failed: true,
    });
    expect(summarizeResult("x", "Invalid input for x", true)).toEqual({ summary: "Invalid input for x", failed: true });
  });
});
