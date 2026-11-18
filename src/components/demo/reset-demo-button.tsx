"use client";

import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { resetDemoAction } from "@/lib/demo/actions";

/** Restores the demo data. Reloads afterwards so the simulator drops its in-memory chats too. */
export function ResetDemoButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      await resetDemoAction();
      window.location.reload();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        <RotateCcw aria-hidden />
        Reset demo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset the demo?</DialogTitle>
          <DialogDescription>
            This deletes every chat, call and booking made in the demo, and puts all four businesses back as they started,
            including their services, hours and agent settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep everything
          </Button>
          <Button variant="destructive" onClick={reset} disabled={pending}>
            {pending ? "Resetting…" : "Reset demo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
