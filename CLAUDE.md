# BookMate AI

@AGENTS.md

BookMate AI is an AI booking agent for small businesses. Customers reach it over WhatsApp, by chat or voice call. It answers questions and books, reschedules or cancels appointments.

This repo is a **demo build**. It does **not** connect to the real WhatsApp Business API. Instead, a WhatsApp-style simulator inside the web app plays the customer's phone, so the whole product can be demoed from one browser. Nothing in this repo talks to Meta.

## Status

The build runs in phases, and each phase is agreed in conversation before it starts. Update this section as phases land.

- **Phase 1 (scaffold and data): done.** Next.js app, Prisma schema and first migration, seed data for the four businesses, timezone helpers with tests, and a temporary home page listing the businesses from the database.
- **Phase 2 (WhatsApp simulator UI): done.** `/simulator` (chat list) and `/simulator/[slug]` (chat) in a phone frame, with ticks, a typing indicator, unread badges, search, WhatsApp text formatting, and light and dark mode.
- **Phase 3 (booking engine): done.** Pure slot logic in `src/lib/booking/availability.ts`, and DB operations (availability, create, reschedule, cancel, customer lookups) in `src/lib/booking/bookings.ts`. Covered by unit tests and DB tests, including simultaneous bookings. No UI yet.
- **Phase 4 (agents): done; the Claude agent hasn't run against the live API yet.** `POST /api/agent/chat` is answered by one of two agents, both using the booking engine and saving every message:
  - **Scripted agent** (`src/lib/agent/scripted/`): rule-based, free, needs no key. It reads services, dates, times, party sizes and names with regex parsers, and walks the customer through booking, cancelling and rescheduling. **This is what the demo runs on for now**, because the user has no API key yet.
  - **Claude agent** (`run-agent.ts`): a tool loop on Claude. Covered by tests with a fake client; it switches on automatically once `ANTHROPIC_API_KEY` is set.
- **Phase 5 (owner dashboard): done.** `/dashboard/[slug]` has five sections:
  - **Overview:** stats, today's schedule, handoff alerts, recent chats.
  - **Bookings:** a week view, staff booking and cancelling.
  - **Conversations:** a list, plus transcripts that show the Claude agent's tool calls.
  - **Services & hours:** editors for both.
  - **Agent:** the persona editor, plus which agent is active.

  The overview, bookings and conversations pages refresh every 5 seconds, so simulator activity shows up by itself.
- **Phase 6 (voice calls): done.** The phone icon in a chat opens `/simulator/[slug]/call`: ringing, the spoken greeting, then listen → agent → speak until hang-up. There are live captions, Mute and Interrupt, a call bubble in the chat afterwards, and each call is its own voice conversation on the dashboard. Tested in headless Edge with fake speech APIs; real speech needs Chrome or Edge with a microphone and an internet connection.
- **Phase 7 (demo polish): done.** The landing page is at `/`. The live demo at `/demo/[slug]` shows the simulator in an iframe beside a live panel: scenario buttons, "Booked by the agent" and the latest transcript. "Reset demo" (in the demo top bar and the dashboard sidebar) restores the seed data. There are error and 404 pages, an app icon and a README.
- All seven planned phases are done. The Claude agent still hasn't run against the live API, because the user has no key yet.
- **Deploy and brand (branch `deploy-and-brand`): done.** The brand design (green tokens, Figtree and Bricolage Grotesque, 18px base, pricing section) is described under "Brand design" below. The deploy pieces:
  - one libSQL driver for both the local file and a hosted Turso database (`src/lib/db-adapter.ts`);
  - `npm run turso:migrate` / `turso:seed`;
  - an optional `DEMO_PASSWORD` sign-in prompt (`src/proxy.ts`).

  A mobile layout pass is also on this branch: every page was checked at 360, 768 and 1280px (see "Responsive layout" below).

  The app is live on Vercel, which deploys `main` from GitHub (`origin`) on every push. The repository is public: while it was private, Vercel's free plan rejected pushes whose commit author isn't the Vercel account owner. Its data is in a Turso database in `aws-us-east-1`, next to Vercel's default function region. The hosted database was migrated and seeded on 2026-11-18. No `DEMO_PASSWORD` is set yet.

## Product vision

- **Owner side:** a business sets up its services, prices, working hours and an AI agent persona. A dashboard shows bookings, conversations (with what the agent did) and agent settings.
- **Customer side:** a phone-frame simulator that looks and behaves like WhatsApp: a chat list, chat screen, typing indicator, read ticks and a voice call screen.
- **Demo view:** the phone and the owner dashboard side by side. When the agent books in chat, the booking appears on the dashboard.

### Demo businesses (seed data)

