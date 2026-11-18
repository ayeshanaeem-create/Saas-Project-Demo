"use client";

import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import { placeholderReply } from "@/lib/simulator/placeholder-replies";
import type { ChatMessage, MessageStatus, SimulatorBusiness } from "@/types/simulator";

// Client-side state for the simulator phone: one conversation per business.
// It lives in the /simulator layout, so it survives moving between the chat list
// and a chat. Phase 2 answers with placeholder replies on a realistic timeline;
// Phase 4 swaps `send` for the streaming agent endpoint and loads history from the DB.

type Conversation = {
  messages: ChatMessage[];
  /** Replies the business is still "typing". */
  pendingReplies: number;
  unread: number;
};

type State = {
  conversations: Record<string, Conversation>;
  /** The chat currently on screen, if any. */
  openSlug: string | null;
};

type Action =
  | { type: "append"; slug: string; message: ChatMessage }
  | { type: "status"; slug: string; id: string; status: MessageStatus }
  | { type: "replyStarted"; slug: string }
  | { type: "replyArrived"; slug: string; message: ChatMessage }
  | { type: "opened"; slug: string }
  | { type: "closed"; slug: string };

const STATUS_RANK: Record<MessageStatus, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };

function updateConversation(state: State, slug: string, update: (c: Conversation) => Conversation): State {
  const conversation = state.conversations[slug];
  if (!conversation) return state;
  return { ...state, conversations: { ...state.conversations, [slug]: update(conversation) } };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "append":
      return updateConversation(state, action.slug, (c) => ({ ...c, messages: [...c.messages, action.message] }));

    case "status":
      // Like WhatsApp, a status applies to the message and every earlier outgoing message,
      // and ticks only ever move forward.
      return updateConversation(state, action.slug, (c) => {
        const target = c.messages.findIndex((m) => m.id === action.id);
        if (target === -1) return c;
        return {
          ...c,
          messages: c.messages.map((m, i) =>
            i <= target && m.direction === "outgoing" && STATUS_RANK[m.status ?? "sending"] < STATUS_RANK[action.status]
              ? { ...m, status: action.status }
              : m,
          ),
        };
      });

    case "replyStarted":
      return updateConversation(state, action.slug, (c) => ({ ...c, pendingReplies: c.pendingReplies + 1 }));

    case "replyArrived":
      return updateConversation(state, action.slug, (c) => ({
        messages: [...c.messages, action.message],
        pendingReplies: Math.max(0, c.pendingReplies - 1),
        unread: state.openSlug === action.slug ? 0 : c.unread + 1,
      }));

    case "opened":
      return updateConversation({ ...state, openSlug: action.slug }, action.slug, (c) => ({ ...c, unread: 0 }));

    case "closed":
      return state.openSlug === action.slug ? { ...state, openSlug: null } : state;
  }
}

function initialState({ businesses, startedAt }: { businesses: SimulatorBusiness[]; startedAt: string }): State {
  const conversations: Record<string, Conversation> = {};
  for (const business of businesses) {
    conversations[business.slug] = {
      // The business's greeting opens every chat. It is UI-only and never sent to the agent.
      messages: [{ id: `greeting-${business.slug}`, direction: "incoming", text: business.greeting, sentAt: startedAt }],
      pendingReplies: 0,
      unread: 0,
    };
  }
  return { conversations, openSlug: null };
}

type SimulatorContextValue = {
  businesses: SimulatorBusiness[];
  /** When the server rendered the simulator, in ms. The clock fallback for hydration. */
  startedAt: number;
  state: State;
  send: (slug: string, text: string) => void;
  open: (slug: string) => void;
  close: (slug: string) => void;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({
  businesses,
  startedAt,
  children,
}: {
  businesses: SimulatorBusiness[];
  startedAt: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, { businesses, startedAt }, initialState);

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, ms);
    timers.current.add(timer);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const businessesBySlug = useMemo(() => new Map(businesses.map((b) => [b.slug, b])), [businesses]);

  const send = useCallback(
    (slug: string, text: string) => {
      const business = businessesBySlug.get(slug);
      const body = text.trim();
      if (!business || !body) return;

      const now = new Date();
      const id = crypto.randomUUID();
      dispatch({
        type: "append",
        slug,
        message: { id, direction: "outgoing", text: body, sentAt: now.toISOString(), status: "sending" },
      });

      // Placeholder timeline: sent → delivered → read + typing → reply.
      const reply = placeholderReply(business, body, now);
      const typingMs = Math.min(3500, Math.max(1200, 400 + reply.length * 15));
      later(250, () => dispatch({ type: "status", slug, id, status: "sent" }));
      later(700, () => dispatch({ type: "status", slug, id, status: "delivered" }));
      later(1100, () => {
        dispatch({ type: "status", slug, id, status: "read" });
        dispatch({ type: "replyStarted", slug });
      });
      later(1100 + typingMs, () =>
        dispatch({
          type: "replyArrived",
          slug,
          message: { id: crypto.randomUUID(), direction: "incoming", text: reply, sentAt: new Date().toISOString() },
        }),
      );
    },
    [businessesBySlug, later],
  );

  const open = useCallback((slug: string) => dispatch({ type: "opened", slug }), []);
  const close = useCallback((slug: string) => dispatch({ type: "closed", slug }), []);

  const value = useMemo(
    () => ({ businesses, startedAt: Date.parse(startedAt), state, send, open, close }),
    [businesses, startedAt, state, send, open, close],
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
  const { businesses, state, startedAt, send, open, close } = useSimulator();
  const business = businesses.find((b) => b.slug === slug) ?? null;
  const conversation = state.conversations[slug] ?? null;
  return { business, conversation, startedAt, send, open, close };
}
