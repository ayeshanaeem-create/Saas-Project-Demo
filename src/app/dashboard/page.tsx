import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { listBusinesses } from "@/lib/dashboard/queries";

// /dashboard has no business picked yet: go to the first one.
export default function DashboardIndex() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FirstBusiness />
    </Suspense>
  );
}

async function FirstBusiness() {
  await connection();
  const [first] = await listBusinesses();
  if (first) redirect(`/dashboard/${first.slug}`);
  return (
    <p className="p-8 text-center text-muted-foreground">
      No businesses yet. Run <code className="font-mono">npm run db:seed</code> to load the demo data.
    </p>
  );
}
