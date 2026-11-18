"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/** Errors inside the phone stay inside the phone. */
export default function SimulatorError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-wa-surface p-8 text-center text-wa-text">
      <p className="text-[16px] font-medium">Something went wrong</p>
      <p className="text-[14px] text-wa-meta">The chat couldn&apos;t load.</p>
      <button type="button" onClick={() => retry()} className="cursor-pointer text-[14px] font-medium text-wa-primary">
        Try again
      </button>
    </div>
  );
}