| Business | Emoji | Category | Bookable services |
|---|---|---|---|
| Glamour Salon | 💇‍♀️ | Salon | Haircut, Facial, Bridal makeup |
| SmileCare Dental Clinic | 🦷 | Dental | Checkup, Cleaning, Root canal consultation |
| Spice Garden Restaurant | 🍛 | Restaurant | Table for 2 / 4 / 6 / 8 |
| FitZone Gym | 🏋️ | Fitness | Free trial, Personal trainer session |

Each business has a name, slug, emoji logo, category, services (price and duration), weekly working hours and an agent persona (agent name, tone). Seed prices are in PKR and hours are in `Asia/Karachi`.

### Language

Agents speak **English only** for now. If a customer writes in another language, the agent replies politely in English. Roman Urdu may be added later. Keep user-facing agent text in the system prompt so adding a language later doesn't touch the tools or the booking logic.

## Stack

- Node 26, npm 11
- Next.js 16.4 (App Router, Turbopack) with **Cache Components** and Partial Prefetching on; React 19.3; TypeScript (strict)
- Tailwind CSS 4 + shadcn/ui (`base-nova` style, built on **Base UI**, not Radix); icons from `lucide-react`
- Prisma 7.10 + SQLite through the `@prisma/adapter-libsql` driver adapter: a local file in development and tests, a hosted Turso database when deployed
- `date-fns` + `@date-fns/tz` for timezone math; `zod` 4 for validation
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with tool use (from Phase 4)
- Browser Web Speech API for voice calls: `SpeechRecognition` (speech to text) and `speechSynthesis` (text to speech)
- Vitest 5 for unit tests of pure logic

Next.js, Prisma and shadcn have all changed their setup across recent majors, so check the installed version's docs before relying on memory:

- **Next.js:** read the guide in `node_modules/next/dist/docs/` (see AGENTS.md).
- **Prisma 7:** its config file is `prisma7.config.ts` (it loads `.env` via dotenv). The client is generated into `src/generated/prisma` (gitignored; `npm install` regenerates it) and needs the driver adapter.
- **Prisma version:** npm's `latest` tag for `prisma` points at an 8.0 release candidate. Stay on 7.10.x and ignore the CLI's update banner.
- **shadcn/ui:** components wrap Base UI primitives, which use a `render` prop where Radix used `asChild`. The `cn` helper comes from shadcn's `cn` package, re-exported by `src/lib/utils.ts`.
- **npm install scripts:** npm 11 blocks them until approved. Nothing here needs them: libSQL and Prisma's engines ship prebuilt.
- **Prisma Migrate and Turso:** Prisma's CLI can't connect to `libsql://` URLs, so the hosted database is migrated by `prisma/turso-migrate.ts`. It runs each `migration.sql` through the libSQL client and records it in its own `_bookmate_migrations` table. It refuses databases that Prisma Migrate manages.

## Commands

Keep this list in sync with `package.json`.

```bash
npm run dev                          # dev server (http://localhost:3000)
npm run build                        # production build; also catches Cache Components errors
npm run lint
npm run typecheck                    # next typegen && tsc --noEmit
npm test                             # all tests: "unit" project + "db" project (npm run test:watch to watch)
npx vitest run --project unit        # just the fast pure-logic tests
npm run db:migrate -- --name <name>  # create and apply a migration after editing schema.prisma
npm run db:seed                      # wipe the data and reload the four demo businesses
npm run db:reset                     # rebuild the DB from migrations, then seed (the "reset demo" path)
npm run db:studio                    # browse the DB in Prisma Studio
npm run turso:migrate                # apply migrations to the hosted DB named in .env.turso (safe to rerun)
npm run turso:seed                   # wipe the hosted DB's data and reload the demo businesses
```

First-time setup: `npm install`, copy `.env.example` to `.env` (and `.env.local` from Phase 4), then `npm run db:reset`.

Prisma refuses destructive commands (`migrate reset`, and so `db:reset`) when Claude Code runs them, unless the user explicitly consents. To refresh demo data, Claude uses `npm run db:seed`, which only replaces rows. Claude runs `db:reset` only after the user says yes, and leaves the bypass variable alone otherwise.

## Folder structure

Items marked † don't exist yet; they arrive in later phases.

