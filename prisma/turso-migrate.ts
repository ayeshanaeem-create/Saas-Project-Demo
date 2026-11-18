// Applies prisma/migrations to the hosted Turso database named in .env.turso:
//   npm run turso:migrate
// Prisma Migrate can't connect to libsql:// URLs (and the Turso CLI needs WSL on Windows),
// so this runs each migration.sql in order through the libSQL client and records it in
// `_bookmate_migrations`. Safe to rerun: migrations already applied are skipped.
// The local dev database stays with `npm run db:migrate`.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

const TRACKING_TABLE = "_bookmate_migrations";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Put the Turso URL and token in .env.turso.");
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined });

  try {
    const prismaManaged = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'",
    );
    if (prismaManaged.rows.length > 0) {
      throw new Error(`${url} is managed by Prisma Migrate. Use npm run db:migrate for it instead.`);
    }

    await client.execute(
      `CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" TEXT NOT NULL)`,
    );
    const applied = new Set(
      (await client.execute(`SELECT "name" FROM "${TRACKING_TABLE}"`)).rows.map((row) => String(row.name)),
    );

    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    let count = 0;
    for (const name of migrations) {
      if (applied.has(name)) continue;
      await client.executeMultiple(readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
      await client.execute({
        sql: `INSERT INTO "${TRACKING_TABLE}" ("name", "appliedAt") VALUES (?, ?)`,
        args: [name, new Date().toISOString()],
      });
      console.log(`Applied ${name}`);
      count++;
    }
    console.log(count ? `${count} migration(s) applied.` : "Already up to date.");
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
