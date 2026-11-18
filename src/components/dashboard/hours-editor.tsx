"use client";

import { useMemo, useState } from "react";

import { saveHoursAction } from "@/app/dashboard/[slug]/actions";
import { FormMessage, NativeSelect } from "@/components/dashboard/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFormAction } from "@/hooks/use-form-action";
import { SLOT_INTERVALS } from "@/lib/dashboard/schemas";
import { cn } from "@/lib/utils";

const WEEK = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;

type Hours = { weekday: number; opensAt: string; closesAt: string };

export function HoursEditor({ slug, hours, slotIntervalMin }: { slug: string; hours: Hours[]; slotIntervalMin: number }) {
  const action = useMemo(() => saveHoursAction.bind(null, slug), [slug]);
  const { state, pending, onSubmit } = useFormAction(action);
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(WEEK.map(([weekday]) => [weekday, hours.some((h) => h.weekday === weekday)])),
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <ul className="flex flex-col divide-y">
        {WEEK.map(([weekday, name]) => {
          const current = hours.find((h) => h.weekday === weekday);
          const isOpen = open[weekday] ?? false;
          return (
            <li key={weekday} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-36 cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input type="hidden" name={`open-${weekday}`} value={isOpen ? "on" : ""} />
                  <Switch checked={isOpen} onCheckedChange={(checked) => setOpen((o) => ({ ...o, [weekday]: checked }))} aria-label={`Open on ${name}`} />
                  {name}
                </label>
                {/* On phones the times get their own full-width row; a closed day hides them
                    (still submitted) instead of leaving an empty row. */}
                <div
                  className={cn(
                    "flex w-full items-center gap-2 text-sm sm:w-auto",
                    !isOpen && "invisible max-sm:hidden",
                  )}
                >
                  <Input
                    name={`opens-${weekday}`}
                    type="time"
                    step={900}
                    defaultValue={current?.opensAt ?? "09:00"}
                    aria-label={`${name} opening time`}
                    className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    name={`closes-${weekday}`}
                    type="time"
                    step={900}
                    defaultValue={current?.closesAt ?? "18:00"}
                    aria-label={`${name} closing time`}
                    className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                  />
                </div>
                {!isOpen && <span className="text-sm text-muted-foreground">Closed</span>}
              </div>
              {errors[`day-${weekday}`] && <p className="text-xs text-destructive sm:pl-[10.5rem]">{errors[`day-${weekday}`]}</p>}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Label htmlFor="slotIntervalMin">Bookings start every</Label>
        <NativeSelect id="slotIntervalMin" name="slotIntervalMin" defaultValue={slotIntervalMin} className="w-32">
          {SLOT_INTERVALS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex items-center justify-between gap-4">
        <FormMessage state={state} />
        <Button type="submit" disabled={pending} className="ml-auto">
          {pending ? "Saving…" : "Save hours"}
        </Button>
      </div>
    </form>
  );
}
