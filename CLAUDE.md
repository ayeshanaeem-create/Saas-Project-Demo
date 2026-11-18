# BookMate AI

@AGENTS.md

BookMate AI is an AI booking agent for small businesses. Customers reach it over WhatsApp, by chat or voice call. It answers questions and books, reschedules or cancels appointments.

This repo is a **demo build**. It does **not** connect to the real WhatsApp Business API. Instead, a WhatsApp-style simulator inside the web app plays the customer's phone, so the whole product can be demoed from one browser. Nothing in this repo talks to Meta.

## Status

The build runs in phases, and each phase is agreed in conversation before it starts. Update this section as phases land.

- **Phase 1 (scaffold and data): done.** Next.js app, Prisma schema and first migration, seed data for the four businesses, timezone helpers with tests, and a temporary home page listing the businesses from the database.
- **Phase 2 (WhatsApp simulator UI): done.** `/simulator` (chat list) and `/simulator/[slug]` (chat) in a phone frame, with ticks, a typing indicator, unread badges, search, WhatsApp text formatting, and light and dark mode. Replies come from `src/lib/simulator/placeholder-replies.ts`, and chat state lives only in the browser.
- **Phase 3 (booking engine): done.** Pure slot logic in `src/lib/booking/availability.ts`, and DB operations (availability, create, reschedule, cancel, customer lookups) in `src/lib/booking/bookings.ts`. Covered by unit tests and DB tests, including simultaneous bookings. No UI yet.
- Next: Phase 4, the AI agent.

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
- Prisma 7.10 + SQLite through the `@prisma/adapter-better-sqlite3` driver adapter
- `date-fns` + `@date-fns/tz` for timezone math; `zod` 4 for validation
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with tool use (from Phase 4)
- Browser Web Speech API for voice calls: `SpeechRecognition` (speech to text) and `speechSynthesis` (text to speech)
- Vitest 5 for unit tests of pure logic

Next.js, Prisma and shadcn have all changed their setup across recent majors, so check the installed version's docs before relying on memory:

- **Next.js:** read the guide in `node_modules/next/dist/docs/` (see AGENTS.md).
- **Prisma 7:** its config file is `prisma7.config.ts` (it loads `.env` via dotenv). The client is generated into `src/generated/prisma` (gitignored; `npm install` regenerates it) and needs the driver adapter.
- **Prisma version:** npm's `latest` tag for `prisma` points at an 8.0 release candidate. Stay on 7.10.x and ignore the CLI's update banner.
- **shadcn/ui:** components wrap Base UI primitives, which use a `render` prop where Radix used `asChild`. The `cn` helper comes from shadcn's `cn` package, re-exported by `src/lib/utils.ts`.
- **npm install scripts:** npm 11 blocks them until approved. Nothing here needs them: better-sqlite3 and Prisma's engines ship prebuilt.

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
  seed.ts                     # resets the DB to the demo state
  seed-data/                  # one file per demo business + customers.ts
src/
  generated/prisma/           # generated Prisma client (gitignored)
  app/
    page.tsx                  # temporary business list; replaced by the landing page in Phase 7
    (marketing)/page.tsx      # † BookMate AI landing page
    demo/[slug]/page.tsx      # † split view: phone simulator + live dashboard
    simulator/
      layout.tsx              # phone shell + SimulatorProvider (chat state survives navigation)
      page.tsx                # chat list
      [slug]/page.tsx         # one chat (own <Suspense> around params)
      not-found.tsx
    dashboard/[slug]/         # †
      page.tsx                # overview: today's bookings, stats
      bookings/ conversations/ services/ agent/
      actions.ts              # Server Actions for dashboard mutations
    api/agent/chat/route.ts   # † streaming agent endpoint
    layout.tsx
    globals.css               # shadcn tokens + wa-* simulator tokens + wa-chat-wallpaper utility
  components/
    ui/                       # shadcn-generated; add via the shadcn CLI
    business/                 # business-card.tsx
    whatsapp/                 # simulator-provider (state), simulator-shell (phone frame + theme
                              #   toggle), status-bar, chat-list, chat-screen, chat-header,
                              #   message-list, message-bubble, message-status (ticks), composer,
                              #   formatted-text, business-avatar, chat-skeleton; † call-screen
    dashboard/                # †
    marketing/                # †
  lib/
    db.ts                     # Prisma client singleton (server-only)
    businesses.ts             # business queries (server-only)
    time.ts                   # all timezone math (+ time.test.ts)
    format.ts                 # price and duration formatting
    whatsapp-format.ts        # *bold* _italic_ ~strike~ ```mono``` parser (+ test)
    utils.ts                  # shadcn's cn()
    simulator/
      constants.ts            # SIMULATOR_TIMEZONE (the phone's clock)
      placeholder-replies.ts  # Phase 2 stand-in replies (+ test); delete in Phase 4
    agent/                    # †
      config.ts               # Anthropic client, model, effort
      system-prompt.ts        # builds the persona prompt from a Business record
      tools.ts                # createBookingTools(businessId)
      run-agent.ts            # tool loop, streaming, persistence
    booking/
      availability.ts         # pure slot rules (+ availability.test.ts)
      bookings.ts             # DB operations, server-only (+ bookings.db.test.ts)
      errors.ts               # BookingError: code, customer-facing message, alternatives
    voice/                    # †
      recognition.ts          # SpeechRecognition wrapper
      synthesis.ts            # speechSynthesis wrapper with a sentence queue
  hooks/
    use-now.ts                # hydration-safe clock (useNow / useClientNow)
                              # † use-voice-call.ts
  types/
    domain.ts                 # zod enums for the String status/category columns
    simulator.ts              # SimulatorBusiness, ChatMessage, MessageStatus
