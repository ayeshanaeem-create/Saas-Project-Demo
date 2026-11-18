import { describe, expect, it } from "vitest";

import { parseWhatsAppFormatting as parse, stripWhatsAppFormatting as strip } from "@/lib/whatsapp-format";

const text = (t: string) => ({ type: "text", text: t });

describe("parseWhatsAppFormatting", () => {
  it("leaves plain text alone", () => {
    expect(parse("Hello there")).toEqual([text("Hello there")]);
    expect(parse("")).toEqual([]);
  });

  it("parses bold, italic and strikethrough", () => {
    expect(parse("a *b* c")).toEqual([text("a "), { type: "bold", children: [text("b")] }, text(" c")]);
    expect(parse("_soon_")).toEqual([{ type: "italic", children: [text("soon")] }]);
    expect(parse("~Rs 2,000~ Rs 1,500")).toEqual([
      { type: "strike", children: [text("Rs 2,000")] },
      text(" Rs 1,500"),
    ]);
  });

  it("parses monospace blocks, including newlines", () => {
    expect(parse("```line 1\nline 2```")).toEqual([{ type: "code", text: "line 1\nline 2" }]);
  });

  it("supports nesting", () => {
    expect(parse("*_both_*")).toEqual([
      { type: "bold", children: [{ type: "italic", children: [text("both")] }] },
    ]);
  });

  it("ignores markers inside words or not hugging text", () => {
    expect(parse("2*3*4")).toEqual([text("2*3*4")]);
    expect(parse("snake_case_name")).toEqual([text("snake_case_name")]);
    expect(parse("a * b * c")).toEqual([text("a * b * c")]);
    expect(parse("*unclosed")).toEqual([text("*unclosed")]);
  });

  it("allows punctuation right after a closing marker", () => {
    expect(parse("*Haircut*, please.")).toEqual([
      { type: "bold", children: [text("Haircut")] },
      text(", please."),
    ]);
  });

  it("does not span lines for inline styles", () => {
    expect(parse("*a\nb*")).toEqual([text("*a\nb*")]);
  });
});

describe("stripWhatsAppFormatting", () => {
  it("removes markers but keeps the words", () => {
    expect(strip("Book a *Haircut* for _tomorrow_?")).toBe("Book a Haircut for tomorrow?");
  });
});
