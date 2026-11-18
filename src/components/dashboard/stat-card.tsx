import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

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
  tone?: "default" | "attention";
}) {
  const attention = tone === "attention" && value > 0;
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4", attention && "border-amber-500/40 bg-amber-500/5")}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className={cn("size-4", attention && "text-amber-600 dark:text-amber-400")} aria-hidden />
      </div>
      <span className="font-heading text-3xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
