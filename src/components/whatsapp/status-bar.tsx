"use client";

import { BatteryFull, Signal, Wifi } from "lucide-react";
import { usePathname } from "next/navigation";

import { useClientNow } from "@/hooks/use-now";
import { SIMULATOR_TIMEZONE } from "@/lib/simulator/constants";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * The status bar, dark on the (always dark) call screen. Reading the URL makes this a
 * runtime component, so render it inside <Suspense> with a plain <StatusBar> as fallback.
 */
export function RouteAwareStatusBar({ className }: { className?: string }) {
  const onCall = usePathname().endsWith("/call");
  return <StatusBar className={className} onCall={onCall} />;
}

/** Fake phone status bar for the desktop phone frame. */
export function StatusBar({ className, onCall = false }: { className?: string; onCall?: boolean }) {
  const now = useClientNow();

  return (
    <div
      className={cn(
        "relative h-10 shrink-0 items-center justify-between px-7 text-[14px] font-semibold",
        onCall ? "dark bg-wa-chat text-wa-text" : "bg-wa-bar text-wa-bar-text",
        className,
      )}
    >
      <time className="min-w-10 tabular-nums">
        {now ? formatInZone(now, SIMULATOR_TIMEZONE, "h:mm") : ""}
      </time>
      <span aria-hidden className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-neutral-950" />
      <span aria-hidden className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
}
