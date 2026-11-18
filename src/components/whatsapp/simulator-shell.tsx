"use client";

import { ArrowLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { RouteAwareStatusBar, StatusBar } from "@/components/whatsapp/status-bar";
import { cn } from "@/lib/utils";

/**
 * The phone around the simulator. On small screens the simulator fills the viewport
 * like a real app; from `sm` up it sits in a phone frame with a light/dark toggle.
 * The toggle only themes the phone (the `dark` class is scoped to its wrapper).
 */
export function SimulatorShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-muted/50 sm:justify-center sm:gap-3 sm:px-4 sm:py-6">
      <div className="hidden w-[24.5rem] items-center justify-between sm:flex">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden />
          Businesses
        </Link>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          aria-pressed={dark}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <div className={cn("w-full sm:w-auto", dark && "dark")}>
        <div
          className={cn(
            "relative flex h-dvh w-full flex-col overflow-hidden bg-wa-surface font-wa",
            "sm:h-[min(52rem,calc(100dvh-6.5rem))] sm:w-[24.5rem] sm:rounded-[3rem] sm:border-[11px] sm:border-neutral-950 sm:shadow-2xl",
          )}
        >
          <Suspense fallback={<StatusBar className="hidden sm:flex" />}>
            <RouteAwareStatusBar className="hidden sm:flex" />
          </Suspense>
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>

      <p className="hidden text-xs text-muted-foreground sm:block">
        Simulated WhatsApp-style chat. No real WhatsApp messages are sent.
      </p>
    </div>
  );
}
