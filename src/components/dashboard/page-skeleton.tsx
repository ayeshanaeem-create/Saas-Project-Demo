import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function NavSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading navigation" className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full lg:h-9" />
      {/* Below lg the sections are a bottom tab bar, so only the business switcher shows here. */}
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="hidden h-8 w-full lg:block" />
      ))}
    </div>
  );
}
