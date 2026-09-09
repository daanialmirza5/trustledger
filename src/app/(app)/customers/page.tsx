"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";

interface CustomerRow {
  id: string;
  name: string;
  segment: string;
  outstanding: number;
  daysOverdue: number;
  risk: string;
}

export default function CustomersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ customers: CustomerRow[] }>("/api/customers"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      <Card className="p-0">
        {isLoading && <div className="p-5 text-sm text-[var(--muted)]">Loading customers…</div>}
        {error && <div className="p-5 text-sm text-[var(--high)]">Failed to load customers.</div>}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Days Overdue</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {[...data.customers].sort((a, b) => b.outstanding - a.outstanding).map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)]/50 hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <Link href={`/customers/${c.id}`} className="text-[var(--accent)] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{c.segment}</td>
                  <td className="px-4 py-2.5 text-right font-numeric">{formatINR(c.outstanding)}</td>
                  <td className="px-4 py-2.5 text-right font-numeric">{c.daysOverdue}</td>
                  <td className="px-4 py-2.5">
                    <RiskBadge level={c.risk} />
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