.env                          # DATABASE_URL (not committed)
.env.example
vitest.config.mts             # "unit" and "db" test projects
src/test/                     # test support: server-only stub, test-DB global setup
```

## Architecture

### Simulator state (Phase 2)

`SimulatorProvider` (in the `/simulator` layout) holds one conversation per business: messages, pending replies (which drive "typing…") and the unread count. `send(slug, text)` runs the delivery timeline: sending → sent → delivered → read with typing → reply. Each business's greeting is the first message in its chat. It is UI-only, so in Phase 4 it must not be sent to the model as history. All simulator times use `SIMULATOR_TIMEZONE`. Phase 4 replaces the placeholder timeline in `send` with the agent endpoint below and loads history from the DB.

### Chat flow

1. The simulator posts `{ businessSlug, conversationId, text, channel }` to `/api/agent/chat`.
2. The route handler loads the business and persona and builds the system prompt. It then loads the stored history and runs the agent with tools bound to that business.
3. The reply text streams back to the simulator. Messages and any booking changes are saved to the DB.
4. The dashboard picks up new bookings and messages. The mechanism (polling or server-sent events) is chosen in the dashboard phase.

### Voice call flow

`SpeechRecognition` produces a final transcript. It goes to the same agent endpoint with `channel: "voice"`. The streamed reply is spoken sentence by sentence via `speechSynthesis`, then listening resumes. If the caller starts talking, speech output stops (barge-in). Voice replies are kept short, and the system prompt has a voice-channel variant. A call is saved as a conversation with channel `voice`, and the dashboard shows its transcript.

### Data model

`prisma/schema.prisma` is the source of truth. Key decisions:

- **Customers** are shared across businesses, keyed by a fictional phone number, the way one WhatsApp number talks to many businesses. The simulator user is the customer `+923000000000`, with no name until the agent asks for it.
- **Service capacity** is how many bookings of that service may overlap. Restaurant tables are services (`Table for 4`) whose capacity is the number of tables of that size and whose `partySize` is the seat count. There is no cross-service staff model, so a checkup and a cleaning never block each other.
- **Working hours** allow one interval per weekday, stored as local `"HH:mm"`. A missing weekday means closed.
- **Messages** store the Anthropic content blocks verbatim as JSON in `content`, plus a plain-text `text` for the UI. Tool-result messages have empty `text`.
- **Booking source** is `agent` or `staff`. Seed data and dashboard bookings are `staff`.
- **Voice calls** are their own `Conversation` with channel `voice`.

## Claude agent conventions

- **Model:** `claude-opus-5-5`, read from `ANTHROPIC_MODEL` with that default, set in `src/lib/agent/config.ts`. Model IDs never take a date suffix.
- **Thinking and effort:** thinking is always on for this model. Never send `thinking: { type: "disabled" }` or `budget_tokens`; both return a 400. Control latency with `output_config: { effort: "low" }`, and raise it only if the agent makes booking mistakes. Voice especially needs low latency.
- **Streaming:** stream every agent call. Use the SDK helpers (`finalMessage()`, the runner's streaming mode) rather than hand-wrapping events in promises.
- **Tool loop:** use `client.beta.messages.toolRunner` with tools defined via `betaZodTool` (from `@anthropic-ai/sdk/helpers/beta/zod`). Switch to a manual `client.messages.stream` loop only if the runner can't provide something we need, such as saving each step as it happens.
- **Refusal fallback:** on by default with `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"`. Always check `stop_reason` (`refusal`, `max_tokens`) before reading content.
- **Tool choice:** `tool_choice` stays `auto`, because `any` and `tool` return a 400 on this model. Assistant prefill is also unsupported. Steer behaviour through the system prompt.
- **Tenant isolation:** tools are built per request by `createBookingTools(businessId)`. The business ID comes from the server, never from tool input. An agent can only read and change its own business's data.
- **Thin tools:** a tool's `run` function calls `src/lib/booking/*` and holds no business logic itself. It returns compact JSON strings. On failure it returns a short error message the agent can relay to the customer ("That slot was just taken").
- **Prompt caching:** the system prompt (persona, services, hours, rules) is deterministic for a business, so cache it. Never put the current time in it. Send "now", in the business timezone, as a mid-conversation `role: "system"` message after each user turn.
- **History:** save each assistant message's `content` array verbatim, thinking blocks included, and replay it unchanged. History is append-only: never edit, drop or reorder past turns. Doing so invalidates thinking blocks and the cache.
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

