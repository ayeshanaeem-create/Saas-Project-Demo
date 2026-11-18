import { CircleCheck, CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/dashboard/schemas";
import { formatClockTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** A labelled form control with its validation message. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** A native <select> styled like the shadcn Input; dependable inside Server Action forms. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

/** The result line under a form: success, or the error with any alternative times. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const ok = state.status === "success";
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <p role={ok ? "status" : "alert"} className={cn("flex items-start gap-1.5 text-sm", ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {state.message}
        {state.alternatives && state.alternatives.length > 0 && (
          <> Nearby free times: {state.alternatives.map(formatClockTime).join(", ")}.</>
        )}
      </span>
    </p>
  );
}
