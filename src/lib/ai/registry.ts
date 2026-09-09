import type { AIProvider, AICompletionRequest, AICompletionResult } from "./provider";
import { ProviderError } from "./provider";
import { MockProvider } from "./providers/mock";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GoogleProvider } from "./providers/google";

function buildProviderChain(): AIProvider[] {
  const chain: AIProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) chain.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
  if (process.env.OPENAI_API_KEY) chain.push(new OpenAIProvider(process.env.OPENAI_API_KEY));
  if (process.env.GOOGLE_API_KEY) chain.push(new GoogleProvider(process.env.GOOGLE_API_KEY));
  chain.push(new MockProvider()); // always last — guarantees the app works with no keys
  return chain;
}

function withTimeout<T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ProviderError(providerName, "timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export interface CompletionOutcome extends AICompletionResult {
  attempts: { provider: string; success: boolean; error?: string }[];
}

/**
 * Runs the request against providers in order (real providers first, mock
 * last), retrying each real provider once before moving to the next. If
 * every provider fails, the mock provider — which cannot fail — guarantees
 * the app still responds with deterministic, evidence-grounded output.
 */
export async function complete(req: AICompletionRequest, timeoutMs = 15000): Promise<CompletionOutcome> {
  const chain = buildProviderChain();
  const attempts: CompletionOutcome["attempts"] = [];

  for (const provider of chain) {
    const isMock = provider.name === "mock";
    const maxTries = isMock ? 1 : 2;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const result = await withTimeout(provider.complete(req), timeoutMs, provider.name);
        attempts.push({ provider: provider.name, success: true });
        return { ...result, attempts };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        attempts.push({ provider: provider.name, success: false, error: message });
      }
    }
  }

  // Unreachable in practice — MockProvider never throws — but keeps types honest.
  throw new ProviderError("all", "all providers failed including mock");
}