### Agent tools (planned)

`get_business_info`, `list_services`, `check_availability` (service, date or date range, party size), `create_booking`, `find_customer_bookings`, `reschedule_booking`, `cancel_booking`, `request_human_handoff`.

## Coding conventions

- **TypeScript:** strict mode, no `any`. Use `unknown` plus zod at every boundary: request bodies, tool inputs and JSON columns.
- **Server vs client:** Server Components by default. Add `"use client"` only on interactive leaf components. Any file that imports Prisma or the Anthropic SDK also imports `"server-only"`.
- **Data access:** reads happen in Server Components. Dashboard mutations go through Server Actions. The streaming agent endpoint is the only route handler. App code imports `db` from `@/lib/db`; types come from `@/generated/prisma/client`. The seed script builds its own client, because `server-only` modules can't load outside Next.js.
- **Cache Components:** bookings and conversations change constantly, so never wrap them in `"use cache"`. Put each live read in an async component inside `<Suspense>` with a fallback, and call `await connection()` (from `next/server`) before the query. `src/app/page.tsx` shows the pattern. Without it, `next build` fails or bakes stale data into the page. After a mutation, refresh with the revalidation APIs described in the bundled Next.js docs.
- **Suspense per page:** a layout's `<Suspense>` covers page loads but not client navigation below that layout. A page that awaits `params`/`searchParams` or reads live data needs its own `<Suspense>` with a fallback shaped like the page, as in `src/app/simulator/[slug]/page.tsx`. In dev, Next.js logs an "instant navigation" error in the browser console when one is missing.
- **Route params:** `params` and `searchParams` are Promises and must be awaited. Type pages and layouts with the global `PageProps<"/route">` / `LayoutProps<"/route">` helpers.
- **Hidden previous pages:** Next.js keeps the previous page mounted but hidden after a client navigation, so going back restores it. Effects still clean up when a page is hidden. In browser tests, scope queries to the visible screen (e.g. `getByRole("log")`), because a hidden page's text is still in the DOM.
- **Time in client components:** never call `new Date()` / `Date.now()` during render, since it causes hydration mismatches and Cache Components errors. Use `useNow(serverNow)` from `src/hooks/use-now.ts`, or `useClientNow()` for UI in the static shell.
- **Money:** integers in whole PKR. Format for display only.
- **Time:** store `DateTime` in UTC. Convert to the business timezone only for display and in prompts. All timezone math lives in `src/lib/time.ts`.
- **SQLite:** no Prisma enums. Use `String` columns with TS string-literal unions validated by zod. Store JSON payloads as `String` and parse them with zod. This keeps a later move to Postgres simple.
- **Naming:** files are kebab-case (`message-bubble.tsx`), components PascalCase, hooks `use-*.ts`.
- **shadcn:** `src/components/ui/` is generated. Add components with the shadcn CLI and only edit them for theming.
- **WhatsApp look:** built from Tailwind theme tokens (`wa-*` in `globals.css`, e.g. `bg-wa-bubble-out`, `text-wa-meta`) with light and dark variants, never hard-coded hex in components. Use our own lucide icons. Don't ship WhatsApp or Meta logos. The simulator's dark mode toggles a `dark` class on the phone wrapper only, not on the whole page.
- **Message formatting:** agent replies use WhatsApp syntax (`*bold*`, `_italic_`, `~strike~`), never Markdown. Render text through `FormattedText`, and strip it for previews with `stripWhatsAppFormatting`.
- **Tests:** pure logic (slot rules, timezone helpers, formatting) gets Vitest unit tests (`*.test.ts`). Code that needs the database gets `*.db.test.ts` files in the "db" project. Those run one file at a time against `prisma/test.db`, which is rebuilt from `prisma/migrations` on every run and never touches the dev database. DB tests pass a fixed `now` to every booking function. UI is verified by running the app.
- **Env files:** `.env` holds `DATABASE_URL`, which both the Prisma CLI and Next.js read. `.env.local` holds secrets (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`) and is read only by Next.js. Neither is committed. Keep `.env.example` current.

## Demo rules

- Seed bookings are placed relative to today, so the calendar looks busy but still has open slots. A seed booking that lands on a closed day or outside that day's hours is skipped, and the seed log says so.
- "Reset demo" reseeds the database. `npm run db:seed` wipes every table first, so it's safe to rerun.
- All customer names and phone numbers are fictional.
- Voice needs Chrome or Edge, since `SpeechRecognition` isn't available elsewhere. Feature-detect it and show a notice in other browsers. Speech recognition and speech output both use English (`en-US`).