```
prisma7.config.ts             # Prisma CLI config: schema path, migrations, seed command
prisma/
  schema.prisma               # source of truth for the data model
  migrations/
  seed.ts                     # `npm run db:seed` / `turso:seed`: thin wrapper around src/lib/demo/seed.ts
  turso-migrate.ts            # `npm run turso:migrate`: applies migrations to the hosted Turso DB
src/
  proxy.ts                    # optional DEMO_PASSWORD gate (HTTP Basic auth) for a deployed demo
  generated/prisma/           # generated Prisma client (gitignored)
  app/
    page.tsx                  # landing page (hero, how it works, features, demo businesses)
    error.tsx / not-found.tsx # app-wide error (with retry) and 404 pages
    icon.svg                  # app icon
    demo/
      page.tsx                # redirects to the first business
      [slug]/page.tsx         # live demo: simulator iframe + live panel (scenarios, agent bookings, transcript)
    simulator/
      layout.tsx              # phone shell + SimulatorProvider (chat state survives navigation)
      page.tsx                # chat list
      [slug]/page.tsx         # one chat (own <Suspense> around params)
      [slug]/call/page.tsx    # voice call screen
      not-found.tsx, error.tsx  # both render inside the phone
    dashboard/
      page.tsx                # redirects to the first business
      not-found.tsx
      [slug]/
        layout.tsx            # sidebar (business switcher + sections)
        page.tsx              # overview: stats, today's schedule, handoffs, recent chats
        bookings/ conversations/ conversations/[id]/ services/ agent/
        actions.ts            # Server Actions: staff booking/cancel, services, hours, persona, resolve handoff
    api/agent/chat/route.ts   # POST: one customer turn (chat or voice), streams AgentEvents as NDJSON
    api/agent/call/route.ts   # POST: start a call (new voice conversation) / end it (endedAt)
    layout.tsx
    globals.css               # shadcn tokens + wa-* simulator tokens + wa-chat-wallpaper utility
  components/
    ui/                       # shadcn-generated; add via the shadcn CLI
    business/                 # business-card.tsx
    whatsapp/                 # simulator-provider (state), simulator-shell (phone frame + theme
                              #   toggle), status-bar, chat-list, chat-screen, chat-header,
                              #   message-list, message-bubble, message-status (ticks), composer,
                              #   formatted-text, business-avatar, chat-skeleton, call-screen
    dashboard/                # nav, booking list/row, new-booking dialog, cancel button, service/hours/
                              #   persona editors, conversation list, transcript view, badges, auto-refresh
    marketing/                # chat-preview (static hero conversation)
    demo/                     # scenario-buttons (post into the iframe), reset-demo-button
  lib/
    db.ts                     # Prisma client singleton (server-only)
    db-adapter.ts             # createDbAdapter(): libSQL adapter for DATABASE_URL (+ token); used by scripts too
    demo-auth.ts              # isAuthorized(): Basic auth check for proxy.ts (+ test)
    businesses.ts             # business queries (server-only)
    time.ts                   # all timezone math (+ time.test.ts)
    format.ts                 # price and duration formatting
    whatsapp-format.ts        # *bold* _italic_ ~strike~ ```mono``` parser (+ test)
    utils.ts                  # shadcn's cn()
    demo/
      seed.ts                 # seedDemo(prisma): wipe + recreate demo data (CLI seed and Reset demo)
      seed-data/              # one file per demo business + customers.ts
      scenarios.ts            # suggested demo messages per business category
      actions.ts              # resetDemoAction (Server Action)
      constants.ts            # DEMO_PHONE_ID
      demo.db.test.ts         # seed is repeatable; every scenario gets a real answer
    dashboard/
      queries.ts              # read models for the dashboard (server-only)
      schemas.ts              # form validation + FormState, phone normalizing (+ test)
      transcript.ts           # stored messages → readable transcript with tool steps (+ test)
    simulator/
      constants.ts            # SIMULATOR_TIMEZONE, SIMULATOR_CUSTOMER_PHONE
      chats.ts                # saved chats for the simulator (server-only)
      ndjson.ts               # NDJSON stream reader (+ test)
    agent/
      config.ts               # agentMode(), Anthropic client, model, effort, fallback params
      business.ts             # loadAgentBusiness: what both agents know about a business
      system-prompt.ts        # system prompt + per-turn note (+ test)
      tools.ts                # createAgentTools(ctx): zod-defined strict tools
      run-agent.ts            # runAgentTurn: the tool loop, persistence, events, lock
      history.ts              # rows ↔ API messages ↔ chat bubbles, pure (+ test)
      conversations.ts        # conversation + message rows, per-conversation lock (server-only)
      agent.db.test.ts        # the loop against a fake Claude client
      scripted/
        parse.ts              # pure message parsing: dates, times, party size, services, names, intents (+ test)
        script.ts             # the scripted conversation: ScriptState + runScript()
        run-scripted.ts       # runScriptedTurn: same events and history as runAgentTurn
        scripted.db.test.ts   # whole conversations against the real booking engine
    booking/
      availability.ts         # pure slot rules (+ availability.test.ts)
      bookings.ts             # DB operations, server-only (+ bookings.db.test.ts)
      errors.ts               # BookingError: code, customer-facing message, alternatives
    voice/
      recognition.ts          # listenOnce(): one utterance via SpeechRecognition
      synthesis.ts            # speak(): sentence by sentence, abortable
      to-speech.ts            # reply text → speakable text, sentence splitting (+ test)
  hooks/
    use-now.ts                # hydration-safe clock (useNow / useClientNow)
    use-form-action.ts        # Server Action forms that keep input on validation errors
    use-voice-call.ts         # the call loop: ring, greet, listen → agent → speak, mute, interrupt
  types/
    domain.ts                 # zod enums for the String status/category columns
    simulator.ts              # SimulatorBusiness, SimulatorChat, ChatMessage, MessageStatus
    agent-events.ts           # AgentEvent stream + AgentChatRequest body
.env                          # DATABASE_URL (not committed)
.env.turso                    # hosted DATABASE_URL + DATABASE_AUTH_TOKEN for the turso:* scripts (not committed)
.env.example
vitest.config.mts             # "unit" and "db" test projects
src/test/                     # test support: server-only stub, test-DB global setup
```

