import type { AIProvider, AICompletionRequest, AICompletionResult } from "../provider";
import { ProviderError } from "../provider";

export class GoogleProvider implements AIProvider {
  readonly name = "google";
  private model = "gemini-2.0-flash";

  constructor(private apiKey: string) {}

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const start = Date.now();
    try {
      const system = req.messages.find((m) => m.role === "system")?.content;
      const user = req.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents: [{ parts: [{ text: user }] }],
          }),
        }
      );
      if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return { text, provider: this.name, model: this.model, latencyMs: Date.now() - start };
    } catch (err) {
      throw new ProviderError(this.name, err instanceof Error ? err.message : "Google request failed");
    }
  }
}
