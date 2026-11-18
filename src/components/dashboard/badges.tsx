import { Bot, Phone, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingSource, BookingStatus, Channel, ConversationStatus } from "@/types/domain";

export function SourceBadge({ source }: { source: BookingSource }) {
  return source === "agent" ? (
    <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      <Bot aria-hidden />
      AI agent
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <User aria-hidden />
      Staff
    </Badge>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  if (status === "confirmed") return null;
  return (
    <Badge variant="outline" className={cn(status === "cancelled" && "border-destructive/30 text-destructive")}>
      {status === "cancelled" ? "Cancelled" : "Completed"}
    </Badge>
  );
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  if (status === "handoff") {
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Needs a person</Badge>;
  }
  if (status === "closed") return <Badge variant="outline">Closed</Badge>;
  return null;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return channel === "voice" ? (
    <Badge variant="outline" className="gap-1">
      <Phone aria-hidden />
      Call
    </Badge>
  ) : null;
}