## Architecture

### Simulator state

The `/simulator` layout loads each business's saved chat (`src/lib/simulator/chats.ts`) into `SimulatorProvider`. The provider holds one conversation per business: messages, a `typing` flag and the unread count. Each business's greeting is the first bubble in its chat. It is UI-only and never sent to the model; the system prompt tells the agent it already greeted. All simulator times use `SIMULATOR_TIMEZONE`.

`send(slug, text)` queues the message. Each conversation has one request in flight at a time, and anything typed meanwhile goes out together in the next request. Ticks follow the server: sending → sent (response opened) → delivered (`accepted`) → read (`typing`). Failures show a red tick and an amber notice bubble (`kind: "notice"`, client-only) with the server's message.

### Chat flow

1. The simulator posts `{ slug, texts }` (`AgentChatRequest`) to `/api/agent/chat`. The route returns 400 for bad input, 503 when no API key is set, and 404 for an unknown business. Otherwise it streams `AgentEvent`s as NDJSON: `accepted` → `typing` → `message`* → `done`, or `error`.
2. `agentMode()` picks the agent. `AGENT_MODE` in `.env.local` can be `auto` (the default: Claude when a key is set, scripted otherwise), `scripted` or `claude`. The route returns 503 only when `claude` is forced without a key.
   - **Claude:** `runAgentTurn` (`src/lib/agent/run-agent.ts`) takes a per-conversation lock, saves the customer's messages, then calls Claude with the business's tools. It repeats until Claude stops calling tools, at most `MAX_TOOL_ROUNDS` times, saving each step and emitting each reply bubble as soon as it exists.
   - **Scripted:** `runScriptedTurn` takes the same lock and saves the same rows. It runs `runScript()` against the conversation's saved `agentState` and sends each reply after a typing delay. Its replies are plain assistant text, so a conversation can carry on later with Claude.
3. The turn keeps running if the browser disconnects, so a booking in progress still completes. The simulator sees the result next time it loads, since chats come from the DB.
4. The dashboard picks up new bookings and messages by polling: `<AutoRefresh />` calls `router.refresh()` every 5 seconds while the tab is visible.

### Owner dashboard

- **No login** (demo): any business's dashboard is reachable by its slug. Every Server Action in `dashboard/[slug]/actions.ts` is bound to a slug and only touches that business's rows (`updateMany`/`findFirst` with `businessId`).
- **Writes:** bookings go through the booking engine (`source: "staff"`; cancelling passes no `customerId`). Staff bookings match customers by normalized phone (`normalizePakistaniPhone`), and the typed name overwrites the stored one. Services, hours and persona are written directly.
- **After a change:** actions call `refresh()` from `next/cache` so the page re-renders with fresh data. They return a `FormState` (`status`, `message`, `fieldErrors`, `alternatives`).
- **Forms** use `useFormAction` (`onSubmit` + `useActionState`), not `<form action>`. React resets forms after `action` submissions even on validation errors, which would wipe the user's input. Controls are native `<select>`s (`NativeSelect`) and Switches paired with hidden inputs, which submit reliably.
- **Editing services or hours never changes existing bookings.** A hidden service (`isActive: false`) disappears from the agents and the simulator.

### Voice call flow

`useVoiceCall` (`src/hooks/use-voice-call.ts`) runs each call:

1. `POST /api/agent/call {action: "start"}` creates a new voice conversation and returns its id.
2. It rings briefly, then speaks the persona greeting (UI-only, like the chat greeting).
3. It loops: `listenOnce()` hears one utterance, which goes to `/api/agent/chat` with `channel: "voice"` and the call's `conversationId`. Each reply is spoken via `toSpeech()` + `speak()`, then it listens again.
4. Hanging up sends `{action: "end"}`, which sets `endedAt`, and the chat gets a "Voice call · m:ss" bubble. Saved calls also load as call bubbles (`getSimulatorChats`).

