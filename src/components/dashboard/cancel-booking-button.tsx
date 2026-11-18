"use client";

import { useState, useTransition } from "react";

import { cancelBookingAction } from "@/app/dashboard/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CancelBookingButton({ slug, bookingId, summary }: { slug: string; bookingId: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelBookingAction(slug, bookingId);
      if (result.status === "error") setError(result.message ?? "Couldn't cancel this booking.");
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive pointer-coarse:h-9" />}
      >
        Cancel
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>{summary}. The time becomes free for other customers straight away.</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep booking
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={pending}>
            {pending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
