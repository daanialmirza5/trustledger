import { prisma } from "@/lib/db/client";
import { computeCashFlow, dailyNetSeries } from "./cashflow";
import { forecastCashFlow } from "./forecast";
import { computeRunway } from "./runway";
import { computeReceivables } from "./receivables";
import { computePayables } from "./payables";
import { projectReceivableObligations, projectPayableObligations } from "./obligations";
import { computeConcentration } from "./concentration";
import { detectAnomalies, type DetectedAnomaly } from "./anomaly";
import { computeRiskAssessments, type RiskInputs } from "./risk";
import { computeHealthScore } from "./healthScore";
import type { CashFlowResult } from "./cashflow";
import type { ForecastRun } from "./forecast";
import type { RunwayResult } from "./runway";
import type { ReceivablesResult } from "./receivables";
import type { PayablesResult } from "./payables";
import type { ConcentrationResult } from "./concentration";
import type { RiskResult } from "./types";
import type { HealthScoreResult } from "./healthScore";
import type { TxRecord, InvoiceRecord, ExpenseRecord } from "./types";

export interface FinancialSnapshot {
  asOf: string;
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  previousMonthRevenue: number;
  previousMonthExpenses: number;
  revenueChangePct: number;
  expenseChangePct: number;
  cashFlow30d: CashFlowResult;
  forecast90d: ForecastRun;
  runway: RunwayResult;
  receivables: ReceivablesResult;
  payables: PayablesResult;
  customerConcentration: ConcentrationResult;
  supplierConcentration: ConcentrationResult;
  recentAnomalies: DetectedAnomaly[];
  risks: RiskResult[];
  health: HealthScoreResult;
}

async function loadTransactions(organizationId: string, from: Date, to: Date): Promise<TxRecord[]> {
  const rows = await prisma.transaction.findMany({
    where: { organizationId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    amount: r.amount,
    type: r.type,
    cashFlowClass: r.cashFlowClass,
    category: r.category,
    counterpartyType: r.counterpartyType,
    counterpartyId: r.counterpartyId,
    description: r.description,
  }));
}

async function loadInvoices(organizationId: string): Promise<InvoiceRecord[]> {
  const rows = await prisma.invoice.findMany({
    where: { organizationId },
    include: { customer: true },
  });
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customer.name,
    invoiceNumber: r.invoiceNumber,
    issueDate: r.issueDate,
    dueDate: r.dueDate,
    amount: r.amount,
    paidAmount: r.paidAmount,
  }));
}

async function loadExpenses(organizationId: string): Promise<ExpenseRecord[]> {
  const rows = await prisma.expense.findMany({
    where: { organizationId },
    include: { supplier: true },
  });
  return rows.map((r) => ({
    id: r.id,
    supplierId: r.supplierId,
    supplierName: r.supplier?.name ?? null,
    category: r.category,
    date: r.date,
    amount: r.amount,
    dueDate: r.dueDate,
    paid: r.paid,
  }));
}

