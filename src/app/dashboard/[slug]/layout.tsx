import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { NavSkeleton } from "@/components/dashboard/page-skeleton";
import { listBusinesses } from "@/lib/dashboard/queries";

export const metadata: Metadata = {
  title: { template: "%s · BookMate AI", default: "Dashboard · BookMate AI" },
};

export default function DashboardLayout({ children, params }: LayoutProps<"/dashboard/[slug]">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-10 lg:h-fit lg:w-60 lg:shrink-0">
        <Link href="/" className="px-1">
          <span className="font-heading text-lg font-semibold tracking-tight">BookMate AI</span>
          <span className="block text-xs text-muted-foreground">Owner dashboard</span>
        </Link>
        <Suspense fallback={<NavSkeleton />}>
          <Nav params={params} />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

async function Nav({ params }: Pick<LayoutProps<"/dashboard/[slug]">, "params">) {
  const { slug } = await params;
  await connection();
  const businesses = await listBusinesses();
  return <DashboardNav businesses={businesses} slug={slug} />;
}
