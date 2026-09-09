// Forecast evaluation: train on the earlier portion of history, forecast the
// held-out tail, and measure predicted-vs-actual cash trajectory. Numbers
// printed here are what actually got measured — copy them into
// docs/forecast-evaluation.md verbatim, don't round up or invent better ones.

import { PrismaClient } from "@prisma/client";
import { dailyNetSeries } from "../src/lib/analytics/cashflow";
import { forecastCashFlow } from "../src/lib/analytics/forecast";

const prisma = new PrismaClient();
const HOLDOUT_DAYS = 60;

async function main() {
  const org = await prisma.organization.findFirstOrThrow();
  const accounts = await prisma.account.findMany({ where: { organizationId: org.id } });
  const openingBalance = accounts.reduce((s, a) => s + a.openingBalance, 0);

  const allTx = await prisma.transaction.findMany({ where: { organizationId: org.id }, orderBy: { date: "asc" } });
  const lastDate = allTx.at(-1)!.date;
  const cutoff = new Date(lastDate.getTime() - HOLDOUT_DAYS * 86400000);

  const trainTx = allTx.filter((t) => t.date <= cutoff);
  const holdoutTx = allTx.filter((t) => t.date > cutoff);

  const cashAtCutoff =
    openingBalance + trainTx.reduce((s, t) => s + (t.type === "INFLOW" ? t.amount : -t.amount), 0);

  const trainSeries = dailyNetSeries(
    trainTx.map((t) => ({ id: t.id, date: t.date, amount: t.amount, type: t.type, cashFlowClass: t.cashFlowClass, category: t.category, counterpartyType: t.counterpartyType, counterpartyId: t.counterpartyId, description: t.description }))
  );
  const trainPoints = Array.from(trainSeries.entries()).map(([date, value]) => ({ date, value }));

  const forecast = forecastCashFlow(trainPoints, cashAtCutoff, HOLDOUT_DAYS);

  // Build actual cumulative cash for each day of the holdout.
  const holdoutNetByDate = new Map<string, number>();
  for (const t of holdoutTx) {
    const key = t.date.toISOString().slice(0, 10);
    const signed = t.type === "INFLOW" ? t.amount : -t.amount;
    holdoutNetByDate.set(key, (holdoutNetByDate.get(key) ?? 0) + signed);
  }

  let actualCumulative = cashAtCutoff;
  const errors: number[] = [];
  const pctErrors: number[] = [];
  const rows: { date: string; predicted: number; actual: number }[] = [];

  for (let h = 0; h < HOLDOUT_DAYS; h++) {
    const date = new Date(cutoff.getTime() + (h + 1) * 86400000);
    const key = date.toISOString().slice(0, 10);
    actualCumulative += holdoutNetByDate.get(key) ?? 0;
    const predicted = forecast.points[h].expected;
    const error = predicted - actualCumulative;
    errors.push(error);
    if (actualCumulative !== 0) pctErrors.push(Math.abs(error / actualCumulative));
    rows.push({ date: key, predicted: round2(predicted), actual: round2(actualCumulative) });
  }

  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
  const mape = (pctErrors.reduce((s, e) => s + e, 0) / pctErrors.length) * 100;

  console.log(`Training window: ${trainPoints.length} days with activity, up to ${cutoff.toISOString().slice(0, 10)}`);
  console.log(`Holdout: ${HOLDOUT_DAYS} days (${cutoff.toISOString().slice(0, 10)} -> ${lastDate.toISOString().slice(0, 10)})`);
  console.log(`Cash at cutoff: ${round2(cashAtCutoff)}`);
  console.log(`MAE: ${round2(mae)}`);
  console.log(`RMSE: ${round2(rmse)}`);
  console.log(`MAPE: ${round2(mape)}%`);
  console.log("Day 7 / 30 / 60:", rows[6], rows[29], rows[59]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

main().finally(() => prisma.$disconnect());
