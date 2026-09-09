import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AICompletionRequest, AICompletionResult } from "../provider";
import { ProviderError } from "../provider";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model = "claude-sonnet-5";

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const start = Date.now();
    const system = req.messages.find((m) => m.role === "system")?.content;
    const user = req.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 600,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { text, provider: this.name, model: this.model, latencyMs: Date.now() - start };
    } catch (err) {
      throw new ProviderError(this.name, err instanceof Error ? err.message : "Anthropic request failed");
    }
  }
}
