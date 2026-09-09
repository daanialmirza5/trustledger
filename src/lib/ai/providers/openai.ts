import type { AIProvider, AICompletionRequest, AICompletionResult } from "../provider";
import { ProviderError } from "../provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private model = "gpt-4o-mini";

  constructor(private apiKey: string) {}

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const start = Date.now();
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens ?? 600,
          messages: req.messages,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return { text, provider: this.name, model: this.model, latencyMs: Date.now() - start };
    } catch (err) {
      throw new ProviderError(this.name, err instanceof Error ? err.message : "OpenAI request failed");
    }
  }
}
