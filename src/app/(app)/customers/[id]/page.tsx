"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR, formatDate } from "@/lib/format";

interface CustomerDetail {
  customer: { id: string; name: string; segment: string };
  invoices: { id: string; invoiceNumber: string; issueDate: string; dueDate: string; amount: number; paidAmount: number; status: string }[];
  transactions: { id: string; date: string; description: string; amount: number }[];
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer", params.id],
    queryFn: () => apiFetch<CustomerDetail>(`/api/customers/${params.id}`),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load customer.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{data.customer.name}</h1>
        <p className="text-sm text-[var(--muted)]">{data.customer.segment}</p>
      </div>

      <Card className="p-0">
        <div className="border-b border-[var(--border)] p-4"><CardTitle>Invoices</CardTitle></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]/50">
                <td className="px-4 py-2.5">{inv.invoiceNumber}</td>
                <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(inv.issueDate)}</td>
                <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(inv.dueDate)}</td>
                <td className="px-4 py-2.5 text-right font-numeric">{formatINR(inv.amount)}</td>
                <td className="px-4 py-2.5 text-right font-numeric">{formatINR(inv.paidAmount)}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "neutral"}>{inv.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-0">
        <div className="border-b border-[var(--border)] p-4"><CardTitle>Recent Payments</CardTitle></div>
        <table className="w-full text-sm">
          <tbody>
            {data.transactions.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)]/50">
                <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(t.date)}</td>
                <td className="px-4 py-2.5">{t.description}</td>
                <td className="px-4 py-2.5 text-right font-numeric text-[var(--low)]">+{formatINR(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
