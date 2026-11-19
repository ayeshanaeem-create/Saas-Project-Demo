import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { NavSkeleton } from "@/components/dashboard/page-skeleton";
import { ResetDemoButton } from "@/components/demo/reset-demo-button";
import { buttonVariants } from "@/components/ui/button";
import { listBusinesses } from "@/lib/dashboard/queries";

export const metadata: Metadata = {
  title: { template: "%s · BookMate AI", default: "Dashboard · BookMate AI" },
};

type Params = Pick<LayoutProps<"/dashboard/[slug]">, "params">;

// Below `lg` the section links become a tab bar fixed to the bottom of the screen
// (see DashboardNav), so the page leaves room for it with extra bottom padding.
// From `lg` the sidebar is a white card on the tinted page background.
export default function DashboardLayout({ children, params }: LayoutProps<"/dashboard/[slug]">) {
  return (
    <div className="flex-1 bg-canvas">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-10 lg:h-fit lg:w-64 lg:shrink-0 lg:gap-5 lg:rounded-2xl lg:border lg:bg-card lg:p-4 lg:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="BookMate AI home" className="flex flex-col gap-1 px-1">
              <Logo />
              {/* Indented past the logo mark (size-9 plus the gap-2.5 beside it). */}
              <span className="pl-11.5 text-xs font-medium text-muted-foreground">Owner dashboard</span>
            </Link>
            <Suspense fallback={null}>
              <HeaderActions params={params} />
            </Suspense>
          </div>
          <Suspense fallback={<NavSkeleton />}>
            <Nav params={params} />
          </Suspense>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

async function Nav({ params }: Params) {
  const { slug } = await params;
  await connection();
  const businesses = await listBusinesses();
  return <DashboardNav businesses={businesses} slug={slug} />;
}

/** The sidebar's extra links, for screens where the sidebar becomes a tab bar. */
async function HeaderActions({ params }: Params) {
  const { slug } = await params;
  return (
    <div className="flex items-center gap-1 lg:hidden">
      <Link
        href={`/simulator/${slug}`}
        aria-label="Open chat simulator"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "pointer-coarse:h-9 max-sm:w-9 max-sm:px-0" })}
      >
        <MessageCircle aria-hidden />
        <span className="max-sm:hidden">Chat simulator</span>
      </Link>
      <ResetDemoButton variant="ghost" compact />
    </div>
  );
}
