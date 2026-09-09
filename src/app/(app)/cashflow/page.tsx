"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/format";
import type { CashFlowResult } from "@/lib/analytics/cashflow";
import type { ReceivablesResult } from "@/lib/analytics/receivables";
import type { PayablesResult } from "@/lib/analytics/payables";
import type { ConcentrationResult } from "@/lib/analytics/concentration";

interface CashFlowResponse {
  cashFlow30d: CashFlowResult;
  receivables: ReceivablesResult;
  payables: PayablesResult;
  customerConcentration: ConcentrationResult;
  supplierConcentration: ConcentrationResult;
}

export default function CashFlowPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cashflow"],
    queryFn: () => apiFetch<CashFlowResponse>("/api/cashflow"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load cash flow.</div>;

  const agingData = [
    { bucket: "Current", value: data.receivables.buckets.current },
    { bucket: "1-30d", value: data.receivables.buckets.d1_30 },
    { bucket: "31-60d", value: data.receivables.buckets.d31_60 },
    { bucket: "61-90d", value: data.receivables.buckets.d61_90 },
    { bucket: "90d+", value: data.receivables.buckets.d90plus },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cash Flow</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardTitle>Operating</CardTitle>
          <div className="mt-2 font-numeric text-lg">
            +{formatINR(data.cashFlow30d.inflows.operating)} / -{formatINR(data.cashFlow30d.outflows.operating)}
          </div>
        </Card>
        <Card>
          <CardTitle>Investing</CardTitle>
          <div className="mt-2 font-numeric text-lg">
            +{formatINR(data.cashFlow30d.inflows.investing)} / -{formatINR(data.cashFlow30d.outflows.investing)}
          </div>
        </Card>
        <Card>
          <CardTitle>Financing</CardTitle>
          <div className="mt-2 font-numeric text-lg">
            +{formatINR(data.cashFlow30d.inflows.financing)} / -{formatINR(data.cashFlow30d.outflows.financing)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Receivables Aging</CardTitle>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
                <XAxis dataKey="bucket" stroke="#8b98a8" fontSize={12} />
                <YAxis stroke="#8b98a8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#161d26", border: "1px solid #232b36" }} formatter={(v) => formatINR(Number(v))} />
                <Bar dataKey="value" fill="#4f8cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Upcoming Cash Obligations (7 days)</CardTitle>
          <div className="mt-4 space-y-2">
            {data.payables.upcoming7d.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing due in the next 7 days.</p>}
            {data.payables.upcoming7d.map((o, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{o.name}</span>
                <span className="font-numeric">{formatINR(o.amount)}</span>
              </div>
            ))}
            {data.payables.upcoming7d.length > 0 && (
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="font-numeric">{formatINR(data.payables.upcoming7dTotal)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Customer Concentration</CardTitle>
          <p className="mt-2 text-sm">
            Top customer: <span className="font-numeric">{data.customerConcentration.topEntity ? `${(data.customerConcentration.topEntity.share * 100).toFixed(0)}%` : "—"}</span>
            {" · "}Top 5: <span className="font-numeric">{(data.customerConcentration.top5Share * 100).toFixed(0)}%</span>
          </p>
        </Card>
        <Card>
          <CardTitle>Supplier Concentration</CardTitle>
          <p className="mt-2 text-sm">
            Top supplier: <span className="font-numeric">{data.supplierConcentration.topEntity ? `${(data.supplierConcentration.topEntity.share * 100).toFixed(0)}%` : "—"}</span>
            {" · "}Top 5: <span className="font-numeric">{(data.supplierConcentration.top5Share * 100).toFixed(0)}%</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
