"use client";

import { useMemo } from "react";

import { savePersonaAction } from "@/app/dashboard/[slug]/actions";
import { Field, FormMessage } from "@/components/dashboard/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import type { PersonaForm as Persona } from "@/lib/dashboard/schemas";

export function PersonaForm({ slug, persona }: { slug: string; persona: Persona }) {
  const action = useMemo(() => savePersonaAction.bind(null, slug), [slug]);
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <Field label="Agent name" htmlFor="agentName" error={errors.agentName} hint="How the assistant introduces itself.">
        <Input id="agentName" name="agentName" defaultValue={persona.agentName} maxLength={40} required className="max-w-xs" />
      </Field>
      <Field label="Greeting" htmlFor="greeting" error={errors.greeting} hint="The first message in every chat.">
        <Textarea id="greeting" name="greeting" rows={2} defaultValue={persona.greeting} maxLength={500} required />
      </Field>
      <Field label="Tone" htmlFor="tone" error={errors.tone} hint="How it should sound, e.g. “warm and upbeat, at most one emoji”.">
        <Textarea id="tone" name="tone" rows={2} defaultValue={persona.tone} maxLength={300} />
      </Field>
      <Field
        label="House rules"
        htmlFor="instructions"
        error={errors.instructions}
        hint="One rule per line: policies, notice periods, when to hand over to staff."
      >
        <Textarea id="instructions" name="instructions" rows={5} defaultValue={persona.instructions} maxLength={2000} />
      </Field>

      <div className="flex items-center justify-between gap-4">
        <FormMessage state={state} />
        <Button type="submit" disabled={pending} className="ml-auto">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
