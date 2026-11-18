import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CallScreen } from "@/components/whatsapp/call-screen";
import { db } from "@/lib/db";

// Like the chat page, the call needs its own <Suspense> around `params` so moving here
// from the chat is instant.
export default function SimulatorCallPage({ params }: PageProps<"/simulator/[slug]/call">) {
  return (
    <Suspense fallback={<div className="dark flex h-full flex-col items-center justify-center bg-wa-chat text-sm text-wa-meta">Calling…</div>}>
      <Call params={params} />
    </Suspense>
  );
}

async function Call({ params }: Pick<PageProps<"/simulator/[slug]/call">, "params">) {
  const { slug } = await params;
  const exists = await db.business.count({ where: { slug } });
  if (!exists) notFound();
  return <CallScreen slug={slug} />;
}
