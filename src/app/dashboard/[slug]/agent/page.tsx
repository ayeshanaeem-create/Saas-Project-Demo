import { Bot, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { PersonaForm } from "@/components/dashboard/persona-form";
import { AGENT_MODEL, agentMode } from "@/lib/agent/config";
import { getBusinessBySlug, getPersona } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage({ params }: PageProps<"/dashboard/[slug]/agent">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Agent params={params} />
    </Suspense>
  );
}

async function Agent({ params }: Pick<PageProps<"/dashboard/[slug]/agent">, "params">) {
  const { slug } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const persona = await getPersona(business);
  const mode = agentMode();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agent" description="How your booking assistant introduces itself and talks to customers." />

      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
        {mode === "claude" ? (
          <>
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <strong className="font-medium">Claude answers your customers</strong> (model{" "}
              <code className="font-mono text-xs">{AGENT_MODEL}</code>). Every setting below shapes its replies.
            </p>
          </>
        ) : (
          <>
            <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <strong className="font-medium">The scripted assistant answers your customers</strong>, because no Anthropic
              API key is set. It uses the agent name and greeting; tone and house rules take effect once Claude is
              connected.
            </p>
          </>
        )}
      </div>

      <PersonaForm slug={slug} persona={persona} />
    </div>
  );
}
