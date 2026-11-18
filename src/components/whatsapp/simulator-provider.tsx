"use client";

import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import { readNdjson } from "@/lib/simulator/ndjson";
import type { AgentChatRequest, AgentEvent } from "@/types/agent-events";
import type { ChatMessage, MessageStatus, SimulatorBusiness, SimulatorChat } from "@/types/simulator";

// Client-side state for the simulator phone: one conversation per business, seeded
// from the DB by the /simulator layout. It lives in the layout, so it survives moving
// between the chat list and a chat. Sending goes to POST /api/agent/chat, one request
// per conversation at a time; messages typed meanwhile queue up and go together next.

type Conversation = {
  messages: ChatMessage[];
  /** The business is composing a reply. */
  typing: boolean;
  unread: number;
};

type State = {
  conversations: Record<string, Conversation>;
  /** The chat currently on screen, if any. */
  openSlug: string | null;
};

type Action =
  | { type: "append"; slug: string; message: ChatMessage }
  | { type: "status"; slug: string; ids: string[]; status: MessageStatus }
  | { type: "readAll"; slug: string }
  | { type: "typing"; slug: string; typing: boolean }
  | { type: "received"; slug: string; message: ChatMessage }
  | { type: "opened"; slug: string }
  | { type: "closed"; slug: string };

const STATUS_RANK: Record<MessageStatus, number> = { sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

function updateConversation(state: State, slug: string, update: (c: Conversation) => Conversation): State {
  const conversation = state.conversations[slug];
  if (!conversation) return state;
  return { ...state, conversations: { ...state.conversations, [slug]: update(conversation) } };
}

/** Ticks only move forward; "failed" overrides anything short of "read". */
const advance = (current: MessageStatus | undefined, next: MessageStatus) =>
  STATUS_RANK[current ?? "sending"] < STATUS_RANK[next] && current !== "read" ? next : (current ?? next);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "append":
      return updateConversation(state, action.slug, (c) => ({ ...c, messages: [...c.messages, action.message] }));

    case "status":
      return updateConversation(state, action.slug, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          action.ids.includes(m.id) ? { ...m, status: advance(m.status, action.status) } : m,
        ),
      }));

    case "readAll":
      // Like WhatsApp: when the business reads, every delivered message shows blue ticks.
      return updateConversation(state, action.slug, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.direction === "outgoing" && m.status && m.status !== "failed" && m.status !== "sending"
            ? { ...m, status: "read" }
            : m,
        ),
      }));

    case "typing":
      return updateConversation(state, action.slug, (c) => ({ ...c, typing: action.typing }));

    case "received":
      return updateConversation(state, action.slug, (c) => ({
        ...c,
        messages: [...c.messages, action.message],
        unread: state.openSlug === action.slug ? 0 : c.unread + 1,
      }));

    case "opened":
      return updateConversation({ ...state, openSlug: action.slug }, action.slug, (c) => ({ ...c, unread: 0 }));

    case "closed":
      return state.openSlug === action.slug ? { ...state, openSlug: null } : state;
  }
}

type InitArgs = { businesses: SimulatorBusiness[]; chats: Record<string, SimulatorChat>; startedAt: string };

function initialState({ businesses, chats, startedAt }: InitArgs): State {
  const conversations: Record<string, Conversation> = {};
  for (const business of businesses) {
    const chat = chats[business.slug];
    // The business's greeting opens every chat. It is UI-only and never sent to the agent.
    const greeting: ChatMessage = {
      id: `greeting-${business.slug}`,
      direction: "incoming",
      text: business.greeting,
      sentAt: chat?.startedAt ?? startedAt,
    };
    conversations[business.slug] = { messages: [greeting, ...(chat?.messages ?? [])], typing: false, unread: 0 };
  }
  return { conversations, openSlug: null };
}

const notice = (text: string): ChatMessage => ({
  id: crypto.randomUUID(),
  direction: "incoming",
  kind: "notice",
  text,
  sentAt: new Date().toISOString(),
});

