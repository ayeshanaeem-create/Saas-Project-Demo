import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { BusinessCard } from "@/components/business/business-card";
import { buttonVariants } from "@/components/ui/button";
import { getBusinessSummaries } from "@/lib/businesses";

// Temporary index for the build phases. Phase 7 replaces it with the BookMate AI landing page.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">BookMate AI</h1>
          <p className="max-w-2xl text-muted-foreground">
            AI booking agents for small businesses on WhatsApp. These are the demo businesses, loaded live from the
            database.
          </p>
        </div>
        <Link href="/simulator" className={buttonVariants({ size: "lg" })}>
          <MessageCircle aria-hidden />
          Open the chat simulator
        </Link>
      </header>

      <Suspense fallback={<BusinessGridSkeleton />}>
        <BusinessGrid />
      </Suspense>
    </main>
  );
}

async function BusinessGrid() {
  // Booking counts change constantly, so read them on every request.
  await connection();
  const businesses = await getBusinessSummaries();

  if (businesses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No businesses yet. Run <code className="font-mono">npm run db:seed</code> to load the demo data.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}

function BusinessGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading businesses">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
