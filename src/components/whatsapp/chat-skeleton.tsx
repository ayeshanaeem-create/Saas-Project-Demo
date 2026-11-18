import { ArrowLeft } from "lucide-react";

/** Placeholder chat screen while a chat route resolves. */
export function ChatSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading chat" className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-wa-divider bg-wa-header px-3">
        <ArrowLeft aria-hidden className="size-5 text-wa-icon" />
        <div className="size-9 animate-pulse rounded-full bg-wa-hover" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-wa-hover" />
          <div className="h-3 w-12 animate-pulse rounded bg-wa-hover" />
        </div>
      </div>
      <div className="wa-chat-wallpaper flex-1" />
    </div>
  );
}
