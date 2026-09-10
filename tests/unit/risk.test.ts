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

  it("returns LOW with zero factors on every risk type for a maximally healthy business", () => {
    const results = computeRiskAssessments(
      inputs({
        runwayMonths: 24,
        upcoming7dObligations: 0,
        expected7dInflow: 100000,
        revenueChangePct: 0.1,
        expenseChangePct: 0,
        receivablesAgingSharePct: 0,
        topCustomerSharePct: 0,
        topSupplierSharePct: 0,
        openAnomalyCount: 0,
      })
    );
    for (const r of results) {
      expect(r.level).toBe("LOW");
      expect(r.factors).toHaveLength(0);
      expect(r.score).toBe(0);
    }
  });

  it("escalates every risk type and caps score at 100 under maximum stress", () => {
    const results = computeRiskAssessments(
      inputs({
        runwayMonths: 0.1,
        upcoming7dObligations: 100000,
        expected7dInflow: 1000,
        revenueChangePct: -0.5,
        expenseChangePct: 0.9,
        receivablesAgingSharePct: 0.9,
        topCustomerSharePct: 0.9,
        topSupplierSharePct: 0.9,
        openAnomalyCount: 10,
      })
    );
    for (const r of results) {
      expect(r.factors.length).toBeGreaterThan(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.score)).toBe(true);
    }
    const liquidity = results.find((r) => r.riskType === "LIQUIDITY")!;
    expect(liquidity.level).toBe("CRITICAL");
  });

  it("treats a null runway (no net burn) as contributing no liquidity factor", () => {
    const results = computeRiskAssessments(inputs({ runwayMonths: null }));
    const liquidity = results.find((r) => r.riskType === "LIQUIDITY")!;
    expect(liquidity.factors.some((f) => f.factor.includes("runway"))).toBe(false);
  });

  it("is deterministic at the revenue-decline warning threshold boundary", () => {
    const atThreshold = computeRiskAssessments(inputs({ revenueChangePct: -0.05 }));
    const justAbove = computeRiskAssessments(inputs({ revenueChangePct: -0.049 }));
    const atRevenue = atThreshold.find((r) => r.riskType === "REVENUE")!;
    const aboveRevenue = justAbove.find((r) => r.riskType === "REVENUE")!;
    expect(atRevenue.factors.length).toBeGreaterThan(0);
    expect(aboveRevenue.factors).toHaveLength(0);
  });

  it("escalates anomaly risk exactly at the critical count boundary", () => {
    const results = computeRiskAssessments(inputs({ openAnomalyCount: 3 }));
    const anomaly = results.find((r) => r.riskType === "ANOMALY")!;
    expect(anomaly.factors[0].impact).toBe(30);
  });

  it("is fully deterministic — identical inputs always produce identical output", () => {
    const a = computeRiskAssessments(inputs({ runwayMonths: 3, topCustomerSharePct: 0.3 }));
    const b = computeRiskAssessments(inputs({ runwayMonths: 3, topCustomerSharePct: 0.3 }));
    expect(a).toEqual(b);
  });
});
