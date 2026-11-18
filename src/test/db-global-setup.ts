// Vitest global setup for the "db" project: builds a fresh prisma/test.db by applying
// every migration in order. Uses Node's built-in SQLite, so no Prisma CLI is involved
// (and the dev database is never touched).

import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export default function setup() {
  const root = process.cwd();
  const file = path.join(root, "prisma", "test.db");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(file + suffix, { force: true });

  const migrationsDir = path.join(root, "prisma", "migrations");
  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const sqlite = new DatabaseSync(file);
  try {
    for (const name of migrations) {
      sqlite.exec(readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
    }
  } finally {
    sqlite.close();
  }
}
