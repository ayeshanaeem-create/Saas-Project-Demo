"use client";

import { useEffect } from "react";

import { ChatHeader } from "@/components/whatsapp/chat-header";
import { Composer } from "@/components/whatsapp/composer";
import { MessageList } from "@/components/whatsapp/message-list";
import { useConversation } from "@/components/whatsapp/simulator-provider";
import { useNow } from "@/hooks/use-now";
import { SIMULATOR_TIMEZONE } from "@/lib/simulator/constants";

export function ChatScreen({ slug }: { slug: string }) {
  const { business, conversation, startedAt, send, open, close } = useConversation(slug);
  const now = useNow(startedAt);

  // Opening a chat clears its unread badge; replies arriving while it's open stay read.
  useEffect(() => {
    open(slug);
    return () => close(slug);
  }, [slug, open, close]);

  // The server page already 404s unknown slugs; this covers a stale client state.
  if (!business || !conversation) return null;

  const { typing } = conversation;

  return (
    <div className="flex h-full min-h-0 flex-col bg-wa-chat motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in motion-safe:duration-200">
      <ChatHeader business={business} typing={typing} />
      {/* One wallpaper behind the scrolling messages and the composer, fixed like WhatsApp's. */}
      <div className="wa-chat-wallpaper flex min-h-0 flex-1 flex-col">
        <MessageList
          business={business}
          messages={conversation.messages}
          typing={typing}
          now={now}
          timeZone={SIMULATOR_TIMEZONE}
        />
        <Composer onSend={(text) => send(slug, text)} />
      </div>
    </div>
  );
}
