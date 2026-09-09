"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart } from "recharts";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardTitle } from "@/components/ui/Card";
import { HealthBandBadge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";
import type { RiskResult } from "@/lib/analytics/types";
import type { HealthScoreResult } from "@/lib/analytics/healthScore";
import type { ForecastPoint } from "@/lib/analytics/types";
import type { MonthlyTrendPoint } from "@/lib/analytics/snapshot";

interface DashboardResponse {
  cash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netCashFlow: number;
  revenueChangePct: number;
  expenseChangePct: number;
  accountsReceivable: number;
  accountsPayable: number;
  runwayMonths: number | null;
  health: HealthScoreResult;
  risks: RiskResult[];
  topRisk: RiskResult | null;
  monthlyTrend: MonthlyTrendPoint[];
  forecastPoints: ForecastPoint[];
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/api/dashboard"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading dashboard…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load dashboard. <RetryHint /></div>;

  const elevatedRisks = data.risks.filter((r) => r.level !== "LOW");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Business Health</h1>
        <p className="text-sm text-[var(--muted)]">Nova Retail Systems — decision-support demo, not a real lending or compliance decision.</p>
      </div>

      {elevatedRisks.length > 0 && (
        <Card className="border-[var(--moderate)]/40 bg-[var(--moderate)]/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--moderate)]">Needs attention</div>
              <ul className="mt-1 space-y-1 text-sm">
                {elevatedRisks.slice(0, 3).map((r) => (
                  <li key={r.riskType}>
                    <span className="font-medium">{r.riskType.replace(/_/g, " ")}</span>
                    {r.factors[0] ? ` — ${r.factors[0].factor}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/risk" className="whitespace-nowrap text-sm text-[var(--accent)] hover:underline">
              View Risk Center →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Cash Available" value={formatINR(data.cash)} sublabel={data.runwayMonths ? `${data.runwayMonths} mo runway` : "No net burn"} />
        <StatTile label="Monthly Revenue" value={formatINR(data.monthlyRevenue)} trend={{ value: data.revenueChangePct }} />
        <StatTile label="Monthly Expenses" value={formatINR(data.monthlyExpenses)} trend={{ value: data.expenseChangePct, positiveIsGood: false }} />
        <StatTile label="Net Cash Flow (30d)" value={formatINR(data.netCashFlow)} />
        <StatTile label="Accounts Receivable" value={formatINR(data.accountsReceivable)} />
        <StatTile label="Accounts Payable" value={formatINR(data.accountsPayable)} />
        <StatTile label="Runway" value={data.runwayMonths ? `${data.runwayMonths} months` : "No net burn"} />
        <HealthTile health={data.health} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Revenue vs Expenses (6 months)</CardTitle>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
                <XAxis dataKey="month" stroke="#8b98a8" fontSize={12} />
                <YAxis stroke="#8b98a8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#161d26", border: "1px solid #232b36" }} formatter={(v) => formatINR(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#4f8cff" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} dot={false} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>90-Day Cash Forecast</CardTitle>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.forecastPoints.filter((_, i) => i % 3 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
                <XAxis dataKey="date" stroke="#8b98a8" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#8b98a8" fontSize={12} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip contentStyle={{ background: "#161d26", border: "1px solid #232b36" }} formatter={(v) => formatINR(Number(v))} />
                <Area dataKey="upper" stroke="none" fill="#4f8cff" fillOpacity={0.08} />
                <Area dataKey="lower" stroke="none" fill="#0b0f14" fillOpacity={1} />
                <Line type="monotone" dataKey="expected" stroke="#22d3ee" strokeWidth={2} dot={false} name="Expected" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HealthTile({ health }: { health: HealthScoreResult }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Financial Health</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-numeric text-2xl font-semibold">{health.score}</span>
        <span className="text-sm text-[var(--muted)]">/ 100</span>
      </div>
      <div className="mt-1">
        <HealthBandBadge band={health.band} />
      </div>
    </Card>
  );
}

function RetryHint() {
  return <span className="ml-1 text-[var(--muted)]">Try refreshing the page.</span>;
}
