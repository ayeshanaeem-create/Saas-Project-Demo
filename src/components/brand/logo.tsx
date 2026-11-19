import { MessageCircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** The brand mark: a gradient tile with a chat bubble and tick, matching the app icon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-linear-135 from-brand-from to-brand-to text-white shadow-[0_6px_14px_-6px_var(--primary-glow)]",
        className,
      )}
    >
      <MessageCircleCheck className="size-5" strokeWidth={2.4} />
    </span>
  );
}

/**
 * Mark plus "BookMate AI" wordmark. Put it inside a link. `suffix` adds a quiet label after
 * it, hidden on phone-sized screens so the header still fits on one line.
 */
export function Logo({ suffix, className }: { suffix?: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-lg leading-none font-extrabold tracking-tight whitespace-nowrap text-heading">
        BookMate <span className="text-primary">AI</span>
        {suffix && (
          <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-muted-foreground max-sm:hidden">· {suffix}</span>
        )}
      </span>
    </span>
  );
}
