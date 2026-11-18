"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createStaffBookingAction } from "@/app/dashboard/[slug]/actions";
import { Field, FormMessage, NativeSelect } from "@/components/dashboard/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { clockToMinutes, formatClockTime, minutesToClock, weekdayOf } from "@/lib/time";

type Props = {
  slug: string;
  services: { id: string; name: string; partySize: number | null }[];
  hours: { weekday: number; opensAt: string; closesAt: string }[];
  slotIntervalMin: number;
  today: string;
};

/** Staff booking form for walk-ins and phone calls. The booking engine has the final say on the time. */
export function NewBookingDialog(props: Props) {
  const [open, setOpen] = useState(false);
  // A new key per opening gives a fresh, empty form.
  const [formKey, setFormKey] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden />
        New booking
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>For walk-ins and phone calls. It shows as a staff booking.</DialogDescription>
        </DialogHeader>
        <BookingForm key={formKey} {...props} onDone={close} />
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({ slug, services, hours, slotIntervalMin, today, onDone }: Props & { onDone: () => void }) {
  const action = useMemo(() => createStaffBookingAction.bind(null, slug), [slug]);
  const { state, pending, onSubmit } = useFormAction(action);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const service = services.find((s) => s.id === serviceId);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  const dayHours = hours.find((h) => h.weekday === weekdayOf(date));
  const times: string[] = [];
  if (dayHours) {
    for (let m = clockToMinutes(dayHours.opensAt); m < clockToMinutes(dayHours.closesAt); m += slotIntervalMin) {
      times.push(minutesToClock(m));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service" htmlFor="serviceId" error={errors.serviceId} className="sm:col-span-2">
          <NativeSelect id="serviceId" name="serviceId" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Date" htmlFor="date" error={errors.date}>
          <Input id="date" name="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>

        <Field label="Time" htmlFor="time" error={errors.time} hint={dayHours ? undefined : "Closed that day"}>
          <NativeSelect id="time" name="time" disabled={!dayHours} required>
            {times.map((t) => (
              <option key={t} value={t}>
                {formatClockTime(t)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {service?.partySize != null && (
          <Field label="Party size" htmlFor="partySize" error={errors.partySize} hint={`This table seats up to ${service.partySize}`}>
            <Input id="partySize" name="partySize" type="number" min={1} max={service.partySize} defaultValue={service.partySize} required />
          </Field>
        )}

        <Field label="Customer name" htmlFor="customerName" error={errors.customerName}>
          <Input id="customerName" name="customerName" autoComplete="off" required aria-invalid={Boolean(errors.customerName)} />
        </Field>
        <Field label="Phone" htmlFor="customerPhone" error={errors.customerPhone}>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            placeholder="0300 1234567"
            required
            aria-invalid={Boolean(errors.customerPhone)}
          />
        </Field>

        <Field label="Notes (optional)" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} maxLength={200} />
        </Field>
      </div>

      <FormMessage state={state} />

      <DialogFooter>
        <Button type="submit" disabled={pending || !dayHours}>
          {pending ? "Booking…" : "Book"}
        </Button>
      </DialogFooter>
    </form>
  );
}
