import { describe, it, expect } from "vitest";
import { computeReceivables } from "@/lib/analytics/receivables";
import type { InvoiceRecord } from "@/lib/analytics/types";

function inv(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    id: "i1",
    customerId: "c1",
    customerName: "ABC",
    invoiceNumber: "INV-1",
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-15"),
    amount: 10000,
    paidAmount: 0,
    ...overrides,
  };
}

describe("computeReceivables", () => {
  const asOf = new Date("2026-03-01");

  it("buckets outstanding amounts by days overdue", () => {
    const invoices: InvoiceRecord[] = [
      inv({ id: "1", dueDate: new Date("2026-03-01"), amount: 1000 }), // due today -> current
      inv({ id: "2", dueDate: new Date("2026-02-10"), amount: 2000 }), // ~19d -> 1-30
      inv({ id: "3", dueDate: new Date("2026-01-01"), amount: 3000 }), // ~59d -> 31-60
      inv({ id: "4", dueDate: new Date("2025-11-01"), amount: 4000 }), // >90d
    ];
    const result = computeReceivables(invoices, asOf);
    expect(result.totalOutstanding).toBe(10000);
    expect(result.buckets.current).toBe(1000);
    expect(result.buckets.d1_30).toBe(2000);
    expect(result.buckets.d31_60).toBe(3000);
    expect(result.buckets.d90plus).toBe(4000);
  });

  it("excludes fully paid invoices", () => {
    const invoices = [inv({ amount: 5000, paidAmount: 5000 })];
    const result = computeReceivables(invoices, asOf);
    expect(result.totalOutstanding).toBe(0);
    expect(result.byCustomer).toHaveLength(0);
  });

  it("flags high risk for customers with large overdue concentration", () => {
    const invoices: InvoiceRecord[] = [
      inv({ id: "1", customerId: "big", customerName: "BigCo", dueDate: new Date("2025-10-01"), amount: 50000 }),
      inv({ id: "2", customerId: "small", customerName: "SmallCo", dueDate: new Date("2026-02-25"), amount: 1000 }),
    ];
    const result = computeReceivables(invoices, asOf);
    const big = result.byCustomer.find((c) => c.customerId === "big")!;
    expect(big.risk).toBe("HIGH");
  });
});
