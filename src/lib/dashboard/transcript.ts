// Turns stored conversation rows into a readable transcript for the owner dashboard:
// customer and agent messages, plus each tool the Claude agent called and what it got
// back. Thinking blocks are skipped (their text is never returned by the API anyway).

import type { StoredMessage } from "@/lib/agent/history";

export type TranscriptItem =
  | { kind: "customer" | "agent"; id: string; text: string; at: string }
  | { kind: "tool_call"; id: string; name: string; input: Record<string, unknown>; at: string }
  | { kind: "tool_result"; id: string; tool: string; summary: string; detail: string; failed: boolean; at: string }
  | { kind: "note"; id: string; text: string; at: string };

type Block = { type?: string; text?: unknown; id?: unknown; name?: unknown; input?: unknown; tool_use_id?: unknown; content?: unknown; is_error?: unknown };

export function buildTranscript(rows: StoredMessage[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  const toolNames = new Map<string, string>();

  for (const row of rows) {
    const at = row.createdAt.toISOString();
    const content: unknown = JSON.parse(row.content);

    if (row.role === "system") {
      if (typeof content === "string") items.push({ kind: "note", id: row.id, text: content, at });
      continue;
    }

    const blocks: Block[] = typeof content === "string" ? [{ type: "text", text: content }] : (content as Block[]);
    blocks.forEach((block, i) => {
      const id = `${row.id}:${i}`;
      if (block.type === "text" && typeof block.text === "string" && block.text.trim()) {
        items.push({ kind: row.role === "user" ? "customer" : "agent", id, text: block.text.trim(), at });
      } else if (block.type === "tool_use" && typeof block.name === "string") {
        toolNames.set(String(block.id), block.name);
        const input = block.input && typeof block.input === "object" ? (block.input as Record<string, unknown>) : {};
        items.push({ kind: "tool_call", id, name: block.name, input, at });
      } else if (block.type === "tool_result") {
        const tool = toolNames.get(String(block.tool_use_id)) ?? "tool";
        const raw = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
        const { summary, failed } = summarizeResult(tool, raw, block.is_error === true);
        items.push({ kind: "tool_result", id, tool, summary, detail: pretty(raw), failed, at });
      }
    });
  }

  return items;
}

/** One line describing what a tool returned. */
export function summarizeResult(tool: string, raw: string, isError: boolean): { summary: string; failed: boolean } {
  if (isError) return { summary: raw, failed: true };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { summary: raw, failed: false };
  }

  if (data.ok === false) return { summary: String(data.message ?? data.error ?? "Failed"), failed: true };

  if (Array.isArray(data.available_times)) {
    const times = data.available_times as string[];
    if (data.open === false) return { summary: `Closed on ${String(data.weekday)}`, failed: false };
    return {
      summary: times.length
        ? `${times.length} open ${times.length === 1 ? "time" : "times"} on ${String(data.weekday)} (${times[0]}–${times.at(-1)})`
        : `Fully booked on ${String(data.weekday)}`,
      failed: false,
    };
  }
  if (Array.isArray(data.next_available)) {
    const next = data.next_available as { weekday: string; time: string }[];
    return {
      summary: next.length ? `Next free: ${next.map((n) => `${n.weekday} ${n.time}`).join(", ")}` : "Nothing free soon",
      failed: false,
    };
  }
  if (data.booking && typeof data.booking === "object") {
    const b = data.booking as { service?: string; when?: string; status?: string };
    const verb = { create_booking: "Booked", reschedule_booking: "Moved", cancel_booking: "Cancelled" }[tool] ?? "Updated";
    return { summary: `${verb}: ${b.service} · ${b.when}`, failed: false };
  }
  if (Array.isArray(data.bookings)) {
    const n = data.bookings.length;
    return { summary: n ? `${n} upcoming ${n === 1 ? "booking" : "bookings"}` : "No upcoming bookings", failed: false };
  }
  if (typeof data.note === "string") return { summary: data.note, failed: false };
  return { summary: raw.length > 120 ? `${raw.slice(0, 117)}…` : raw, failed: false };
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
