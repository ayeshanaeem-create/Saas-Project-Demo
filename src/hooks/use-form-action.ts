"use client";

import { startTransition, useActionState, useCallback, type FormEvent } from "react";

import { idleForm, type FormState } from "@/lib/dashboard/schemas";

/**
 * Runs a Server Action from a form's onSubmit instead of its `action` prop. React resets
 * forms after an `action` submission even when the server sends back validation errors,
 * which would wipe what the user typed; submitting this way keeps their input.
 */
export function useFormAction(action: (previous: FormState, form: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, idleForm);
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );
  return { state, pending, onSubmit };
}
