import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatScreen } from "@/components/whatsapp/chat-screen";
import { ChatSkeleton } from "@/components/whatsapp/chat-skeleton";
import { db } from "@/lib/db";

// The layout's <Suspense> only covers page loads. Moving from the chat list to a chat
// re-renders below the layout, so this page needs its own boundary around `params`.
export default function SimulatorChatPage({ params }: PageProps<"/simulator/[slug]">) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat params={params} />
    </Suspense>
  );
}

async function Chat({ params }: Pick<PageProps<"/simulator/[slug]">, "params">) {
  const { slug } = await params;
  const exists = await db.business.count({ where: { slug } });
  if (!exists) notFound();

  return <ChatScreen slug={slug} />;
}
