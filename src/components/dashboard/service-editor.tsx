"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { saveServiceAction } from "@/app/dashboard/[slug]/actions";
import { Field, FormMessage } from "@/components/dashboard/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

export type EditableService = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  capacity: number;
  partySize: number | null;
  isActive: boolean;
};

const BLANK: Omit<EditableService, "id"> = {
  name: "",
  description: "",
  price: 0,
  durationMin: 60,
  capacity: 1,
  partySize: null,
  isActive: true,
};

/** Edits one service, or adds a new one when `service` is omitted. */
export function ServiceEditor({ slug, service, tables }: { slug: string; service?: EditableService; tables: boolean }) {
  const action = useMemo(() => saveServiceAction.bind(null, slug, service?.id ?? null), [slug, service?.id]);
  const { state, pending, onSubmit } = useFormAction(action);
  const values = service ?? BLANK;
  const [active, setActive] = useState(values.isActive);
  const errors = state.fieldErrors ?? {};
  const id = (field: string) => `${service?.id ?? "new"}-${field}`;
  const formRef = useRef<HTMLFormElement>(null);

  // After adding a service, clear the "new service" form for the next one.
  useEffect(() => {
    if (!service && state.status === "success") formRef.current?.reset();
  }, [service, state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className={cn("flex flex-col gap-4 rounded-xl border bg-card p-4", !active && "bg-muted/40")}>
      <div className="flex items-start justify-between gap-4">
        <Field label="Name" htmlFor={id("name")} error={errors.name} className="flex-1">
          <Input id={id("name")} name="name" defaultValue={values.name} required aria-invalid={Boolean(errors.name)} />
        </Field>
        <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="hidden" name="isActive" value={active ? "on" : ""} />
          <Switch checked={active} onCheckedChange={setActive} aria-label="Offered to customers" />
          {active ? "Offered" : "Hidden"}
        </label>
      </div>

      <Field label="Description" htmlFor={id("description")} error={errors.description}>
        <Textarea id={id("description")} name="description" rows={2} defaultValue={values.description} maxLength={300} />
      </Field>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Price (Rs)" htmlFor={id("price")} error={errors.price} hint="0 means free">
          <Input id={id("price")} name="price" type="number" min={0} step={50} defaultValue={values.price} required />
        </Field>
        <Field label="Duration (min)" htmlFor={id("durationMin")} error={errors.durationMin}>
          <Input id={id("durationMin")} name="durationMin" type="number" min={15} max={480} step={15} defaultValue={values.durationMin} required />
        </Field>
        <Field label="At the same time" htmlFor={id("capacity")} error={errors.capacity} hint={tables ? "Tables of this size" : "Parallel bookings"}>
          <Input id={id("capacity")} name="capacity" type="number" min={1} max={50} defaultValue={values.capacity} required />
        </Field>
        {tables ? (
          <Field label="Seats" htmlFor={id("partySize")} error={errors.partySize}>
            <Input id={id("partySize")} name="partySize" type="number" min={1} max={50} defaultValue={values.partySize ?? ""} required />
          </Field>
        ) : (
          <input type="hidden" name="partySize" value="" />
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <FormMessage state={state} />
        <Button type="submit" variant={service ? "outline" : "default"} disabled={pending} className="ml-auto">
          {pending ? "Saving…" : service ? "Save" : "Add service"}
        </Button>
      </div>
    </form>
  );
}
