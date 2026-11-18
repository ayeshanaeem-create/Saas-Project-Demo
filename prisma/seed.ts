// Resets the database to the demo state. Run with `npm run db:seed` (or `npm run db:reset`
// to rebuild from migrations first). The seeding itself lives in src/lib/demo/seed.ts,
// shared with the app's "Reset demo" button.

import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemo } from "../src/lib/demo/seed";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

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
