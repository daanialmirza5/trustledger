import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { computeSnapshot } from "@/lib/analytics/snapshot";
import { runScenario, type BaselineSnapshot, type ScenarioType } from "@/lib/analytics/simulation";
import { recordAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const { id } = await params;

  const scenario = await prisma.scenario.findFirst({ where: { id, organizationId: session.organizationId } });
  if (!scenario) return apiError("NOT_FOUND", "Scenario not found.", 404);

  const snapshot = await computeSnapshot(session.organizationId);
  const baseline: BaselineSnapshot = {
    monthlyRevenue: snapshot.monthlyRevenue,
    monthlyExpenses: snapshot.monthlyExpenses,
    currentCash: snapshot.currentCash,
    avgMonthlyBurn: -(snapshot.monthlyRevenue - snapshot.monthlyExpenses),
    runwayMonths: snapshot.runway.currentRunwayMonths,
  };

  const assumptions = JSON.parse(scenario.assumptions) as Record<string, number>;
  const projection = runScenario(baseline, scenario.type as ScenarioType, assumptions);

  const result = await prisma.scenarioResult.create({
    data: {
      scenarioId: scenario.id,
      baseline: JSON.stringify(baseline),
      projected: JSON.stringify(projection),
      deltaSummary: JSON.stringify({
        runwayDelta:
          projection.projectedRunwayMonths !== null && baseline.runwayMonths !== null
            ? projection.projectedRunwayMonths - baseline.runwayMonths
            : null,
        cash90dDelta: projection.projectedCash90d - snapshot.currentCash,
        annualRevenueImpact: projection.annualRevenueImpact,
        annualExpenseImpact: projection.annualExpenseImpact,
      }),
    },
  });

  await recordAudit({
    organizationId: session.organizationId,
    actor: session.email,
    userId: session.userId,
    action: "RUN_SCENARIO",
    entity: "Scenario",
    entityId: scenario.id,
    newValue: projection,
  });

  return ok({ result, projection, baseline });
}
