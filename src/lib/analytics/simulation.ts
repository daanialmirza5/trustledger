// What-if simulation engine. Scenarios never mutate the production ledger —
// callers pass a read-only baseline snapshot and get back a projected
// snapshot plus the deltas, so results are always "baseline vs scenario".
// See docs/simulation-engine.md.

export type ScenarioType =
  | "HIRE_EMPLOYEE"
  | "INCREASE_MARKETING"
  | "PURCHASE_EQUIPMENT"
  | "TAKE_LOAN"
  | "INCREASE_PRICES"
  | "LOSE_TOP_CUSTOMER"
  | "NEW_SUPPLIER_COST"
  | "EXTEND_CUSTOMER_TERMS"
  | "ACCELERATE_COLLECTIONS"
  | "REDUCE_DISCRETIONARY_EXPENSES"
  | "DO_NOTHING";

export interface BaselineSnapshot {
  monthlyRevenue: number;
  monthlyExpenses: number;
  currentCash: number;
  avgMonthlyBurn: number; // positive = burning cash
  runwayMonths: number | null;
}

export interface ScenarioAssumptions {
  [key: string]: number;
}

export interface ScenarioProjection {
  type: ScenarioType;
  assumptions: ScenarioAssumptions;
  monthlyRevenueDelta: number;
  monthlyExpenseDelta: number;
  oneTimeCashDelta: number;
  projectedMonthlyRevenue: number;
  projectedMonthlyExpenses: number;
  projectedMonthlyBurn: number;
  projectedRunwayMonths: number | null;
  projectedCash90d: number;
  annualRevenueImpact: number;
  annualExpenseImpact: number;
  notes: string[];
}

const DEFAULTS: Record<ScenarioType, ScenarioAssumptions> = {
  HIRE_EMPLOYEE: { count: 2, monthlyCostPerEmployee: 30000, expectedRevenueUpliftPct: 0.04 },
  INCREASE_MARKETING: { monthlyIncrease: 50000, expectedRevenueUpliftPct: 0.03 },
  PURCHASE_EQUIPMENT: { oneTimeCost: 200000, monthlyMaintenanceCost: 3000, expectedEfficiencyGainPct: 0.02 },
  TAKE_LOAN: { principal: 500000, monthlyRepayment: 22000 },
  INCREASE_PRICES: { pricePct: 0.05, expectedVolumeLossPct: 0.02 },
  LOSE_TOP_CUSTOMER: { revenueSharePct: 0.3 },
  NEW_SUPPLIER_COST: { costIncreasePct: 0.15 },
  EXTEND_CUSTOMER_TERMS: { additionalDays: 30, receivablesImpact: 0.5 },
  ACCELERATE_COLLECTIONS: { daysAcceleratedRevenue: 0.15 },
  REDUCE_DISCRETIONARY_EXPENSES: { reductionPct: 0.1 },
  DO_NOTHING: {},
};

export function defaultAssumptions(type: ScenarioType): ScenarioAssumptions {
  return { ...DEFAULTS[type] };
}

