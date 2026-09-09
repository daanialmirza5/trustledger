import { getSessionUser } from "@/lib/auth/server";
import { computeSnapshot, computeMonthlyTrend } from "@/lib/analytics/snapshot";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const [snapshot, monthlyTrend] = await Promise.all([
    computeSnapshot(session.organizationId),
    computeMonthlyTrend(session.organizationId),
  ]);
  return ok({
    monthlyTrend,
    forecastPoints: snapshot.forecast90d.points,
    cash: snapshot.currentCash,
    monthlyRevenue: snapshot.monthlyRevenue,
    monthlyExpenses: snapshot.monthlyExpenses,
    netCashFlow: snapshot.cashFlow30d.netChange,
    revenueChangePct: snapshot.revenueChangePct,
    expenseChangePct: snapshot.expenseChangePct,
    accountsReceivable: snapshot.receivables.totalOutstanding,
    accountsPayable: snapshot.payables.totalOutstanding,
    runwayMonths: snapshot.runway.currentRunwayMonths,
    health: snapshot.health,
    risks: snapshot.risks,
    topRisk: [...snapshot.risks].sort((a, b) => b.score - a.score)[0] ?? null,
  });
}
