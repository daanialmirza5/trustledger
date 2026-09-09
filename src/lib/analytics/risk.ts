import type { RiskFactor, RiskLevel, RiskResult } from "./types";

// Configurable thresholds — see docs/risk-engine.md for the rationale behind
// each cutoff. Changing a number here changes scoring; nothing here is
// AI-generated or opaque.
export const RISK_THRESHOLDS = {
  liquidity: {
    runwayCriticalMonths: 2,
    runwayWarningMonths: 4,
    obligationsExceedInflowPct: 0.8, // upcoming 7d obligations vs expected 7d inflow
  },
  revenue: {
    declinePctWarning: 0.05,
    declinePctCritical: 0.15,
  },
  expense: {
    growthPctWarning: 0.1,
    growthPctCritical: 0.2,
  },
  receivables: {
    agingSharePctWarning: 0.2, // share of receivables > 30 days
    agingSharePctCritical: 0.4,
  },
  concentration: {
    topCustomerSharePctWarning: 0.25,
    topCustomerSharePctCritical: 0.4,
    topSupplierSharePctWarning: 0.3,
    topSupplierSharePctCritical: 0.5,
  },
  anomaly: {
    countWarning: 1,
    countCritical: 3,
  },
};

function levelFor(score: number): RiskLevel {
  if (score >= 70) return "CRITICAL";
  if (score >= 45) return "HIGH";
  if (score >= 20) return "MODERATE";
  return "LOW";
}

function build(riskType: string, factors: RiskFactor[]): RiskResult {
  const score = Math.min(100, factors.reduce((s, f) => s + f.impact, 0));
  return { riskType, score, level: levelFor(score), factors };
}

export interface RiskInputs {
  runwayMonths: number | null;
  upcoming7dObligations: number;
  expected7dInflow: number;
  revenueChangePct: number; // month-over-month
  expenseChangePct: number;
  receivablesAgingSharePct: number; // share outstanding > 30 days
  topCustomerSharePct: number;
  topSupplierSharePct: number;
  openAnomalyCount: number;
}

export function computeRiskAssessments(inputs: RiskInputs): RiskResult[] {
  const t = RISK_THRESHOLDS;
  const results: RiskResult[] = [];

  // LIQUIDITY
  const liqFactors: RiskFactor[] = [];
  if (inputs.runwayMonths !== null && inputs.runwayMonths < t.liquidity.runwayCriticalMonths) {
    liqFactors.push({ factor: `Cash runway is only ${inputs.runwayMonths} months`, impact: 50 });
  } else if (
    inputs.runwayMonths !== null &&
    inputs.runwayMonths < t.liquidity.runwayWarningMonths
  ) {
    liqFactors.push({ factor: `Cash runway is under ${t.liquidity.runwayWarningMonths} months`, impact: 20 });
  }
  if (
    inputs.expected7dInflow > 0 &&
    inputs.upcoming7dObligations / inputs.expected7dInflow > t.liquidity.obligationsExceedInflowPct
  ) {
    liqFactors.push({
      factor: "Upcoming 7-day obligations approach or exceed expected inflow",
      impact: 30,
    });
  }
  results.push(build("LIQUIDITY", liqFactors));

  // REVENUE
  const revFactors: RiskFactor[] = [];
  if (inputs.revenueChangePct <= -t.revenue.declinePctCritical) {
    revFactors.push({ factor: `Revenue declined ${pct(Math.abs(inputs.revenueChangePct))} month-over-month`, impact: 45 });
  } else if (inputs.revenueChangePct <= -t.revenue.declinePctWarning) {
    revFactors.push({ factor: `Revenue declined ${pct(Math.abs(inputs.revenueChangePct))} month-over-month`, impact: 20 });
  }
  results.push(build("REVENUE", revFactors));

  // EXPENSE
  const expFactors: RiskFactor[] = [];
  if (inputs.expenseChangePct >= t.expense.growthPctCritical) {
    expFactors.push({ factor: `Expenses grew ${pct(inputs.expenseChangePct)} month-over-month`, impact: 40 });
  } else if (inputs.expenseChangePct >= t.expense.growthPctWarning) {
    expFactors.push({ factor: `Expenses grew ${pct(inputs.expenseChangePct)} month-over-month`, impact: 18 });
  }
  results.push(build("EXPENSE", expFactors));

  // RECEIVABLES
  const recFactors: RiskFactor[] = [];
  if (inputs.receivablesAgingSharePct >= t.receivables.agingSharePctCritical) {
    recFactors.push({
      factor: `${pct(inputs.receivablesAgingSharePct)} of receivables are more than 30 days overdue`,
      impact: 40,
    });
  } else if (inputs.receivablesAgingSharePct >= t.receivables.agingSharePctWarning) {
    recFactors.push({
      factor: `${pct(inputs.receivablesAgingSharePct)} of receivables are more than 30 days overdue`,
      impact: 20,
    });
  }
  results.push(build("RECEIVABLES", recFactors));

  // CONCENTRATION (customer + supplier)
  const conFactors: RiskFactor[] = [];
  if (inputs.topCustomerSharePct >= t.concentration.topCustomerSharePctCritical) {
    conFactors.push({ factor: `Top customer represents ${pct(inputs.topCustomerSharePct)} of revenue`, impact: 35 });
  } else if (inputs.topCustomerSharePct >= t.concentration.topCustomerSharePctWarning) {
    conFactors.push({ factor: `Top customer represents ${pct(inputs.topCustomerSharePct)} of revenue`, impact: 18 });
  }
  if (inputs.topSupplierSharePct >= t.concentration.topSupplierSharePctCritical) {
    conFactors.push({ factor: `Top supplier represents ${pct(inputs.topSupplierSharePct)} of procurement`, impact: 30 });
  } else if (inputs.topSupplierSharePct >= t.concentration.topSupplierSharePctWarning) {
    conFactors.push({ factor: `Top supplier represents ${pct(inputs.topSupplierSharePct)} of procurement`, impact: 15 });
  }
  results.push(build("CONCENTRATION", conFactors));

  // ANOMALY
  const anomFactors: RiskFactor[] = [];
  if (inputs.openAnomalyCount >= t.anomaly.countCritical) {
    anomFactors.push({ factor: `${inputs.openAnomalyCount} unreviewed anomalies open`, impact: 30 });
  } else if (inputs.openAnomalyCount >= t.anomaly.countWarning) {
    anomFactors.push({ factor: `${inputs.openAnomalyCount} unreviewed ${inputs.openAnomalyCount === 1 ? "anomaly" : "anomalies"} open`, impact: 12 });
  }
  results.push(build("ANOMALY", anomFactors));

  return results;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
