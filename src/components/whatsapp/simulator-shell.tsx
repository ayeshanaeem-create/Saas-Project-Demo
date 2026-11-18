"use client";

import { ArrowLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { createContext, Suspense, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { RouteAwareStatusBar, StatusBar } from "@/components/whatsapp/status-bar";
import { cn } from "@/lib/utils";

type SimulatorTheme = { dark: boolean; toggleDark: () => void };

const SimulatorThemeContext = createContext<SimulatorTheme | null>(null);

/** The phone's light/dark state, for controls inside the phone screen (the chat list on phones). */
export function useSimulatorTheme(): SimulatorTheme {
  const theme = useContext(SimulatorThemeContext);
  if (!theme) throw new Error("useSimulatorTheme must be used inside SimulatorShell");
  return theme;
}

const noSubscribe = () => () => {};

/** Positions of the phone frame's side buttons (px, like the frame itself). */
const PHONE_BUTTONS = [
  "top-[120px] -left-[3px] h-8 rounded-l-sm",
  "top-[172px] -left-[3px] h-14 rounded-l-sm",
  "top-[240px] -left-[3px] h-14 rounded-l-sm",
  "top-[196px] -right-[3px] h-20 rounded-r-sm",
] as const;

/** True inside the live demo's iframe. Assumed true while server-rendering, so nothing flashes there. */
export function useEmbedded(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => window.self !== window.top,
    () => true,
  );
}

/**
 * The phone around the simulator. On small screens the simulator fills the viewport
 * like a real app (the chat list then carries the theme toggle and the way out); from
 * `sm` up it sits in a phone frame with those controls above it.
 * The toggle only themes the phone (the `dark` class is scoped to its wrapper).
 */
export function SimulatorShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const theme = useMemo(() => ({ dark, toggleDark: () => setDark((d) => !d) }), [dark]);

  return (
    <SimulatorThemeContext value={theme}>
      <div className="flex min-h-dvh flex-col items-center bg-muted/50 sm:justify-center sm:gap-3 sm:px-4 sm:py-6">
        <div className="hidden w-[392px] items-center justify-between sm:flex">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft aria-hidden />
            Businesses
          </Link>
          <button
            type="button"
            onClick={theme.toggleDark}
            aria-pressed={dark}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <div className={cn("relative w-full sm:w-auto", dark && "dark")}>
          {/* Side buttons, outside the frame (phone-frame sizes only): action, volume up/down, power. */}
          {PHONE_BUTTONS.map((button) => (
            <span key={button} aria-hidden className={cn("absolute hidden w-[3px] bg-neutral-800 sm:block", button)} />
          ))}
          <div
            className={cn(
              "relative flex h-dvh w-full flex-col overflow-hidden bg-wa-surface font-wa",
              "sm:h-[min(832px,calc(100dvh-6.5rem))] sm:w-[392px] sm:rounded-[48px] sm:border-[11px] sm:border-neutral-950 sm:shadow-2xl sm:ring-1 sm:ring-neutral-700",
            )}
          >
            <Suspense fallback={<StatusBar className="hidden sm:flex" />}>
              <RouteAwareStatusBar className="hidden sm:flex" />
            </Suspense>
            <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
            {/* Home indicator (phone-frame sizes only); the composer leaves room for it. */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-1/2 hidden h-[5px] w-32 -translate-x-1/2 rounded-full bg-neutral-500/70 sm:block"
            />
          </div>
        </div>

        <p className="hidden text-xs text-muted-foreground sm:block">
          Simulated WhatsApp-style chat. No real WhatsApp messages are sent.
        </p>
      </div>
    </SimulatorThemeContext>
  );
}
