import { describe, expect, it } from "vitest";

import { readNdjson } from "@/lib/simulator/ndjson";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readNdjson", () => {
  it("parses lines split across chunks", async () => {
    const values: unknown[] = [];
    await readNdjson(streamOf(['{"type":"acc', 'epted"}\n{"type":"typing"}\n{"ty', 'pe":"done"}\n']), (v) =>
      values.push(v),
    );
    expect(values).toEqual([{ type: "accepted" }, { type: "typing" }, { type: "done" }]);
  });

  it("handles a final line without a newline and skips blank lines", async () => {
    const values: unknown[] = [];
    await readNdjson(streamOf(['{"a":1}\n\n', '{"b":2}']), (v) => values.push(v));
    expect(values).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode('{"text":"✨"}\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 10));
        controller.enqueue(bytes.slice(10));
        controller.close();
      },
    });
    const values: unknown[] = [];
    await readNdjson(body, (v) => values.push(v));
    expect(values).toEqual([{ text: "✨" }]);
  });
});
