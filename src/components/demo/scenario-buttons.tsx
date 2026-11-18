"use client";

import { Send } from "lucide-react";

import { DEMO_PHONE_ID } from "@/lib/demo/constants";
import type { Scenario } from "@/lib/demo/scenarios";

/**
 * Suggested messages. A click sends one into the embedded simulator, as if typed on the phone.
 * `list` is the numbered column beside the phone; `chips` is a swipeable row for phones,
 * shown right above the simulator so each reply stays in view.
 */
export function ScenarioButtons({
  slug,
  scenarios,
  layout = "list",
}: {
  slug: string;
  scenarios: Scenario[];
  layout?: "list" | "chips";
}) {
  function sendToPhone(text: string) {
    const phone = document.getElementById(DEMO_PHONE_ID) as HTMLIFrameElement | null;
    phone?.contentWindow?.postMessage({ type: "bookmate:say", slug, text }, window.location.origin);
  }

  if (layout === "chips") {
    return (
      <ol className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {scenarios.map((s, i) => (
          <li key={`${i}-${s.message}`} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => sendToPhone(s.message)}
              className="flex max-w-60 cursor-pointer flex-col items-start gap-0.5 rounded-xl border bg-card px-3 py-2 text-left text-sm transition-colors active:border-emerald-500/50 active:bg-emerald-500/5"
            >
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {i + 1}. {s.label}
              </span>
              <span className="max-w-full truncate">“{s.message}”</span>
            </button>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {scenarios.map((s, i) => (
        <li key={`${i}-${s.message}`}>
          <button
            type="button"
            onClick={() => sendToPhone(s.message)}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">{s.label}</span>
              <span className="block truncate">“{s.message}”</span>
            </span>
            <Send className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </button>
        </li>
      ))}
    </ol>
  );
}
