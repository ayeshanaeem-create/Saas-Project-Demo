// Resets the database to the demo state. Run with `npm run db:seed` (or `npm run db:reset`
// to rebuild from migrations first), or `npm run turso:seed` for the hosted database.
// The seeding itself lives in src/lib/demo/seed.ts, shared with the app's "Reset demo" button.

import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { seedDemo } from "../src/lib/demo/seed";

// `npm run turso:seed` passes --remote: without a Turso URL in .env.turso, DATABASE_URL would
// fall back to .env's local file and wipe the dev database instead.
if (process.argv.includes("--remote") && (process.env.DATABASE_URL ?? "file:").startsWith("file:")) {
  throw new Error("No hosted DATABASE_URL in .env.turso; refusing to seed the local database.");
}

const prisma = new PrismaClient({ adapter: createDbAdapter() });

seedDemo(prisma)
  .then((summaries) => {
    for (const s of summaries) {
      const note = s.skipped.length ? ` (skipped ${s.skipped.length} outside opening hours: ${s.skipped.join(", ")})` : "";
      console.log(`${s.emoji}  ${s.name}: ${s.services} services, ${s.bookings} bookings${note}`);
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
