import type { InvoiceRecord, ExpenseRecord } from "./types";
import type { ReceivablesResult } from "./receivables";
import type { KnownObligation } from "./forecast";

/**
 * Data-derived "typical collection lag" beyond an invoice's due date: the
 * amount-weighted average of this business's current receivables aging
 * buckets (current=0d, 1-30d=~15d, 31-60d=~45d, 61-90d=~75d, 90+=~100d).
 * This is not invented — it reflects the actual aging distribution measured
 * by computeReceivables() for this organization right now. See
 * docs/forecasting.md for why the forecaster needs this at all: raw
 * historical cash-flow extrapolation has no visibility into invoices that
 * are already issued but not yet paid.
 */
export function typicalCollectionLagDays(receivables: ReceivablesResult): number {
  const total = receivables.totalOutstanding;
  if (total <= 0) return 0;
  const b = receivables.buckets;
  const weighted = b.current * 0 + b.d1_30 * 15 + b.d31_60 * 45 + b.d61_90 * 75 + b.d90plus * 100;
  return weighted / total;
}

/**
 * Projects currently-outstanding invoices into expected future collection
 * events. Assumption (visible, not silent): each invoice collects on its
 * due date plus the business's current typical collection lag — not
 * "exactly on the due date," which would ignore this business's own
 * observed payment-delay pattern. Only outstanding amounts on real,
 * already-issued invoices are used; nothing is invented.
 */
export function projectReceivableObligations(
  invoices: InvoiceRecord[],
  receivablesSnapshot: ReceivablesResult,
  asOf: Date,
  horizonDays: number
): KnownObligation[] {
  const lagDays = typicalCollectionLagDays(receivablesSnapshot);
  const horizonEnd = new Date(asOf);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + horizonDays);

  const obligations: KnownObligation[] = [];
  for (const inv of invoices) {
    const outstanding = round2(inv.amount - inv.paidAmount);
    if (outstanding <= 0) continue;
    const expectedDate = new Date(inv.dueDate);
    expectedDate.setUTCDate(expectedDate.getUTCDate() + Math.round(lagDays));
    // Already-overdue collection is expected "soon" (next-day), not skipped.
    const clamped = expectedDate < asOf ? new Date(asOf.getTime() + 86400000) : expectedDate;
    if (clamped > horizonEnd) continue;
    obligations.push({
      date: clamped.toISOString().slice(0, 10),
      amount: outstanding,
      label: `Expected collection — ${inv.invoiceNumber} (${inv.customerName})`,
    });
  }
  return obligations;
}

/**
 * Projects currently-outstanding (unpaid) expenses into expected future
 * payment events. Assumption: paid on the due date, or immediately if
 * already overdue — suppliers are assumed paid on schedule absent evidence
 * otherwise (unlike receivables, we don't yet model a payables delay
 * pattern; see docs/forecasting.md limitations).
 */
export function projectPayableObligations(
  expenses: ExpenseRecord[],
  asOf: Date,
  horizonDays: number
): KnownObligation[] {
  const horizonEnd = new Date(asOf);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + horizonDays);

  const obligations: KnownObligation[] = [];
  for (const exp of expenses) {
    if (exp.paid || !exp.dueDate) continue;
    const due = exp.dueDate < asOf ? new Date(asOf.getTime() + 86400000) : exp.dueDate;
    if (due > horizonEnd) continue;
    obligations.push({
      date: due.toISOString().slice(0, 10),
      amount: exp.amount,
      label: `Expected payment — ${exp.supplierName ?? exp.category}`,
    });
  }
  return obligations;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
