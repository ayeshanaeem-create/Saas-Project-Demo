"use client";

import { CircleCheck } from "lucide-react";
import { useTransition } from "react";

import { resolveHandoffAction } from "@/app/dashboard/[slug]/actions";
import { Button } from "@/components/ui/button";

export function ResolveHandoffButton({ slug, conversationId }: { slug: string; conversationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(async () => void (await resolveHandoffAction(slug, conversationId)))}
    >
      <CircleCheck aria-hidden />
      {pending ? "Saving…" : "Mark as resolved"}
    </Button>
  );
}
