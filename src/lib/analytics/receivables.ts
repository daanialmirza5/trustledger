import type { InvoiceRecord } from "./types";

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
}

export interface CustomerReceivable {
  customerId: string;
  customerName: string;
  outstanding: number;
  daysOverdue: number;
  shareOfReceivables: number;
  risk: "LOW" | "MODERATE" | "HIGH";
}

export interface ReceivablesResult {
  totalOutstanding: number;
  buckets: AgingBuckets;
  byCustomer: CustomerReceivable[];
}

export function computeReceivables(invoices: InvoiceRecord[], asOf: Date): ReceivablesResult {
  const buckets: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const byCustomerMap = new Map<string, { name: string; outstanding: number; maxOverdue: number }>();

  let totalOutstanding = 0;

  for (const inv of invoices) {
    const outstanding = inv.amount - inv.paidAmount;
    if (outstanding <= 0) continue;
    totalOutstanding += outstanding;

    const daysOverdue = Math.max(
      0,
      Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysOverdue === 0) buckets.current += outstanding;
    else if (daysOverdue <= 30) buckets.d1_30 += outstanding;
    else if (daysOverdue <= 60) buckets.d31_60 += outstanding;
    else if (daysOverdue <= 90) buckets.d61_90 += outstanding;
    else buckets.d90plus += outstanding;

    const existing = byCustomerMap.get(inv.customerId);
    if (existing) {
      existing.outstanding += outstanding;
      existing.maxOverdue = Math.max(existing.maxOverdue, daysOverdue);
    } else {
      byCustomerMap.set(inv.customerId, {
        name: inv.customerName,
        outstanding,
        maxOverdue: daysOverdue,
      });
    }
  }

  const byCustomer: CustomerReceivable[] = Array.from(byCustomerMap.entries())
    .map(([customerId, v]) => {
      const shareOfReceivables = totalOutstanding > 0 ? v.outstanding / totalOutstanding : 0;
      let risk: CustomerReceivable["risk"] = "LOW";
      if (v.maxOverdue > 60 || shareOfReceivables > 0.3) risk = "HIGH";
      else if (v.maxOverdue > 30 || shareOfReceivables > 0.15) risk = "MODERATE";
      return {
        customerId,
        customerName: v.name,
        outstanding: v.outstanding,
        daysOverdue: v.maxOverdue,
        shareOfReceivables,
        risk,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);

  return { totalOutstanding, buckets, byCustomer };
}
