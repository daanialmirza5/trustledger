import { describe, it, expect } from "vitest";
import { computeHealthScore, type HealthScoreInputs } from "@/lib/analytics/healthScore";

function inputs(overrides: Partial<HealthScoreInputs>): HealthScoreInputs {
  return {
    runwayMonths: 6,
    revenueChangePct: 0.03,
    expenseChangePct: 0.02,
    grossMarginPct: 0.45,
    receivablesAgingSharePct: 0.05,
    payablesOverduePct: 0.02,
    topCustomerSharePct: 0.1,
    topSupplierSharePct: 0.15,
    cashFlowVolatility: 0.2,
    ...overrides,
  };
}

describe("computeHealthScore", () => {
  it("scores a strong business in the HEALTHY/STRONG band", () => {
    const result = computeHealthScore(inputs({}));
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(["HEALTHY", "STRONG"]).toContain(result.band);
    expect(result.negatives).toHaveLength(0);
  });

  it("every factor is explainable — points sum to score minus the 50 baseline", () => {
    const result = computeHealthScore(inputs({ runwayMonths: 1, revenueChangePct: -0.2 }));
    const total = [...result.positives, ...result.negatives].reduce((s, f) => s + f.points, 0);
    expect(result.score).toBe(Math.max(0, Math.min(100, Math.round(50 + total))));
  });

  it("scores a distressed business in the AT_RISK/CRITICAL band", () => {
    const result = computeHealthScore(
      inputs({
        runwayMonths: 0.5,
        revenueChangePct: -0.2,
        expenseChangePct: 0.3,
        receivablesAgingSharePct: 0.5,
        topCustomerSharePct: 0.6,
        cashFlowVolatility: 0.9,
      })
    );
    expect(result.score).toBeLessThan(45);
    expect(["AT_RISK", "CRITICAL"]).toContain(result.band);
  });

  it("clamps score to the 0-100 range", () => {
    const worst = computeHealthScore(
      inputs({
        runwayMonths: 0.1,
        revenueChangePct: -0.5,
        expenseChangePct: 0.9,
        grossMarginPct: 0,
        receivablesAgingSharePct: 0.9,
        payablesOverduePct: 0.9,
        topCustomerSharePct: 0.9,
        topSupplierSharePct: 0.9,
        cashFlowVolatility: 2,
      })
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);
  });
});
