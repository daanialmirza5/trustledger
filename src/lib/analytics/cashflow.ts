import type { TxRecord } from "./types";

export interface CashFlowBreakdown {
  operating: number;
  investing: number;
  financing: number;
}

export interface CashFlowResult {
  opening: number;
  inflows: CashFlowBreakdown;
  outflows: CashFlowBreakdown;
  netChange: number;
  closing: number;
}

function emptyBreakdown(): CashFlowBreakdown {
  return { operating: 0, investing: 0, financing: 0 };
}

/** Opening + inflows − outflows = closing, split by cash-flow-statement class. */
export function computeCashFlow(
  transactions: TxRecord[],
  openingBalance: number,
  from: Date,
  to: Date
): CashFlowResult {
  const inflows = emptyBreakdown();
  const outflows = emptyBreakdown();

  for (const tx of transactions) {
    if (tx.date < from || tx.date > to) continue;
    const bucket = tx.type === "INFLOW" ? inflows : outflows;
    const key = tx.cashFlowClass.toLowerCase() as keyof CashFlowBreakdown;
    bucket[key] += tx.amount;
  }

  const totalIn = inflows.operating + inflows.investing + inflows.financing;
  const totalOut = outflows.operating + outflows.investing + outflows.financing;
  const netChange = totalIn - totalOut;

  return {
    opening: openingBalance,
    inflows,
    outflows,
    netChange,
    closing: openingBalance + netChange,
  };
}

/** Buckets net daily cash movement, needed as input to the forecasting engine. */
export function dailyNetSeries(transactions: TxRecord[]): Map<string, number> {
  const series = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.date.toISOString().slice(0, 10);
    const signed = tx.type === "INFLOW" ? tx.amount : -tx.amount;
    series.set(key, (series.get(key) ?? 0) + signed);
  }
  return series;
}
