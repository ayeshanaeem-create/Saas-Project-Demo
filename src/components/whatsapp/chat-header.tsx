import { ArrowLeft, EllipsisVertical, Phone } from "lucide-react";
import Link from "next/link";

import { BusinessAvatar } from "@/components/whatsapp/business-avatar";
import type { SimulatorBusiness } from "@/types/simulator";

export function ChatHeader({ business, typing }: { business: SimulatorBusiness; typing: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-wa-divider bg-wa-header pr-1 pl-1 text-wa-text">
      <Link
        href="/simulator"
        aria-label="Back to chats"
        className="flex size-10 items-center justify-center rounded-full text-wa-icon hover:bg-wa-hover"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>

      <BusinessAvatar emoji={business.emoji} className="size-9 text-lg" />

      <div className="ml-2 min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[16px] font-medium">{business.name}</h1>
        <p aria-live="polite" className={typing ? "text-[13px] text-wa-primary" : "text-[13px] text-wa-meta"}>
          {typing ? "typing…" : "online"}
        </p>
      </div>

      <button
        type="button"
        disabled
        aria-label="Voice call (coming in a later phase)"
        title="Voice calls arrive in Phase 6"
        className="flex size-10 items-center justify-center rounded-full text-wa-icon opacity-60"
      >
        <Phone className="size-5" aria-hidden />
      </button>
      <span aria-hidden className="flex size-10 items-center justify-center text-wa-icon">
        <EllipsisVertical className="size-5" />
      </span>
    </header>
  );
}