type SimulatorContextValue = {
  businesses: SimulatorBusiness[];
  /** When the server rendered the simulator, in ms. The clock fallback for hydration. */
  startedAt: number;
  state: State;
  send: (slug: string, text: string) => void;
  /** Adds a finished voice call to the chat as a call bubble. */
  addCall: (slug: string, call: { startedAt: string; durationSec: number }) => void;
  open: (slug: string) => void;
  close: (slug: string) => void;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({
  businesses,
  chats,
  startedAt,
  children,
}: InitArgs & { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { businesses, chats, startedAt }, initialState);

  const queues = useRef(new Map<string, { id: string; text: string }[]>());
  const inFlight = useRef(new Set<string>());

  const flush = useCallback(async function flushQueue(slug: string): Promise<void> {
    if (inFlight.current.has(slug)) return;
    const batch = queues.current.get(slug) ?? [];
    if (batch.length === 0) return;
    queues.current.set(slug, []);
    inFlight.current.add(slug);

    const ids = batch.map((m) => m.id);
    let accepted = false;
    let finished = false;
    try {
      const body: AgentChatRequest = { slug, texts: batch.map((m) => m.text) };
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) {
        const problem = (await response.json().catch(() => null)) as { error?: string } | null;
        dispatch({ type: "status", slug, ids, status: "failed" });
        dispatch({ type: "append", slug, message: notice(problem?.error ?? "The assistant couldn't reply.") });
        return;
      }
      dispatch({ type: "status", slug, ids, status: "sent" });

      await readNdjson(response.body, (value) => {
        const event = value as AgentEvent;
        switch (event.type) {
          case "accepted":
            accepted = true;
            dispatch({ type: "status", slug, ids, status: "delivered" });
            break;
          case "typing":
            dispatch({ type: "readAll", slug });
            dispatch({ type: "typing", slug, typing: true });
            break;
          case "message":
            dispatch({ type: "received", slug, message: event.message });
            break;
          case "done":
            finished = true;
            break;
          case "error":
            finished = true;
            dispatch({ type: "append", slug, message: notice(event.message) });
            break;
        }
      });
      if (!finished) {
        dispatch({ type: "append", slug, message: notice("The connection dropped before the assistant finished.") });
      }
    } catch (error) {
      console.warn("[simulator] send failed", error);
      if (!accepted) dispatch({ type: "status", slug, ids, status: "failed" });
      dispatch({ type: "append", slug, message: notice("Couldn't reach the assistant. Check the dev server is running.") });
    } finally {
      dispatch({ type: "typing", slug, typing: false });
      inFlight.current.delete(slug);
      if ((queues.current.get(slug) ?? []).length > 0) void flushQueue(slug);
    }
  }, []);

  const send = useCallback(
    (slug: string, text: string) => {
      const body = text.trim();
      if (!body) return;
      const id = crypto.randomUUID();
      dispatch({
        type: "append",
        slug,
        message: { id, direction: "outgoing", text: body, sentAt: new Date().toISOString(), status: "sending" },
      });
      queues.current.set(slug, [...(queues.current.get(slug) ?? []), { id, text: body }]);
      void flush(slug);
    },
    [flush],
  );

  const addCall = useCallback((slug: string, call: { startedAt: string; durationSec: number }) => {
    dispatch({
      type: "append",
      slug,
      message: { id: crypto.randomUUID(), direction: "outgoing", kind: "call", text: "Voice call", sentAt: call.startedAt, durationSec: call.durationSec },
    });
  }, []);

  const open = useCallback((slug: string) => dispatch({ type: "opened", slug }), []);
  const close = useCallback((slug: string) => dispatch({ type: "closed", slug }), []);

  // The demo page (/demo/[slug]) embeds the simulator in an iframe; its scenario buttons
  // post { type: "bookmate:say", slug, text } to send a message as if typed.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; slug?: unknown; text?: unknown } | null;
      if (data?.type === "bookmate:say" && typeof data.slug === "string" && typeof data.text === "string") {
        send(data.slug, data.text);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  const value = useMemo(
    () => ({ businesses, startedAt: Date.parse(startedAt), state, send, addCall, open, close }),
    [businesses, startedAt, state, send, addCall, open, close],
  );

  return <SimulatorContext value={value}>{children}</SimulatorContext>;
}

export function useSimulator(): SimulatorContextValue {
  const context = use(SimulatorContext);
  if (!context) throw new Error("useSimulator must be used inside <SimulatorProvider>");
  return context;
}

/** One business's chat, or null if the slug is unknown. */
export function useConversation(slug: string) {
  const { businesses, state, startedAt, send, addCall, open, close } = useSimulator();
  const business = businesses.find((b) => b.slug === slug) ?? null;
  const conversation = state.conversations[slug] ?? null;
  return { business, conversation, startedAt, send, addCall, open, close };
}
