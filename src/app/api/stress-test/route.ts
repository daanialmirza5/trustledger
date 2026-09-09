import { getSessionUser } from "@/lib/auth/server";
import { computeSnapshot } from "@/lib/analytics/snapshot";
import { runStressTest, ALL_STRESS_TESTS } from "@/lib/analytics/stress";
import type { BaselineSnapshot } from "@/lib/analytics/simulation";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const snapshot = await computeSnapshot(session.organizationId);
  const baseline: BaselineSnapshot = {
    monthlyRevenue: snapshot.monthlyRevenue,
    monthlyExpenses: snapshot.monthlyExpenses,
    currentCash: snapshot.currentCash,
    avgMonthlyBurn: -(snapshot.monthlyRevenue - snapshot.monthlyExpenses),
    runwayMonths: snapshot.runway.currentRunwayMonths,
  };
  const topCustomerShare = snapshot.customerConcentration.topEntity?.share ?? 0.2;

  const results = ALL_STRESS_TESTS.map((id) => runStressTest(id, baseline, topCustomerShare));
  return ok({ baseline, results });
}
