"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR, formatDate } from "@/lib/format";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  customer: { name: string };
}

const STATUSES = ["ALL", "OPEN", "OVERDUE", "PAID"];

export default function InvoicesPage() {
  const [status, setStatus] = useState("ALL");
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", status],
    queryFn: () => apiFetch<{ invoices: InvoiceRow[]; total: number }>(`/api/invoices?pageSize=100${status !== "ALL" ? `&status=${status}` : ""}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs ${status === s ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <Card className="p-0">
        {isLoading && <div className="p-5 text-sm text-[var(--muted)]">Loading invoices…</div>}
        {error && <div className="p-5 text-sm text-[var(--high)]">Failed to load invoices.</div>}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--border)]/50">
                  <td className="px-4 py-2.5">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5">{inv.customer.name}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-2.5 text-right font-numeric">{formatINR(inv.amount)}</td>
                  <td className="px-4 py-2.5 text-right font-numeric">{formatINR(inv.amount - inv.paidAmount)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "neutral"}>{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
