import { describe, it, expect } from "vitest";
import { projectReceivableObligations, projectPayableObligations, typicalCollectionLagDays } from "@/lib/analytics/obligations";
import { computeReceivables } from "@/lib/analytics/receivables";
import type { InvoiceRecord, ExpenseRecord } from "@/lib/analytics/types";

function inv(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    id: "i1", customerId: "c1", customerName: "ABC", invoiceNumber: "INV-1",
    issueDate: new Date("2026-01-01"), dueDate: new Date("2026-01-15"),
    amount: 10000, paidAmount: 0, ...overrides,
  };
}

function exp(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    id: "e1", supplierId: "s1", supplierName: "Supplier", category: "Procurement",
    date: new Date("2026-01-01"), amount: 5000, dueDate: new Date("2026-01-20"), paid: false, ...overrides,
  };
}

describe("typicalCollectionLagDays", () => {
  it("returns 0 when there is no outstanding receivable", () => {
    const r = computeReceivables([], new Date("2026-03-01"));
    expect(typicalCollectionLagDays(r)).toBe(0);
  });

  it("weights the lag toward buckets holding more outstanding amount", () => {
    const asOf = new Date("2026-03-01");
    const invoices = [
      inv({ id: "1", dueDate: new Date("2026-02-25"), amount: 1000 }), // current-ish
      inv({ id: "2", dueDate: new Date("2025-11-01"), amount: 9000 }), // 90+ days
    ];
    const r = computeReceivables(invoices, asOf);
    // Mostly weighted toward the 90+ bucket (midpoint 100) since it holds 9x the amount.
    expect(typicalCollectionLagDays(r)).toBeGreaterThan(50);
  });
});

describe("projectReceivableObligations", () => {
  const asOf = new Date("2026-03-01");

  it("projects only outstanding invoices, past their due date by the typical lag", () => {
    const invoices = [inv({ amount: 10000, paidAmount: 0, dueDate: new Date("2026-03-10") })];
    const receivables = computeReceivables(invoices, asOf);
    const obligations = projectReceivableObligations(invoices, receivables, asOf, 90);
    expect(obligations).toHaveLength(1);
    expect(obligations[0].amount).toBe(10000);
    expect(obligations[0].date >= "2026-03-10").toBe(true);
  });

  it("excludes fully paid invoices", () => {
    const invoices = [inv({ amount: 10000, paidAmount: 10000 })];
    const receivables = computeReceivables(invoices, asOf);
    expect(projectReceivableObligations(invoices, receivables, asOf, 90)).toHaveLength(0);
  });

  it("pulls an already-overdue invoice's expected collection to just after `asOf`, not skipped", () => {
    const invoices = [inv({ amount: 5000, dueDate: new Date("2025-01-01") })];
    const receivables = computeReceivables(invoices, asOf);
    const obligations = projectReceivableObligations(invoices, receivables, asOf, 90);
    expect(obligations).toHaveLength(1);
    expect(new Date(obligations[0].date) >= asOf).toBe(true);
  });

  it("excludes obligations expected beyond the forecast horizon", () => {
    const invoices = [inv({ amount: 5000, dueDate: new Date("2026-08-01") })]; // ~150d out
    const receivables = computeReceivables(invoices, asOf);
    expect(projectReceivableObligations(invoices, receivables, asOf, 90)).toHaveLength(0);
  });
});

describe("projectPayableObligations", () => {
  const asOf = new Date("2026-03-01");

  it("projects unpaid expenses on their due date", () => {
    const expenses = [exp({ amount: 5000, dueDate: new Date("2026-03-15") })];
    const obligations = projectPayableObligations(expenses, asOf, 90);
    expect(obligations).toHaveLength(1);
    expect(obligations[0].date).toBe("2026-03-15");
  });

  it("excludes already-paid expenses", () => {
    const expenses = [exp({ paid: true })];
    expect(projectPayableObligations(expenses, asOf, 90)).toHaveLength(0);
  });

  it("pulls an overdue bill's expected payment to just after `asOf`", () => {
    const expenses = [exp({ dueDate: new Date("2026-01-01") })];
    const obligations = projectPayableObligations(expenses, asOf, 90);
    expect(new Date(obligations[0].date) >= asOf).toBe(true);
  });
});