- **No voice barge-in.** The microphone is off while the agent speaks, because speech recognition would hear the speakers and cut the agent off. The **Interrupt** button stops speech, including replies still queued. **Mute** pauses listening.
- **Spoken style.** Claude gets the voice variant of the system prompt (`buildSystemPrompt(business, "voice")`: one or two sentences, no formatting, at most three times offered). The scripted agent in voice mode offers 4 times instead of 8 and asks "Shall I go ahead?". `toSpeech()` still strips formatting and emoji and reads prices as rupees, whichever agent replied.
- **Browsers.** Speech recognition needs Chrome or Edge, a microphone permission and internet (the browser sends audio to its speech service). Without support, the call screen says so. Failed calls never reach the agent.
- **Dev-mode double mount.** The call starts on a zero-delay timer that the first cleanup cancels; otherwise every call would also create an instantly-ended ghost call. Each effect run resets the call's refs, because refs survive the remount.
- **Testing.** Headless browsers have no microphone. Browser tests replace `SpeechRecognition` and `speechSynthesis` with fakes through an init script (a `__say(text)` hook drives the fake recogniser), and use a business the user isn't chatting with.

### Data model

`prisma/schema.prisma` is the source of truth. Key decisions:

- **Customers** are shared across businesses, keyed by a fictional phone number, the way one WhatsApp number talks to many businesses. The simulator user is the customer `+923000000000`, with no name until the agent asks for it.
- **Service capacity** is how many bookings of that service may overlap. Restaurant tables are services (`Table for 4`) whose capacity is the number of tables of that size and whose `partySize` is the seat count. There is no cross-service staff model, so a checkup and a cleaning never block each other.
- **Working hours** allow one interval per weekday, stored as local `"HH:mm"`. A missing weekday means closed.
- **Messages** store the Anthropic content blocks verbatim as JSON in `content`, plus the `text` the chat UI shows (empty for tool results and system notes). `position` (unique per conversation) is the replay order. Never sort messages by `createdAt`.
- **Booking source** is `agent` or `staff`. Seed data and dashboard bookings are `staff`.
- **Voice calls:** each call is its own `Conversation` with channel `voice`, created by `startCall()`. `endedAt` records the hang-up, and its length is `endedAt - createdAt`. Voice turns must name their conversation (`conversationForTurn`); chat turns use the customer's current chat.

## Claude agent conventions

- **Model:** read from `ANTHROPIC_MODEL`, defaulting to `claude-opus-5-5` (`src/lib/agent/config.ts`). For development and demos the user runs `claude-haiku-5-5`, set in `.env.local`, because it's about 40x cheaper per message. Keep the code working on both. Model IDs never take a date suffix.
- **Thinking and effort:** thinking is always on for this model. Never send `thinking: { type: "disabled" }` or `budget_tokens`; both return a 400. Control latency with `output_config: { effort: "low" }`, and raise it only if the agent makes booking mistakes. Voice especially needs low latency.
- **Streaming:** stream every agent call with `client.beta.messages.stream(...).finalMessage()`. Don't hand-wrap stream events in promises.
- **Tool loop:** a manual loop in `runAgentTurn`, not the SDK's Tool Runner, because every step has to be saved as it happens and each reply emitted as a chat bubble. Run all of one response's tool calls, then send every result back in one user message.
- **Tools:** defined once in zod in `src/lib/agent/tools.ts`. That schema becomes the `strict: true` JSON Schema sent to Claude (without `$schema` or numeric bounds) and validates the input Claude sends back. Service names are a per-business enum. `eager_input_streaming` is off because the inputs are tiny.
- **Refusal fallback:** `refusalFallbackParams(model)` adds `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"` only for models that support it (Opus 5.5, Sonnet 5.5, …). Claude Haiku 5.5 has no server-side fallback, so it gets neither. Always check `stop_reason` (`refusal`, `max_tokens`) before reading content.
- **Tool choice:** `tool_choice` stays `auto`, because `any` and `tool` return a 400 on this model. Assistant prefill is also unsupported. Steer behaviour through the system prompt.
- **Tenant isolation:** tools are built per turn by `createAgentTools(ctx)`, with the business, customer and conversation fixed on the server. The model can never choose them, so an agent can only read and change its own business's data, for its own customer.
- **Thin tools:** a tool's `run` calls `src/lib/booking/*` and holds no business logic itself. It returns compact JSON. A `BookingError` is an expected outcome, returned as `{ ok: false, error, message, alternative_times }` *without* `is_error`. `is_error: true` is only for invalid input or real failures.
- **Prompt caching:** the system prompt (`buildSystemPrompt`) depends only on the business, and the top-level `cache_control: { type: "ephemeral" }` caches the prefix. Never put the time or customer details in it. Those go in the per-turn note (`buildTurnNote`), a mid-conversation `role: "system"` message after the customer's messages.
- **History:** stored rows replay verbatim, thinking blocks and fallback blocks included, and history is append-only. Editing, dropping or reordering past turns invalidates thinking blocks and the cache. `toApiMessages` merges consecutive user rows into one turn, deterministically.
- **Failure-safe writes:** the turn's system note is saved together with the first assistant response, and a tool-using response is saved together with its tool results. A failure at any point therefore leaves a history the API accepts, and the next turn merges the unanswered messages with the new ones.
- **Refusals:** on `stop_reason: "refusal"`, don't run that response's tools. Save the response, and show `REFUSAL_REPLY` as the bubble text.
- **SDK usage:** use SDK types (`Anthropic.MessageParam`, `Anthropic.Message`, …) instead of redefining them. Handle errors with the typed SDK classes (`Anthropic.RateLimitError`, …), never by matching message strings.
- **No invented facts:** the agent never makes up prices, slots or policies. Everything comes from tools or the system prompt. Before booking, it confirms service, date, time and the customer's name.

