"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR, formatDate } from "@/lib/format";

interface Tx {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INFLOW" | "OUTFLOW";
  category: string;
  categorySource: string;
  categoryConfidence: number;
  isAnomaly: boolean;
  isDuplicateOf: string | null;
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", page],
    queryFn: () => apiFetch<{ total: number; transactions: Tx[] }>(`/api/transactions?page=${page}&pageSize=25`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-sm text-[var(--muted)]">{data ? `${data.total.toLocaleString("en-IN")} total` : "Loading…"}</p>
        </div>
        <Link href="/transactions/import" className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
          Import transactions
        </Link>
      </div>

      <Card className="p-0">
        {isLoading && <div className="p-5 text-sm text-[var(--muted)]">Loading transactions…</div>}
        {error && <div className="p-5 text-sm text-[var(--high)]">Failed to load transactions.</div>}
        {data && data.transactions.length === 0 && <div className="p-5 text-sm text-[var(--muted)]">No transactions yet.</div>}
        {data && data.transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)]/50">
                    <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5">{t.description}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={t.categorySource === "HUMAN" ? "success" : "neutral"}>{t.category}</Badge>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-numeric ${t.type === "INFLOW" ? "text-[var(--low)]" : "text-[var(--text)]"}`}>
                      {t.type === "INFLOW" ? "+" : "-"}
                      {formatINR(t.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {t.isAnomaly && <Badge tone="danger">Anomaly</Badge>}
                        {t.isDuplicateOf && <Badge tone="danger">Possible duplicate</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && (
        <div className="flex justify-end gap-2 text-sm">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <button disabled={page * 25 >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
