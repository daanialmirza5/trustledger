import type { AIProvider, AICompletionRequest, AICompletionResult } from "../provider";

/**
 * Deterministic fallback provider. Never calls the network. It doesn't
 * "invent" financial analysis — the orchestrator (see orchestrator.ts)
 * always builds the actual evidence and narration template; this provider
 * exists so the same evidence-rendering path runs identically whether or
 * not real LLM credentials are configured.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const start = Date.now();
    const userContent = req.messages.find((m) => m.role === "user")?.content ?? "";
    // Mock "narration" just echoes the structured evidence block already
    // built by the orchestrator, formatted plainly — grounded by construction.
    const text = userContent;
    return {
      text,
      provider: this.name,
      model: "deterministic-template-v1",
      latencyMs: Date.now() - start,
    };
  }
}
