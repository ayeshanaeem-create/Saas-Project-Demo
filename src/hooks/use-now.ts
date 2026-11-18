"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 15_000);
  return () => clearInterval(timer);
}

// Rounded to the minute so the snapshot stays stable between ticks.
const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * The current time, updated every minute. On the server and during hydration it
 * returns `serverNow`, so server-rendered times match the first client render.
 */
export function useNow(serverNow: number): Date {
  const now = useSyncExternalStore(subscribe, getSnapshot, () => serverNow);
  return new Date(now);
}

/**
 * Like useNow, but null until the component is running in the browser. For UI in a
 * statically prerendered shell, which has no request time to render with.
 */
export function useClientNow(): Date | null {
  const now = useSyncExternalStore<number | null>(subscribe, getSnapshot, () => null);
  return now === null ? null : new Date(now);
}
