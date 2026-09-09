import { runScenario, type BaselineSnapshot } from "./simulation";

export type StressTestId =
  | "REVENUE_DROP_10"
  | "REVENUE_DROP_25"
  | "LOSE_TOP_CUSTOMER"
  | "SUPPLIER_COST_UP_20"
  | "PAYMENT_DELAY_30D"
  | "UNEXPECTED_EXPENSE";

export interface StressTestResult {
  id: StressTestId;
  label: string;
  projectedCash90d: number;
  projectedRunwayMonths: number | null;
  liquidityImpact: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  notes: string[];
}

const LABELS: Record<StressTestId, string> = {
  REVENUE_DROP_10: "Revenue drops 10%",
  REVENUE_DROP_25: "Revenue drops 25%",
  LOSE_TOP_CUSTOMER: "Top customer is lost",
  SUPPLIER_COST_UP_20: "Supplier costs rise 20%",
  PAYMENT_DELAY_30D: "Customer payments delay 30 days",
  UNEXPECTED_EXPENSE: "Unexpected one-time expense",
};

function impactFor(runwayMonths: number | null, baselineRunway: number | null): StressTestResult["liquidityImpact"] {
  if (runwayMonths === null) return "LOW";
  if (runwayMonths < 1) return "SEVERE";
  if (runwayMonths < 2) return "HIGH";
  if (baselineRunway !== null && runwayMonths < baselineRunway * 0.7) return "MODERATE";
  return "LOW";
}

export function runStressTest(
  id: StressTestId,
  baseline: BaselineSnapshot,
  topCustomerSharePct: number
): StressTestResult {
  let projected;
  switch (id) {
    case "REVENUE_DROP_10":
      projected = simpleRevenueDrop(baseline, 0.1);
      break;
    case "REVENUE_DROP_25":
      projected = simpleRevenueDrop(baseline, 0.25);
      break;
    case "LOSE_TOP_CUSTOMER":
      projected = runScenario(baseline, "LOSE_TOP_CUSTOMER", { revenueSharePct: topCustomerSharePct });
      break;
    case "SUPPLIER_COST_UP_20":
      projected = runScenario(baseline, "NEW_SUPPLIER_COST", { costIncreasePct: 0.2 });
      break;
    case "PAYMENT_DELAY_30D":
      projected = runScenario(baseline, "EXTEND_CUSTOMER_TERMS", { additionalDays: 30, receivablesImpact: 1 });
      break;
    case "UNEXPECTED_EXPENSE":
      projected = runScenario(baseline, "PURCHASE_EQUIPMENT", {
        oneTimeCost: baseline.monthlyExpenses,
        monthlyMaintenanceCost: 0,
        expectedEfficiencyGainPct: 0,
      });
      break;
  }

  return {
    id,
    label: LABELS[id],
    projectedCash90d: projected.projectedCash90d,
    projectedRunwayMonths: projected.projectedRunwayMonths,
    liquidityImpact: impactFor(projected.projectedRunwayMonths, baseline.runwayMonths),
    notes: projected.notes,
  };
}

function simpleRevenueDrop(baseline: BaselineSnapshot, pct: number) {
  return runScenario(baseline, "LOSE_TOP_CUSTOMER", { revenueSharePct: pct });
}

export const ALL_STRESS_TESTS: StressTestId[] = [
  "REVENUE_DROP_10",
  "REVENUE_DROP_25",
  "LOSE_TOP_CUSTOMER",
  "SUPPLIER_COST_UP_20",
  "PAYMENT_DELAY_30D",
  "UNEXPECTED_EXPENSE",
];
