"use client";

import { Send } from "lucide-react";

import { DEMO_PHONE_ID } from "@/lib/demo/constants";
import type { Scenario } from "@/lib/demo/scenarios";

/** Suggested messages. A click sends one into the embedded simulator, as if typed on the phone. */
export function ScenarioButtons({ slug, scenarios }: { slug: string; scenarios: Scenario[] }) {
  function sendToPhone(text: string) {
    const phone = document.getElementById(DEMO_PHONE_ID) as HTMLIFrameElement | null;
    phone?.contentWindow?.postMessage({ type: "bookmate:say", slug, text }, window.location.origin);
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
