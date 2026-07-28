export type Message = { role: "system" | "user" | "assistant"; content: string };

/**
 * Two tiers, matching how the issues describe the work: a cheap model for
 * extraction and scoring passes, a stronger one for prose the user will publish.
 */
export type ModelTier = "fast" | "smart";

export type CompletionRequest = {
  tier: ModelTier;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  /**
   * Names what is being asked for. Real providers ignore it — the prompt already
   * says. The offline fake uses it to pick a canned response of the right shape,
   * so callers never have to branch on which provider is active.
   */
  task?: string;
};

export type CompletionClient = (request: CompletionRequest) => Promise<string>;

export class LlmError extends Error {}
