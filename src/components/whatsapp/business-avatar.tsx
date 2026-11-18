import { cn } from "@/lib/utils";

export function BusinessAvatar({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-wa-avatar text-xl leading-none select-none",
        className,
      )}
    >
      {emoji}
    </span>
  );
}
