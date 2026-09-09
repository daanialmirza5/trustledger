import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { analyzeQuestion } from "@/lib/ai/orchestrator";

const schema = z.object({ question: z.string().min(3) });

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", "A question of at least 3 characters is required.", 400);

  try {
    const result = await analyzeQuestion(session.organizationId, parsed.data.question);
    return ok(result);
  } catch (err) {
    return apiError("AI_ANALYSIS_FAILED", err instanceof Error ? err.message : "Analysis failed.", 502);
  }
}