### Booking engine

Everything that reads or changes bookings goes through `src/lib/booking/bookings.ts`: the agent's tools, and later the dashboard. Nothing else writes to the `Booking` table, apart from the seed script.

- **Slot rules** (`availability.ts`, pure): start times sit on the business's `slotIntervalMin` grid from opening time, and the whole service must fit before closing. A slot must start at least 30 minutes from now and at most 60 days ahead (`BOOKING_RULES`). Capacity counts the most bookings of that service running *at the same instant*, so back-to-back bookings don't block each other.
- **Rejection order:** date problems (`IN_PAST`, `TOO_FAR`) come first, then `CLOSED`, `OUTSIDE_HOURS`, `NOT_ON_GRID`, `IN_PAST`/`TOO_SOON` for the time, and finally `FULL`.
- **Writes** run inside `db.$transaction`, re-checking the slot before writing. Tests prove three simultaneous requests for the last table produce exactly one booking.
- **Scoping:** every function takes `businessId`. A service or booking from another business comes back as `SERVICE_NOT_FOUND` / `BOOKING_NOT_FOUND`. Passing `customerId` to reschedule or cancel restricts them to that customer's own bookings. The agent always passes it; staff actions won't.
- **Changes:** only `confirmed` bookings that haven't started can be rescheduled or cancelled. Rescheduling ignores the booking's own current slot.
- **Party size:** table services require a party size that fits, and `PARTY_TOO_LARGE` names the right table. Other services store `null`.
- **Errors** are `BookingError` with a `code`, a `message` the agent can relay as-is, and `alternatives` (up to 3 nearest open "HH:mm" times). Anything else thrown is a bug, not a booking outcome.
- **Dates and times in and out** are local `"YYYY-MM-DD"` / `"HH:mm"` in the business timezone. `BookingSummary` is the shape to hand to the agent and the UI.

### Scripted agent

A rule-based stand-in for Claude, so the demo runs without an API key. Keep it honest: it only understands what `parse.ts` can read.

- **Decision order** (`ScriptRun.run`):
  1. A request for a person → handoff.
  2. Yes to a pending confirmation → do it.
  3. No, or new details, at a confirmation → change the draft or abort.
  4. Picking a booking from a numbered list.
  5. cancel, reschedule or "my bookings".
  6. Questions about prices, hours or location → answer, then re-ask the pending question.
  7. Booking details, or an answer to our question → fill the draft and `advance()`.
  8. Greeting, thanks, then a fallback.
- **`advance()`** asks for the first missing piece: table from party size, service, party size, date, time, name, confirmation. It checks real availability before offering or accepting a time; full times get the nearest alternatives.
- **Ambiguous times** ("at 5") resolve to the reading inside opening hours, preferring PM. A bare number counts as a time or party size only when we just asked for one.
- **State** (`ScriptState`, zod-validated) is saved as JSON in `Conversation.agentState`. A bad or missing value just means "idle".
- **New services:** add their everyday words to `SERVICE_SYNONYMS` in `parse.ts`; otherwise only the service's exact name is recognised.

### Agent tools

Services, prices, hours and house rules are in the system prompt, so there are no tools for them.

- `check_availability(service, date)`: open "HH:mm" times for a day.
- `find_next_available(service)`: the next six open times from now on.
- `create_booking(service, date, time, customer_name, party_size?, notes?)`: also saves the customer's name.
- `list_my_bookings()`: this customer's upcoming bookings, with their `booking_id`s.
- `reschedule_booking(booking_id, date, time)` / `cancel_booking(booking_id)`.
- `request_human_handoff(reason)`: sets the conversation's status to `handoff`.

## Coding conventions

