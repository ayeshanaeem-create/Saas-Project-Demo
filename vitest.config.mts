import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = "file:./prisma/test.db";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // `server-only` throws outside Next.js's server bundle; tests run server code directly.
    alias: { "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts"],
          environment: "node",
        },
      },
      {
        // Tests that hit SQLite. They share prisma/test.db, so files run one at a time.
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          environment: "node",
          fileParallelism: false,
          globalSetup: ["./src/test/db-global-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL },
        },
      },
    ],
  },
});
