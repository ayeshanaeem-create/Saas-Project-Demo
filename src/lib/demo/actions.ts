"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { seedDemo } from "@/lib/demo/seed";

/**
 * "Reset demo": deletes every chat, call and booking and restores the four businesses
 * exactly as seeded, including any services, hours or persona edits.
 */
export async function resetDemoAction(): Promise<{ ok: true }> {
  await seedDemo(db);
  refresh();
  return { ok: true };
}