- **TypeScript:** strict mode, no `any`. Use `unknown` plus zod at every boundary: request bodies, tool inputs and JSON columns.
- **Server vs client:** Server Components by default. Add `"use client"` only on interactive leaf components. Any file that imports Prisma or the Anthropic SDK also imports `"server-only"`.
- **Data access:** reads happen in Server Components. Dashboard mutations go through Server Actions. The streaming agent endpoint (`/api/agent/chat`) is the only route handler. App code imports `db` from `@/lib/db`; types come from `@/generated/prisma/client`. The seed script builds its own client, because `server-only` modules can't load outside Next.js.
- **Cache Components:** bookings and conversations change constantly, so never wrap them in `"use cache"`. Put each live read in an async component inside `<Suspense>` with a fallback, and call `await connection()` (from `next/server`) before the query. `src/app/page.tsx` shows the pattern. Without it, `next build` fails or bakes stale data into the page. After a mutation, refresh with the revalidation APIs described in the bundled Next.js docs.
- **Suspense per page:** a layout's `<Suspense>` covers page loads but not client navigation below that layout. A page that awaits `params`/`searchParams` or reads live data needs its own `<Suspense>` with a fallback shaped like the page, as in `src/app/simulator/[slug]/page.tsx`. In dev, Next.js logs an "instant navigation" error in the browser console when one is missing.
- **Route params:** `params` and `searchParams` are Promises and must be awaited. Type pages and layouts with the global `PageProps<"/route">` / `LayoutProps<"/route">` helpers.
- **Hidden previous pages:** Next.js keeps the previous page mounted but hidden after a client navigation, so going back restores it. Effects still clean up when a page is hidden. In browser tests, scope queries to the visible screen (e.g. `getByRole("log")`), because a hidden page's text is still in the DOM.
- **Time in client components:** never call `new Date()` / `Date.now()` during render, since it causes hydration mismatches and Cache Components errors. Use `useNow(serverNow)` from `src/hooks/use-now.ts`, or `useClientNow()` for UI in the static shell.
- **URL hooks in the static shell:** `usePathname()`, `useParams()` and `useSearchParams()` in a client component outside any `<Suspense>` block prerendering, and Next.js logs an error in the browser console. Wrap that component in `<Suspense>` with a URL-free fallback, as `SimulatorShell` does for `RouteAwareStatusBar`.
- **Prerendered pages can't format timezones:** `@date-fns/tz` reads the clock internally, so `next build` fails ("unstable value `new Date()`") if a prerendered component formats a time. Static content passes ready-made labels (`MessageBubble`'s `timeLabel`, as in `ChatPreview`); live content reads after `connection()`.
- **Constants for server components** go in plain modules (e.g. `src/lib/demo/constants.ts`), not `"use client"` files. A value imported from a client module arrives in a server component as a client reference, not the value.
- **Stale dev server:** if the dev server says an exported function "is not a function" although it exists, its module graph is stale, typically after `next build` ran alongside it. Restart `npm run dev`. Restart it after Prisma schema changes too, so it loads the new client.
- **Responsive layout:** every page must work from 360px wide with no sideways scrolling.
  - **Dashboard below `lg`:** the sections become a tab bar fixed to the bottom of the screen (`DashboardNav`), so the layout adds `pb-24`. The sidebar's extra links move to the header (`HeaderActions`).
  - **Demo page below `lg`:** `CompactIntro` puts the title and a swipeable row of suggested messages above the phone, and the live panel hides its own copies.
  - **Simulator below `sm`:** it fills the screen. The chat list header carries the dark-mode toggle and the way back (`useSimulatorTheme`, `useEmbedded`). There is no way back inside the demo iframe.
  - **Touch targets:** small buttons get `pointer-coarse:h-9`.
  - **Cards in grids:** use container queries (`@container`, `@md:`), not viewport breakpoints.
  - **Tall dialogs:** get `max-h-[calc(100dvh-2rem)] overflow-y-auto`.
