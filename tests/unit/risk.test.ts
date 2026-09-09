import { describe, it, expect } from "vitest";
import { computeRiskAssessments, type RiskInputs } from "@/lib/analytics/risk";

function inputs(overrides: Partial<RiskInputs>): RiskInputs {
  return {
    runwayMonths: 6,
    upcoming7dObligations: 10000,
    expected7dInflow: 50000,
    revenueChangePct: 0.02,
    expenseChangePct: 0.02,
    receivablesAgingSharePct: 0.05,
    topCustomerSharePct: 0.1,
    topSupplierSharePct: 0.1,
    openAnomalyCount: 0,
    ...overrides,
  };
}

describe("computeRiskAssessments", () => {
  it("returns LOW liquidity risk for a healthy business", () => {
    const results = computeRiskAssessments(inputs({}));
    const liquidity = results.find((r) => r.riskType === "LIQUIDITY")!;
    expect(liquidity.level).toBe("LOW");
    expect(liquidity.factors).toHaveLength(0);
  });

  it("escalates liquidity risk when runway is critically short", () => {
    const results = computeRiskAssessments(inputs({ runwayMonths: 1 }));
    const liquidity = results.find((r) => r.riskType === "LIQUIDITY")!;
    expect(liquidity.score).toBeGreaterThanOrEqual(45);
    expect(["HIGH", "CRITICAL"]).toContain(liquidity.level);
  });

  it("flags customer concentration risk above the critical threshold", () => {
    const results = computeRiskAssessments(inputs({ topCustomerSharePct: 0.5 }));
    const concentration = results.find((r) => r.riskType === "CONCENTRATION")!;
    expect(concentration.factors.some((f) => f.factor.includes("customer"))).toBe(true);
  });

  it("every factor's impact sums to at most the total score", () => {
    const results = computeRiskAssessments(
      inputs({ runwayMonths: 0.5, revenueChangePct: -0.2, expenseChangePct: 0.3, openAnomalyCount: 5 })
    );
    for (const r of results) {
      const sum = r.factors.reduce((s, f) => s + f.impact, 0);
      expect(r.score).toBe(Math.min(100, sum));
    }
  });
});
