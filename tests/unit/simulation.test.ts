import { describe, it, expect } from "vitest";
import { runScenario, validateAssumptions, defaultAssumptions, type BaselineSnapshot } from "@/lib/analytics/simulation";
import { runStressTest } from "@/lib/analytics/stress";

const baseline: BaselineSnapshot = {
  monthlyRevenue: 800000,
  monthlyExpenses: 600000,
  currentCash: 642800,
  avgMonthlyBurn: -200000, // net positive (negative burn = accumulating cash)
  runwayMonths: null,
};

describe("runScenario", () => {
  it("hiring employees increases monthly expenses and projects some revenue uplift", () => {
    const result = runScenario(baseline, "HIRE_EMPLOYEE", { count: 2, monthlyCostPerEmployee: 30000 });
    expect(result.monthlyExpenseDelta).toBe(60000);
    expect(result.monthlyRevenueDelta).toBeGreaterThan(0);
    expect(result.notes[0]).toContain("2 new hire");
  });

  it("losing the top customer reduces projected revenue and worsens runway", () => {
    const result = runScenario(baseline, "LOSE_TOP_CUSTOMER", { revenueSharePct: 0.3 });
    expect(result.monthlyRevenueDelta).toBeCloseTo(-240000, 0);
    expect(result.projectedMonthlyRevenue).toBeCloseTo(560000, 0);
  });

  it("taking a loan adds a one-time cash inflow and a recurring repayment expense", () => {
    const result = runScenario(baseline, "TAKE_LOAN", { principal: 500000, monthlyRepayment: 22000 });
    expect(result.oneTimeCashDelta).toBe(500000);
    expect(result.monthlyExpenseDelta).toBe(22000);
  });

  it("do-nothing scenario produces zero deltas", () => {
    const result = runScenario(baseline, "DO_NOTHING");
    expect(result.monthlyRevenueDelta).toBe(0);
    expect(result.monthlyExpenseDelta).toBe(0);
  });
});

describe("validateAssumptions", () => {
  it("accepts the default assumptions for every scenario type", () => {
    const types = [
      "HIRE_EMPLOYEE", "INCREASE_MARKETING", "PURCHASE_EQUIPMENT", "TAKE_LOAN", "INCREASE_PRICES",
      "LOSE_TOP_CUSTOMER", "NEW_SUPPLIER_COST", "EXTEND_CUSTOMER_TERMS", "ACCELERATE_COLLECTIONS",
      "REDUCE_DISCRETIONARY_EXPENSES", "DO_NOTHING",
    ] as const;
    for (const type of types) {
      expect(validateAssumptions(type, defaultAssumptions(type))).toHaveLength(0);
    }
  });

  it("rejects a negative employee count", () => {
    const errors = validateAssumptions("HIRE_EMPLOYEE", { count: -2, monthlyCostPerEmployee: 30000 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("count");
  });

  it("rejects an impossible price-increase percentage", () => {
    const errors = validateAssumptions("INCREASE_PRICES", { pricePct: 12, expectedVolumeLossPct: 0.1 });
    expect(errors.some((e) => e.includes("pricePct"))).toBe(true);
  });

  it("rejects a negative revenue-share assumption", () => {
    const errors = validateAssumptions("LOSE_TOP_CUSTOMER", { revenueSharePct: -0.3 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a non-finite value", () => {
    const errors = validateAssumptions("TAKE_LOAN", { principal: NaN, monthlyRepayment: Infinity });
    expect(errors).toHaveLength(2);
  });

  it("rejects an unrecognized assumption key for the scenario type", () => {
    const errors = validateAssumptions("DO_NOTHING", { madeUpField: 5 });
    expect(errors.some((e) => e.includes("madeUpField"))).toBe(true);
  });

  it("accepts a valid custom assumption within bounds", () => {
    expect(validateAssumptions("HIRE_EMPLOYEE", { count: 3, monthlyCostPerEmployee: 25000 })).toHaveLength(0);
  });
});

describe("runStressTest", () => {
  it("a severe revenue drop worsens projected cash versus a mild one", () => {
    const mild = runStressTest("REVENUE_DROP_10", baseline, 0.3);
    const severe = runStressTest("REVENUE_DROP_25", baseline, 0.3);
    expect(severe.projectedCash90d).toBeLessThan(mild.projectedCash90d);
  });

  it("labels every stress test with a liquidity impact", () => {
    const result = runStressTest("SUPPLIER_COST_UP_20", baseline, 0.3);
    expect(["LOW", "MODERATE", "HIGH", "SEVERE"]).toContain(result.liquidityImpact);
  });
});
