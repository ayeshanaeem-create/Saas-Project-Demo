import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { createDbAdapter } from "@/lib/db-adapter";

// One PrismaClient per server process. In dev, hot reloads re-evaluate this module,
// so the client is parked on globalThis to avoid opening a new connection each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: createDbAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
