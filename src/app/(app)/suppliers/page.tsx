"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";

interface SupplierRow {
  id: string;
  name: string;
  category: string;
  outstanding: number;
  overdue: number;
  billCount: number;
}

export default function SuppliersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<{ suppliers: SupplierRow[] }>("/api/suppliers"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <Card className="p-0">
        {isLoading && <div className="p-5 text-sm text-[var(--muted)]">Loading suppliers…</div>}
        {error && <div className="p-5 text-sm text-[var(--high)]">Failed to load suppliers.</div>}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Overdue</th>
                <th className="px-4 py-3 text-right">Bills</th>
              </tr>
            </thead>
            <tbody>
              {[...data.suppliers].sort((a, b) => b.outstanding - a.outstanding).map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)]/50">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5"><Badge>{s.category}</Badge></td>
                  <td className="px-4 py-2.5 text-right font-numeric">{formatINR(s.outstanding)}</td>
                  <td className="px-4 py-2.5 text-right font-numeric text-[var(--high)]">{s.overdue > 0 ? formatINR(s.overdue) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-numeric text-[var(--muted)]">{s.billCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
