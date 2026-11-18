import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page isn&apos;t part of the BookMate AI demo.</p>
      <div className="flex gap-2">
        <Link href="/" className={buttonVariants()}>
          Home
        </Link>
        <Link href="/demo" className={buttonVariants({ variant: "outline" })}>
          Live demo
        </Link>
      </div>
    </main>
  );
}
