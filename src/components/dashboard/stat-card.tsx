import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One number on the overview. `brand` fills the card with the brand gradient (for the stat
 * that shows off the agent); `attention` turns amber while its value is above zero.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "brand" | "attention";
}) {
  const attention = tone === "attention" && value > 0;
  const brand = tone === "brand";
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        attention && "border-amber-500/40 bg-amber-50",
        brand &&
          "border-transparent bg-linear-135 from-brand-from to-brand-to text-white shadow-[0_12px_28px_-14px_var(--primary-glow)]",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2 text-sm font-semibold", brand ? "text-white" : "text-muted-foreground")}>
        <span>{label}</span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            brand ? "bg-white/20 text-white" : attention ? "bg-amber-500/15 text-amber-700" : "bg-tint text-primary",
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <span className={cn("font-heading text-4xl leading-none font-bold tabular-nums", brand ? "text-white" : "text-heading")}>
        {value}
      </span>
      {hint && <span className={cn("text-xs", brand ? "text-white" : "text-muted-foreground")}>{hint}</span>}
    </div>
  );
}
