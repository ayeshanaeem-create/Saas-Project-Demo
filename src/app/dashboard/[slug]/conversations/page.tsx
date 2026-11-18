import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { getBusinessBySlug, getConversations } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Conversations" };

export default function ConversationsPage({ params }: PageProps<"/dashboard/[slug]/conversations">) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Conversations params={params} />
    </Suspense>
  );
}

async function Conversations({ params }: Pick<PageProps<"/dashboard/[slug]/conversations">, "params">) {
  const { slug } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const conversations = await getConversations(business);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <PageHeader
        title="Conversations"
        description="Every WhatsApp chat with your agent. Open one to see the full transcript, including what the agent looked up."
      />
      <ConversationList slug={slug} conversations={conversations} timeZone={business.timezone} now={new Date()} />
    </div>
  );
}
