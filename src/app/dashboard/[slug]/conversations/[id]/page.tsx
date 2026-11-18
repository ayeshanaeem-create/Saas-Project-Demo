import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ChannelBadge, ConversationStatusBadge } from "@/components/dashboard/badges";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { ResolveHandoffButton } from "@/components/dashboard/resolve-handoff-button";
import { TranscriptView } from "@/components/dashboard/transcript-view";
import { getBusinessBySlug, getConversationDetail } from "@/lib/dashboard/queries";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Conversation" };

export default function ConversationPage({ params }: PageProps<"/dashboard/[slug]/conversations/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: Pick<PageProps<"/dashboard/[slug]/conversations/[id]">, "params">) {
  const { slug, id } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const detail = await getConversationDetail(business, id);
  if (!detail) notFound();
  const { summary, transcript } = detail;

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <Link href={`/dashboard/${slug}/conversations`} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Conversations
      </Link>
      <PageHeader
        title={summary.customerName ?? formatPhone(summary.customerPhone)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatPhone(summary.customerPhone)}
            <ConversationStatusBadge status={summary.status} />
            <ChannelBadge channel={summary.channel} />
          </span>
        }
        actions={summary.status === "handoff" ? <ResolveHandoffButton slug={slug} conversationId={summary.id} /> : undefined}
      />

      {summary.status === "handoff" && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          The agent told this customer someone from the team will reply. Follow up with them, then mark it as resolved.
        </p>
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {transcript.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <TranscriptView items={transcript} timeZone={business.timezone} />
        )}
      </div>
    </div>
  );
}