export function runScenario(
  baseline: BaselineSnapshot,
  type: ScenarioType,
  assumptionsInput: Partial<ScenarioAssumptions> = {}
): ScenarioProjection {
  const a = { ...DEFAULTS[type], ...assumptionsInput } as ScenarioAssumptions;
  let monthlyRevenueDelta = 0;
  let monthlyExpenseDelta = 0;
  let oneTimeCashDelta = 0;
  const notes: string[] = [];

  switch (type) {
    case "HIRE_EMPLOYEE":
      monthlyExpenseDelta = a.count * a.monthlyCostPerEmployee;
      monthlyRevenueDelta = baseline.monthlyRevenue * a.expectedRevenueUpliftPct;
      notes.push(
        `Assumes ${a.count} new hire(s) at ₹${a.monthlyCostPerEmployee.toLocaleString("en-IN")}/month each, producing an estimated ${(a.expectedRevenueUpliftPct * 100).toFixed(1)}% revenue uplift once ramped.`
      );
      break;
    case "INCREASE_MARKETING":
      monthlyExpenseDelta = a.monthlyIncrease;
      monthlyRevenueDelta = baseline.monthlyRevenue * a.expectedRevenueUpliftPct;
      notes.push(
        `Assumes ₹${a.monthlyIncrease.toLocaleString("en-IN")}/month additional marketing spend drives ${(a.expectedRevenueUpliftPct * 100).toFixed(1)}% revenue growth.`
      );
      break;
    case "PURCHASE_EQUIPMENT":
      oneTimeCashDelta = -a.oneTimeCost;
      monthlyExpenseDelta = a.monthlyMaintenanceCost - baseline.monthlyExpenses * a.expectedEfficiencyGainPct;
      notes.push(
        `One-time capex of ₹${a.oneTimeCost.toLocaleString("en-IN")} plus ₹${a.monthlyMaintenanceCost.toLocaleString("en-IN")}/month maintenance, offset by an assumed ${(a.expectedEfficiencyGainPct * 100).toFixed(1)}% operating efficiency gain.`
      );
      break;
    case "TAKE_LOAN":
      oneTimeCashDelta = a.principal;
      monthlyExpenseDelta = a.monthlyRepayment;
      notes.push(
        `₹${a.principal.toLocaleString("en-IN")} financing inflow now, repaid at ₹${a.monthlyRepayment.toLocaleString("en-IN")}/month.`
      );
      break;
    case "INCREASE_PRICES":
      monthlyRevenueDelta = baseline.monthlyRevenue * (a.pricePct - a.expectedVolumeLossPct);
      notes.push(
        `${(a.pricePct * 100).toFixed(1)}% price increase, assuming ${(a.expectedVolumeLossPct * 100).toFixed(1)}% volume loss from price-sensitive customers.`
      );
      break;
    case "LOSE_TOP_CUSTOMER":
      monthlyRevenueDelta = -baseline.monthlyRevenue * a.revenueSharePct;
      notes.push(`Removes ${(a.revenueSharePct * 100).toFixed(0)}% of monthly revenue attributed to the top customer.`);
      break;
    case "NEW_SUPPLIER_COST":
      monthlyExpenseDelta = baseline.monthlyExpenses * a.costIncreasePct * 0.4; // assume suppliers ~40% of opex
      notes.push(`Assumes supplier costs (≈40% of opex) rise ${(a.costIncreasePct * 100).toFixed(0)}%.`);
      break;
    case "EXTEND_CUSTOMER_TERMS":
      monthlyRevenueDelta = 0;
      oneTimeCashDelta = -baseline.monthlyRevenue * a.receivablesImpact;
      notes.push(
        `Extending customer payment terms by ${a.additionalDays} days delays collection of roughly ${(a.receivablesImpact * 100).toFixed(0)}% of a month's revenue into cash (one-time working-capital hit).`
      );
      break;
    case "ACCELERATE_COLLECTIONS":
      oneTimeCashDelta = baseline.monthlyRevenue * a.daysAcceleratedRevenue;
      notes.push(
        `Faster collections pull forward roughly ${(a.daysAcceleratedRevenue * 100).toFixed(0)}% of a month's revenue into current cash.`
      );
      break;
    case "REDUCE_DISCRETIONARY_EXPENSES":
      monthlyExpenseDelta = -baseline.monthlyExpenses * a.reductionPct;
      notes.push(`Cuts ${(a.reductionPct * 100).toFixed(0)}% of monthly operating expenses.`);
      break;
    case "DO_NOTHING":
      notes.push("Baseline trajectory continues unchanged.");
      break;
  }

  const projectedMonthlyRevenue = baseline.monthlyRevenue + monthlyRevenueDelta;
  const projectedMonthlyExpenses = baseline.monthlyExpenses + monthlyExpenseDelta;
  const projectedMonthlyBurn = baseline.avgMonthlyBurn + monthlyExpenseDelta - monthlyRevenueDelta;
  const projectedCashAfterOneTime = baseline.currentCash + oneTimeCashDelta;
  const projectedCash90d = projectedCashAfterOneTime - projectedMonthlyBurn * 3;
  const projectedRunwayMonths =
    projectedMonthlyBurn > 0 ? round1(projectedCashAfterOneTime / projectedMonthlyBurn) : null;

  return {
    type,
    assumptions: a,
    monthlyRevenueDelta: round2(monthlyRevenueDelta),
    monthlyExpenseDelta: round2(monthlyExpenseDelta),
    oneTimeCashDelta: round2(oneTimeCashDelta),
    projectedMonthlyRevenue: round2(projectedMonthlyRevenue),
    projectedMonthlyExpenses: round2(projectedMonthlyExpenses),
    projectedMonthlyBurn: round2(projectedMonthlyBurn),
    projectedRunwayMonths,
    projectedCash90d: round2(projectedCash90d),
    annualRevenueImpact: round2(monthlyRevenueDelta * 12),
    annualExpenseImpact: round2(monthlyExpenseDelta * 12),
    notes,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
