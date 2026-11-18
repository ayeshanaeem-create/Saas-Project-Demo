import { describe, expect, it } from "vitest";

import { replyText, toApiMessages, toChatMessages, type StoredMessage } from "@/lib/agent/history";

let position = 0;
const row = (role: StoredMessage["role"], content: unknown, text = ""): StoredMessage => ({
  id: `m${position}`,
  position: position++,
  role,
  content: JSON.stringify(content),
  text,
  createdAt: new Date(Date.UTC(2026, 10, 18, 9, position)),
});
const userText = (text: string) => row("user", [{ type: "text", text }], text);

describe("toApiMessages", () => {
  it("replays a turn with a system note and tool use verbatim", () => {
    const assistantWithTool = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "tool_use", id: "t1", name: "check_availability", input: { service: "Haircut", date: "2026-11-19" } },
    ];
    const toolResult = [{ type: "tool_result", tool_use_id: "t1", content: '{"available_times":["11:00"]}' }];
    const rows = [
      userText("Haircut tomorrow?"),
      row("system", "Current time: …"),
      row("assistant", assistantWithTool),
      row("user", toolResult),
      row("assistant", [{ type: "text", text: "Yes, 11 AM is free." }], "Yes, 11 AM is free."),
    ];

    expect(toApiMessages(rows)).toEqual([
      { role: "user", content: [{ type: "text", text: "Haircut tomorrow?" }] },
      { role: "system", content: "Current time: …" },
      { role: "assistant", content: assistantWithTool },
      { role: "user", content: toolResult },
      { role: "assistant", content: [{ type: "text", text: "Yes, 11 AM is free." }] },
    ]);
  });

  it("merges consecutive user rows into one turn", () => {
    const messages = toApiMessages([userText("hi"), userText("I need a table"), row("system", "note")]);
    expect(messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "hi" },
          { type: "text", text: "I need a table" },
        ],
      },
      { role: "system", content: "note" },
    ]);
  });

  it("keeps tool results first when a new message follows a failed turn", () => {
    const toolResult = [{ type: "tool_result", tool_use_id: "t1", content: "{}" }];
    const [, merged] = toApiMessages([
      row("assistant", [{ type: "tool_use", id: "t1", name: "list_my_bookings", input: {} }]),
      row("user", toolResult),
      userText("hello?"),
    ]);
    expect(merged).toEqual({ role: "user", content: [...toolResult, { type: "text", text: "hello?" }] });
  });

  it("drops a system note that isn't followed by an assistant turn", () => {
    expect(toApiMessages([userText("a"), row("system", "stale"), userText("b")])).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    ]);
  });
});

describe("toChatMessages", () => {
  it("shows customer messages and replies, and hides tool traffic and notes", () => {
    const rows = [
      userText("Haircut tomorrow?"),
      row("system", "note"),
      row("assistant", [{ type: "tool_use", id: "t1", name: "x", input: {} }]),
      row("user", [{ type: "tool_result", tool_use_id: "t1", content: "{}" }]),
      row("assistant", [{ type: "text", text: "Sure!" }], "Sure!"),
    ];
    const bubbles = toChatMessages(rows);
    expect(bubbles.map((b) => [b.direction, b.text, b.status])).toEqual([
      ["outgoing", "Haircut tomorrow?", "read"],
      ["incoming", "Sure!", undefined],
    ]);
    expect(bubbles[1]?.sentAt).toBe(rows[4]?.createdAt.toISOString());
  });
});

describe("replyText", () => {
  it("joins text blocks and ignores thinking and tool use", () => {
    expect(
      replyText([
        { type: "thinking", thinking: "", signature: "s" },
        { type: "text", text: "One.", citations: null },
        { type: "tool_use", id: "t", name: "x", input: {}, caller: { type: "direct" } },
        { type: "text", text: " Two. ", citations: null },
      ] as never),
    ).toBe("One.\n\nTwo.");
  });
});
