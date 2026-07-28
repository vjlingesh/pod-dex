import { env } from "@pod-dex/env";
import { type CompletionRequest, LlmError } from "./types.js";

function modelFor(tier: CompletionRequest["tier"]): string {
  return tier === "fast"
    ? env("LLM_FAST_MODEL", "anthropic/claude-haiku-4.5")
    : env("LLM_SMART_MODEL", "anthropic/claude-sonnet-5");
}

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function completeWithOpenRouter(request: CompletionRequest): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelFor(request.tier),
      messages: request.messages,
      max_tokens: request.maxTokens ?? 4000,
      temperature: request.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LlmError(`OpenRouter request failed (${res.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await res.json()) as OpenRouterResponse;
  if (payload.error?.message) throw new LlmError(payload.error.message);

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("OpenRouter returned no content");

  return content;
}