- **Brand design** (tokens in `globals.css`, light and dark):
  - **Colours:** `primary` (#0E7A4F), `primary-hover`, `heading`, `muted-foreground`, `border`, `tint` (light green for icon backgrounds and selected states) and `outline-hover`. Use these, not `emerald-*` classes.
  - **Fonts:** Figtree for body and buttons, Bricolage Grotesque (`font-heading`) for headings.
  - **Base size:** `html` is 18px (`112.5%`), so rem sizes scale. `text-xs` is redefined as 14px, the smallest text allowed.
  - **Headings:** h1, h2 and h3 get their size, font and colour from the base layer, at 40–64px, 30–44px and 22px. A page heading should carry no size class. Compact headings (dashboard and demo-panel sections, booking day labels, dialog titles) set their own size.
  - **The WhatsApp simulator (`.font-wa`)** keeps its own colours and fonts. Its phone frame is sized in px.
  - **`buttonVariants()`** returns merged classes, so it works on a plain `<Link>`.
- **Money:** integers in whole PKR. Format for display only.
- **Time:** store `DateTime` in UTC. Convert to the business timezone only for display and in prompts. All timezone math lives in `src/lib/time.ts`.
- **SQLite:** no Prisma enums. Use `String` columns with TS string-literal unions validated by zod. Store JSON payloads as `String` and parse them with zod. This keeps a later move to Postgres simple.
- **Naming:** files are kebab-case (`message-bubble.tsx`), components PascalCase, hooks `use-*.ts`.
- **shadcn:** `src/components/ui/` is generated. Add components with the shadcn CLI and only edit them for theming.
- **WhatsApp look:** built from Tailwind theme tokens (`wa-*` in `globals.css`, e.g. `bg-wa-bubble-out`, `text-wa-meta`) with light and dark variants, never hard-coded hex in components. Use our own lucide icons. Don't ship WhatsApp or Meta logos. The simulator's dark mode toggles a `dark` class on the phone wrapper only, not on the whole page.
  - **App bars:** the classic Android look. The chat list, the chat header, the phone status bar and the landing preview use `wa-bar` / `wa-bar-text` / `wa-bar-meta`: green in light mode, `#202c33` in dark mode.
  - **Wallpaper:** `--wa-wallpaper` is our own doodle tile (an inline SVG with booking icons), not WhatsApp's art. It has a light and a dark stroke colour.
  - **Typing:** while the agent is typing, a `TypingBubble` with three dots shows after the messages. It's decorative; the header's "typing…" is what gets announced.
  - **Decorative look-alikes:** some controls are there only so the screen looks real: the video icon and ⋮ in the chat header, and the Updates, Communities and Calls tabs. They're `aria-hidden` or `aria-disabled` with a "not part of the demo" title. Don't make them look clickable.
  - **Desktop phone frame:** has side buttons and a home indicator. On frame sizes the composer adds `sm:pb-5` to leave room for the indicator.
- **Message formatting:** agent replies use WhatsApp syntax (`*bold*`, `_italic_`, `~strike~`), never Markdown. Render text through `FormattedText`, and strip it for previews with `stripWhatsAppFormatting`.
- **Tests:** pure logic (slot rules, timezone helpers, formatting) gets Vitest unit tests (`*.test.ts`). Code that needs the database gets `*.db.test.ts` files in the "db" project. Those run one file at a time against `prisma/test.db`, which is rebuilt from `prisma/migrations` on every run and never touches the dev database. DB tests pass a fixed `now` to every booking function. UI is verified by running the app.
- **Env files:** `.env` holds `DATABASE_URL`, which both the Prisma CLI and Next.js read. `.env.local` holds `AGENT_MODE`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and `DEMO_PASSWORD`, and is read only by Next.js. `.env.turso` holds the hosted database's `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, and is read only by the `turso:*` scripts. A deployed app gets the same variables from the host's settings. None of these files is committed. Keep `.env.example` current.

## Demo rules

- Seed bookings are placed relative to today, so the calendar looks busy but still has open slots. A seed booking that lands on a closed day or outside that day's hours is skipped, and the seed log says so.
- **Reset demo** (the button), `npm run db:seed` and `npm run turso:seed` all call `seedDemo()`, which wipes every table and recreates the demo data. All are safe to rerun. But the user keeps their own test chats and bookings in the dev DB, and the hosted DB is what the audience sees, so Claude never runs any of them, or clicks Reset in a browser test, without asking. Reset tests run against `prisma/test.db` (`demo.db.test.ts`). The button reloads the page afterwards, so the simulator drops its in-memory chats.
- **Scenarios** (`src/lib/demo/scenarios.ts`) are suggested messages per business category, sent into the demo iframe by `postMessage({ type: "bookmate:say", slug, text })`. `SimulatorProvider` accepts these from its own origin only. When changing the scripted agent or a scenario, run `demo.db.test.ts`: it plays every scenario against the seed data and fails on any "didn't quite get that". `SHOW_TRANSCRIPTS=1` prints the conversations to read.
- **The demo phone is an iframe** of `/simulator/[slug]`, 375px wide, so the simulator uses its full-screen phone layout. `allow="microphone; autoplay"` lets voice calls work inside it.
- **The simulator phone is shared.** The user tries the simulator while Claude runs browser tests, and both act as the one simulator customer, with one name on file. In automated browser tests, use a business the user has no chat with, record the DB state first, and afterwards delete only the rows the test created. Never wipe tables or reset the customer's name.
- All customer names and phone numbers are fictional.
- Voice needs Chrome or Edge, since `SpeechRecognition` isn't available elsewhere. Feature-detect it and show a notice in other browsers. Speech recognition and speech output both use English (`en-US`).
