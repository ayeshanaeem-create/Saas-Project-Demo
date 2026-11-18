import { Check, CheckCheck, CircleAlert, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MessageStatus as Status } from "@/types/simulator";

const LABEL: Record<Status, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};

/** WhatsApp-style ticks: clock, one grey tick, two grey ticks, two blue ticks; red alert if it failed. */
export function MessageStatus({ status, className }: { status: Status; className?: string }) {
  const Icon = { sending: Clock3, sent: Check, delivered: CheckCheck, read: CheckCheck, failed: CircleAlert }[status];
  return (
    <Icon
      role="img"
      aria-label={LABEL[status]}
      strokeWidth={status === "sending" ? 2 : 2.25}
      className={cn(
        "shrink-0",
        status === "sending" ? "size-3" : status === "failed" ? "size-3.5" : "size-4",
        status === "read" ? "text-wa-tick-read" : status === "failed" ? "text-destructive" : "text-wa-meta",
        className,
      )}
    />
  );
}
