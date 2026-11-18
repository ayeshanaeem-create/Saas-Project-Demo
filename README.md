# BookMate AI

A demo of an AI booking agent for small businesses on WhatsApp. Customers chat or call a business; the agent answers questions and books, reschedules or cancels appointments; the owner sees everything live in a dashboard.

**This is a demo build.** The WhatsApp experience is simulated in the browser. Nothing connects to WhatsApp or Meta.

## What's in it

| Page | What it is |
|---|---|
| `/` | Landing page |
| `/demo` | The live demo: a customer's phone next to what the business sees, with suggested messages to click |
| `/simulator` | The WhatsApp-style phone on its own: chats, and voice calls via the 📞 icon |
| `/dashboard` | The owner dashboard: bookings, conversations (with what the agent looked up), services, hours and the agent's persona |

There are four demo businesses: Glamour Salon, SmileCare Dental Clinic, Spice Garden Restaurant and FitZone Gym.

## Run it

You need Node.js 26 and npm.

```bash
npm install
cp .env.example .env          # DATABASE_URL
cp .env.example .env.local    # agent settings (optional, see below)
npm run db:reset              # create the SQLite database and load the demo data
npm run dev                   # http://localhost:3000
```

### Which agent answers

- **Scripted assistant (default without a key):** free and rule-based. It understands bookings, prices, hours, location, changes, cancellations and requests for a person, in the phrasings it was written for.
- **Claude:** add `ANTHROPIC_API_KEY` to `.env.local` and restart. `ANTHROPIC_MODEL="claude-haiku-5-5"` costs about 0.1–0.2 cents per message; the default `claude-opus-5-5` gives the best replies at about 5 cents.

`AGENT_MODE` in `.env.local` can force `scripted` or `claude`; `auto` (the default) picks Claude when a key is set.

### Voice calls

Use Chrome or Edge, allow the microphone, and stay online: the browser's speech recognition runs in the cloud. The agent stops listening while it speaks; tap **Interrupt** to cut in.

## Giving the demo

1. Open `/demo`. Pick a business in the top bar.
2. Click the suggested messages in order, or type your own. The booking appears under **Booked by the agent** and the conversation in **Live transcript**.
3. Tap 📞 in the phone for a voice call.
4. Open **Full dashboard** to show bookings, the transcript, and how to change services, hours and the agent's tone.
5. **Reset demo** (top bar or dashboard sidebar) restores everything for the next audience.

## Deploy it

Any host that runs Next.js works (Vercel, for example). Hosted servers usually have no lasting disk, so the deployed app keeps its data in a [Turso](https://turso.tech) database (hosted SQLite) instead of `prisma/dev.db`.

1. Create a Turso database and an auth token for it (in the Turso dashboard, or `turso db create bookmate` and `turso db tokens create bookmate`).
2. Create `.env.turso` with its `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN`. See the commented lines at the end of `.env.example`.
3. Create the tables and load the demo data:
   ```bash
   npm run turso:migrate   # applies prisma/migrations; safe to rerun
   npm run turso:seed      # loads the demo businesses (wipes that database's data)
   ```
4. On the host, set the environment variables `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, plus any of `DEMO_PASSWORD`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and `AGENT_MODE`. The build command is `npm run build`.

With `DEMO_PASSWORD` set, every page asks for it through the browser's sign-in prompt (any username). Voice calls need HTTPS for the microphone, which hosts provide.

After a schema change, run `npm run db:migrate` locally as usual, then `npm run turso:migrate` to bring the hosted database up to date.

## Development

```bash
npm test            # unit + database tests (a separate prisma/test.db)
npm run typecheck
npm run lint
npm run build
```

See [CLAUDE.md](CLAUDE.md) for the architecture, conventions and design decisions.
