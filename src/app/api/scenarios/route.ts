import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { defaultAssumptions, validateAssumptions, type ScenarioType } from "@/lib/analytics/simulation";

const SCENARIO_TYPES: ScenarioType[] = [
  "HIRE_EMPLOYEE", "INCREASE_MARKETING", "PURCHASE_EQUIPMENT", "TAKE_LOAN", "INCREASE_PRICES",
  "LOSE_TOP_CUSTOMER", "NEW_SUPPLIER_COST", "EXTEND_CUSTOMER_TERMS", "ACCELERATE_COLLECTIONS",
  "REDUCE_DISCRETIONARY_EXPENSES", "DO_NOTHING",
];

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(SCENARIO_TYPES as [ScenarioType, ...ScenarioType[]]),
  assumptions: z.record(z.string(), z.number()).optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: session.organizationId },
    include: { results: { orderBy: { computedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return ok({ scenarios });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_SCENARIO", parsed.error.issues[0]?.message ?? "Invalid scenario.", 400);

  if (parsed.data.assumptions) {
    const errors = validateAssumptions(parsed.data.type, parsed.data.assumptions);
    if (errors.length > 0) return apiError("INVALID_SCENARIO_ASSUMPTIONS", errors.join("; "), 400);
  }

  const scenario = await prisma.scenario.create({
    data: {
      organizationId: session.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      assumptions: JSON.stringify(parsed.data.assumptions ?? defaultAssumptions(parsed.data.type)),
    },
  });

  return ok({ scenario }, 201);
}
