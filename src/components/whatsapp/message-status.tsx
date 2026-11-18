import { Check, CheckCheck, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MessageStatus as Status } from "@/types/simulator";

const LABEL: Record<Status, string> = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read" };

/** WhatsApp-style ticks: clock, one grey tick, two grey ticks, two blue ticks. */
export function MessageStatus({ status, className }: { status: Status; className?: string }) {
  const Icon = status === "sending" ? Clock3 : status === "sent" ? Check : CheckCheck;
  return (
    <Icon
      role="img"
      aria-label={LABEL[status]}
      strokeWidth={status === "sending" ? 2 : 2.25}
      className={cn(
        "shrink-0",
        status === "sending" ? "size-3" : "size-4",
        status === "read" ? "text-wa-tick-read" : "text-wa-meta",
        className,
      )}
    />
  );
}
