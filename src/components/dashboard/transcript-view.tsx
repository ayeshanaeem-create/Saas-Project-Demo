import { CircleAlert, CircleCheck, Clock, Wrench } from "lucide-react";

import { FormattedText } from "@/components/whatsapp/formatted-text";
import type { TranscriptItem } from "@/lib/dashboard/transcript";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  check_availability: "Checked availability",
  find_next_available: "Looked for the next free times",
  create_booking: "Created a booking",
  list_my_bookings: "Looked up the customer's bookings",
  reschedule_booking: "Rescheduled a booking",
  cancel_booking: "Cancelled a booking",
  request_human_handoff: "Asked for a person to take over",
};

/** The full conversation: customer messages left, agent replies right, agent tool use in between. */
export function TranscriptView({ items, timeZone }: { items: TranscriptItem[]; timeZone: string }) {
  const time = (at: string) => formatInZone(new Date(at), timeZone, "h:mm a");

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => {
        switch (item.kind) {
          case "customer":
          case "agent": {
            const agent = item.kind === "agent";
            return (
              <li key={item.id} className={cn("flex flex-col gap-1", agent ? "items-end" : "items-start")}>
                <span className="px-1 text-xs text-muted-foreground">
                  {agent ? "Agent" : "Customer"} · {time(item.at)}
                </span>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                    agent ? "rounded-tr-sm bg-tint" : "rounded-tl-sm bg-muted",
                  )}
                >
                  <FormattedText text={item.text} />
                </p>
              </li>
            );
          }

          case "tool_call":
            return (
              <li key={item.id} className="flex items-start gap-2 self-center text-xs text-muted-foreground">
                <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{TOOL_LABELS[item.name] ?? item.name}</span>
                  {Object.keys(item.input).length > 0 && (
                    <code className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono">
                      {Object.entries(item.input)
                        .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
                        .join(", ")}
                    </code>
                  )}
                </span>
              </li>
            );

          case "tool_result": {
            const Icon = item.failed ? CircleAlert : CircleCheck;
            return (
              <li key={item.id} className="self-center text-xs">
                <details className="group">
                  <summary
                    className={cn(
                      "flex cursor-pointer list-none items-start gap-2",
                      item.failed ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      {item.summary} <span className="underline-offset-2 group-open:hidden hover:underline">· details</span>
                    </span>
                  </summary>
                  <pre className="mt-2 max-h-64 max-w-[min(36rem,80vw)] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
                    {item.detail}
                  </pre>
                </details>
              </li>
            );
          }

          case "note":
            return (
              <li key={item.id} className="flex items-start gap-2 self-center text-xs text-muted-foreground/80">
                <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="whitespace-pre-wrap">{item.text}</span>
              </li>
            );
        }
      })}
    </ol>
  );
}
