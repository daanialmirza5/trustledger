// Multi-provider AI abstraction. The app must work with zero API keys, so
// MockProvider is the default and is fully deterministic (no network call).
// Real providers are only used if their env var is set. See docs/ai-architecture.md.

export interface AIMessage {
  role: "system" | "user";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  task: string; // free-form label used for logging, e.g. "cash_flow_narration"
  maxTokens?: number;
}

export interface AICompletionResult {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: string;
  complete(req: AICompletionRequest): Promise<AICompletionResult>;
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string) {
    super(message);
    this.name = "ProviderError";
  }
}
