import { ArrowLeft, EllipsisVertical, Phone, Video } from "lucide-react";
import Link from "next/link";

import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import type { SimulatorBusiness } from "@/types/simulator";

/** The green app bar at the top of a chat, as on WhatsApp for Android. */
export function ChatHeader({ business, typing }: { business: SimulatorBusiness; typing: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-0.5 bg-wa-bar pr-1 pl-1 text-wa-bar-text">
      <Link
        href="/simulator"
        aria-label="Back to chats"
        className="flex size-10 items-center justify-center rounded-full hover:bg-wa-bar-text/10"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>

      <BusinessAvatar emoji={business.emoji} className="size-9 text-lg" />

      <div className="ml-2 min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[16px] font-medium">{business.name}</h1>
        <p aria-live="polite" className="truncate text-[14px] text-wa-bar-meta">
          {typing ? "typing…" : "online"}
        </p>
      </div>

      {/* Video calls aren't part of the demo; the icon is there so the bar looks like the real thing. */}
      <span aria-hidden className="flex size-10 items-center justify-center">
        <Video className="size-5" />
      </span>
      <Link
        href={`/simulator/${business.slug}/call`}
        aria-label={`Voice call ${business.name}`}
        className="flex size-10 items-center justify-center rounded-full hover:bg-wa-bar-text/10"
      >
        <Phone className="size-5" aria-hidden />
      </Link>
      <span aria-hidden className="flex size-10 items-center justify-center">
        <EllipsisVertical className="size-5" />
      </span>
    </header>
  );
}
