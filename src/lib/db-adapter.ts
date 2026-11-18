import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * The Prisma driver adapter for DATABASE_URL. libSQL handles both kinds of URL, so dev,
 * tests and production share one driver:
 *   - "file:./prisma/dev.db": a local SQLite file (development and tests)
 *   - "libsql://…turso.io": a Turso database (production; needs DATABASE_AUTH_TOKEN)
 * Not server-only: the seed and migration scripts use it outside Next.js.
 */
export function createDbAdapter(
  url: string | undefined = process.env.DATABASE_URL,
  authToken: string | undefined = process.env.DATABASE_AUTH_TOKEN,
) {
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  return new PrismaLibSql({ url, authToken: authToken?.trim() || undefined });
}
