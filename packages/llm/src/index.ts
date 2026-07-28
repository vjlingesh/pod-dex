import { optionalEnv } from "@pod-dex/env";
import { completeWithFake } from "./fake.js";
import { completeWithOpenRouter } from "./openrouter.js";
import type { CompletionClient, CompletionRequest } from "./types.js";

export { LlmError } from "./types.js";
export type { CompletionClient, CompletionRequest, Message, ModelTier } from "./types.js";

/**
 * OpenRouter when a key is configured, the offline fake otherwise. Decided per
 * call so adding a key to .env takes effect on restart without a code change.
 */
export function selectClient(): CompletionClient {
  return optionalEnv("OPENROUTER_API_KEY") ? completeWithOpenRouter : completeWithFake;
}

export function isLlmLive(): boolean {
  return Boolean(optionalEnv("OPENROUTER_API_KEY"));
}

export async function complete(request: CompletionRequest): Promise<string> {
  return selectClient()(request);
}
