import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { SimulatorProvider } from "@/components/whatsapp/simulator-provider";
import { SimulatorShell } from "@/components/whatsapp/simulator-shell";
import { getSimulatorBusinesses } from "@/lib/businesses";
import { getSimulatorChats } from "@/lib/simulator/chats";

export const metadata: Metadata = {
  title: "Simulator · BookMate AI",
  description: "WhatsApp-style chat simulator for the BookMate AI demo businesses.",
};

// The phone frame is static; the business data and chat state stream in. Keeping the
// provider in the layout means chat state survives moving between the list and a chat.
export default function SimulatorLayout({ children }: LayoutProps<"/simulator">) {
  return (
    <SimulatorShell>
      <Suspense fallback={<PhoneScreenSkeleton />}>
        <SimulatorData>{children}</SimulatorData>
      </Suspense>
    </SimulatorShell>
  );
}

async function SimulatorData({ children }: { children: ReactNode }) {
  await connection();
  const [businesses, chats] = await Promise.all([getSimulatorBusinesses(), getSimulatorChats()]);
  return (
    <SimulatorProvider businesses={businesses} chats={chats} startedAt={new Date().toISOString()}>
      {children}
    </SimulatorProvider>
  );
}

function PhoneScreenSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading chats" className="flex flex-col gap-4 p-4">
      <div className="h-7 w-24 animate-pulse rounded bg-wa-hover" />
      <div className="h-10 animate-pulse rounded-full bg-wa-hover" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-12 animate-pulse rounded-full bg-wa-hover" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-wa-hover" />
            <div className="h-3 w-full animate-pulse rounded bg-wa-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}
