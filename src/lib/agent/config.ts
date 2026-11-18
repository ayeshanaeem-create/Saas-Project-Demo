import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Model for every agent turn. Override with ANTHROPIC_MODEL in .env.local:
 * "claude-haiku-5-5" is about 40x cheaper per message and fine for demos.
 */
export const AGENT_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";

/**
 * Low effort keeps chat replies quick. Raise it only if the agent starts making
 * booking mistakes; voice calls (Phase 6) especially need the speed.
 */
export const AGENT_EFFORT = "low" as const;

export const AGENT_MAX_TOKENS = 16_000;

/** Models that accept the server-side refusal fallback. Claude Haiku 5.5 doesn't. */
const SERVER_FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-mythos-5-2",
  "claude-mythos-5-1",
]);

/**
 * Request fields for the server-side refusal fallback: a declined request is retried on a
 * fallback model within the same call. Empty for models that don't support it; those
 * refusals are handled in runAgentTurn like any other.
 */
export function refusalFallbackParams(model: string): { betas?: string[]; fallbacks?: "default" } {
  return SERVER_FALLBACK_MODELS.has(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
}

/** Hard stop for a runaway tool loop within one customer turn. */
export const MAX_TOOL_ROUNDS = 8;

export type AgentMode = "claude" | "scripted";

/**
 * Which agent answers customers. AGENT_MODE in .env.local can be "claude", "scripted" or
 * "auto" (the default): Claude when an API key is set, otherwise the free scripted agent.
 */
export function agentMode(): AgentMode {
  const setting = process.env.AGENT_MODE?.trim().toLowerCase();
  if (setting === "claude" || setting === "scripted") return setting;
  return hasAnthropicCredentials() ? "claude" : "scripted";
}

/** True when the SDK will find credentials (an API key or auth token in the environment). */
export function hasAnthropicCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

let client: Anthropic | undefined;

export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}
