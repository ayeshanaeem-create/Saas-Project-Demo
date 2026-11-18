"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1>Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected error. Trying again usually fixes it. If it keeps happening, check that the dev server
        is running and the database is set up (<code className="font-mono text-sm">npm run db:reset</code>).
      </p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Home
        </Link>
      </div>
    </main>
  );
}