function daysAgo(from: Date, n: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

/** The single source of truth every dashboard, risk, and AI-evidence view reads from. */
export async function computeSnapshot(organizationId: string, asOf: Date = new Date()): Promise<FinancialSnapshot> {
  const accounts = await prisma.account.findMany({ where: { organizationId } });
  const openingBalanceTotal = accounts.reduce((s, a) => s + a.openingBalance, 0);

  const allTxUpToNow = await loadTransactions(organizationId, new Date("2000-01-01"), asOf);
  const netToDate = allTxUpToNow.reduce((s, t) => s + (t.type === "INFLOW" ? t.amount : -t.amount), 0);
  const currentCash = openingBalanceTotal + netToDate;

  const last30 = allTxUpToNow.filter((t) => t.date >= daysAgo(asOf, 30));
  const prev30 = allTxUpToNow.filter((t) => t.date >= daysAgo(asOf, 60) && t.date < daysAgo(asOf, 30));

  const sumBy = (txs: TxRecord[], type: "INFLOW" | "OUTFLOW") =>
    txs.filter((t) => t.type === type && t.cashFlowClass === "OPERATING").reduce((s, t) => s + t.amount, 0);

  const monthlyRevenue = sumBy(last30, "INFLOW");
  const monthlyExpenses = sumBy(last30, "OUTFLOW");
  const previousMonthRevenue = sumBy(prev30, "INFLOW");
  const previousMonthExpenses = sumBy(prev30, "OUTFLOW");

  const revenueChangePct = previousMonthRevenue > 0 ? (monthlyRevenue - previousMonthRevenue) / previousMonthRevenue : 0;
  const expenseChangePct = previousMonthExpenses > 0 ? (monthlyExpenses - previousMonthExpenses) / previousMonthExpenses : 0;

  const cashFlow30d = computeCashFlow(last30, currentCash - last30.reduce((s, t) => s + (t.type === "INFLOW" ? t.amount : -t.amount), 0), daysAgo(asOf, 30), asOf);

  const invoices = await loadInvoices(organizationId);
  const receivables = computeReceivables(invoices, asOf);

  const expenses = await loadExpenses(organizationId);
  const payables = computePayables(expenses, asOf);

  // Forecast needs a longer history window to fit trend + weekly seasonality.
  // Known outstanding invoices/bills are layered on top of the pure
  // extrapolation (see obligations.ts) — the forecaster otherwise has no
  // visibility into cash that's already contractually expected.
  const forecastHistoryTx = allTxUpToNow.filter((t) => t.date >= daysAgo(asOf, 365));
  const series = dailyNetSeries(forecastHistoryTx);
  const dailyPoints = Array.from(series.entries()).map(([date, value]) => ({ date, value }));
  const forecastHorizonDays = 90;
  const knownReceivables = projectReceivableObligations(invoices, receivables, asOf, forecastHorizonDays);
  const knownPayables = projectPayableObligations(expenses, asOf, forecastHorizonDays);
  const forecast90d = forecastCashFlow(dailyPoints, currentCash, forecastHorizonDays, {
    receivables: knownReceivables,
    payables: knownPayables,
  });
  const forecast90dExpectedDelta = forecast90d.points[forecast90d.points.length - 1].expected - currentCash;
  const forecast90dLowerDelta = forecast90d.points[forecast90d.points.length - 1].lower - currentCash;

  const avgMonthlyBurn = -((monthlyRevenue - monthlyExpenses));
  const runway = computeRunway(currentCash, avgMonthlyBurn, forecast90dExpectedDelta, forecast90dLowerDelta);

  const last90 = allTxUpToNow.filter((t) => t.date >= daysAgo(asOf, 90));
  const customerRevenue = new Map<string, { name: string; amount: number }>();
  for (const t of last90) {
    if (t.type === "INFLOW" && t.counterpartyType === "CUSTOMER" && t.counterpartyId) {
      const cur = customerRevenue.get(t.counterpartyId) ?? { name: t.counterpartyId, amount: 0 };
      cur.amount += t.amount;
      customerRevenue.set(t.counterpartyId, cur);
    }
  }
  const custRows = await prisma.customer.findMany({ where: { organizationId } });
  for (const c of custRows) {
    const entry = customerRevenue.get(c.id);
    if (entry) entry.name = c.name;
  }
  const customerConcentration = computeConcentration(customerRevenue);

  const supplierExpense = new Map<string, { name: string; amount: number }>();
  for (const e of expenses) {
    if (e.supplierId && e.date >= daysAgo(asOf, 90)) {
      const cur = supplierExpense.get(e.supplierId) ?? { name: e.supplierName ?? e.supplierId, amount: 0 };
      cur.amount += e.amount;
      supplierExpense.set(e.supplierId, cur);
    }
  }
  const supplierConcentration = computeConcentration(supplierExpense);

  // Detect against full history for statistically sound per-category baselines
  // (a monthly category like Rent only has ~15 samples in a year), then narrow
  // to recent ones for display/risk-scoring purposes.
  const txById = new Map(allTxUpToNow.map((t) => [t.id, t]));
  const allAnomalies = detectAnomalies(allTxUpToNow);
  const recentAnomalies = allAnomalies.filter((a) => (txById.get(a.transactionId)?.date ?? new Date(0)) >= daysAgo(asOf, 180));

  const avgDailyOperatingInflow = monthlyRevenue / 30;
  const riskInputs: RiskInputs = {
    runwayMonths: runway.currentRunwayMonths,
    upcoming7dObligations: payables.upcoming7dTotal,
    expected7dInflow: avgDailyOperatingInflow * 7,
    revenueChangePct,
    expenseChangePct,
    receivablesAgingSharePct:
      receivables.totalOutstanding > 0
        ? (receivables.buckets.d31_60 + receivables.buckets.d61_90 + receivables.buckets.d90plus) / receivables.totalOutstanding
        : 0,
    topCustomerSharePct: customerConcentration.topEntity?.share ?? 0,
    topSupplierSharePct: supplierConcentration.topEntity?.share ?? 0,
    openAnomalyCount: recentAnomalies.length,
  };
  const risks = computeRiskAssessments(riskInputs);

  // Monthly net cash flow series (last 6 months) for volatility input to the health score.
  const monthlyNets: number[] = [];
  for (let m = 0; m < 6; m++) {
    const to = daysAgo(asOf, m * 30);
    const from = daysAgo(asOf, (m + 1) * 30);
    const windowTx = allTxUpToNow.filter((t) => t.date >= from && t.date < to);
    monthlyNets.push(windowTx.reduce((s, t) => s + (t.type === "INFLOW" ? t.amount : -t.amount), 0));
  }
  const meanNet = monthlyNets.reduce((s, v) => s + v, 0) / monthlyNets.length || 1;
  const varianceNet = monthlyNets.reduce((s, v) => s + (v - meanNet) ** 2, 0) / monthlyNets.length;
  const cashFlowVolatility = meanNet !== 0 ? Math.min(2, Math.abs(Math.sqrt(varianceNet) / meanNet)) : 1;

  const health = computeHealthScore({
    runwayMonths: runway.currentRunwayMonths,
    revenueChangePct,
    expenseChangePct,
    grossMarginPct: monthlyRevenue > 0 ? (monthlyRevenue - monthlyExpenses) / monthlyRevenue : 0,
    receivablesAgingSharePct: riskInputs.receivablesAgingSharePct,
    payablesOverduePct: payables.totalOutstanding > 0 ? payables.overdue / payables.totalOutstanding : 0,
    topCustomerSharePct: riskInputs.topCustomerSharePct,
    topSupplierSharePct: riskInputs.topSupplierSharePct,
    cashFlowVolatility,
  });

  return {
    asOf: asOf.toISOString(),
    currentCash: round2(currentCash),
    monthlyRevenue: round2(monthlyRevenue),
    monthlyExpenses: round2(monthlyExpenses),
    previousMonthRevenue: round2(previousMonthRevenue),
    previousMonthExpenses: round2(previousMonthExpenses),
    revenueChangePct,
    expenseChangePct,
    cashFlow30d,
    forecast90d,
    runway,
    receivables,
    payables,
    customerConcentration,
    supplierConcentration,
    recentAnomalies: recentAnomalies.slice(0, 20),
    risks,
    health,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface MonthlyTrendPoint {
  month: string; // YYYY-MM
  revenue: number;
  expenses: number;
  netCashFlow: number;
}

/** Last `months` calendar months of revenue/expense/net cash flow, oldest first. */
export async function computeMonthlyTrend(organizationId: string, months = 6, asOf: Date = new Date()): Promise<MonthlyTrendPoint[]> {
  const from = daysAgo(asOf, months * 31);
  const rows = await loadTransactions(organizationId, from, asOf);
  const points: MonthlyTrendPoint[] = [];

  for (let m = months - 1; m >= 0; m--) {
    const windowEnd = daysAgo(asOf, m * 30);
    const windowStart = daysAgo(asOf, (m + 1) * 30);
    const windowTx = rows.filter((t) => t.date >= windowStart && t.date < windowEnd && t.cashFlowClass === "OPERATING");
    const revenue = windowTx.filter((t) => t.type === "INFLOW").reduce((s, t) => s + t.amount, 0);
    const expenses = windowTx.filter((t) => t.type === "OUTFLOW").reduce((s, t) => s + t.amount, 0);
    points.push({
      month: windowEnd.toISOString().slice(0, 7),
      revenue: round2(revenue),
      expenses: round2(expenses),
      netCashFlow: round2(revenue - expenses),
    });
  }
  return points;
}
