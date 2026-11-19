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
              className="flex max-w-60 cursor-pointer flex-col items-start gap-0.5 rounded-xl border-2 border-primary/25 bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors active:border-primary active:bg-tint"
            >
              <span className="text-xs font-bold text-primary tabular-nums">
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
            className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-card px-3 py-2.5 text-left text-sm shadow-sm ring-1 ring-border transition-all hover:-translate-y-px hover:border-primary/60 hover:bg-tint hover:shadow-md hover:ring-transparent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-135 from-brand-from to-brand-to text-xs font-bold text-white tabular-nums shadow-[0_4px_10px_-4px_var(--primary-glow)]">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-primary">{s.label}</span>
              <span className="block truncate font-medium">“{s.message}”</span>
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Send className="size-4" aria-hidden />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
