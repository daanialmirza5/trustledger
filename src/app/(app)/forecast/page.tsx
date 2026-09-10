"use client";

import { useQuery } from "@tanstack/react-query";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";
import type { ForecastRun } from "@/lib/analytics/forecast";
import type { RunwayResult } from "@/lib/analytics/runway";

interface ForecastResponse {
  forecast: ForecastRun;
  runway: RunwayResult;
  currentCash: number;
}

const RELIABILITY_BANDS = [
  { label: "0–30 days", tone: "success" as const, note: "Higher confidence — closest to observed history." },
  { label: "31–60 days", tone: "accent" as const, note: "Moderate confidence — trend/seasonality dominate." },
  { label: "61–90 days", tone: "danger" as const, note: "Lower confidence — small drifts in trend compound." },
];

export default function ForecastPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast"],
    queryFn: () => apiFetch<ForecastResponse>("/api/forecast"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load forecast.</div>;

  const day90 = data.forecast.points.at(-1);
  const chartData = data.forecast.points.filter((_, i) => i % 2 === 0);
  const totalKnownReceivables = data.forecast.points.reduce((s, p) => s + p.knownReceivablesInflow, 0);
  const totalKnownPayables = data.forecast.points.reduce((s, p) => s + p.knownPayablesOutflow, 0);
  const usesKnownObligations = data.forecast.method.includes("known-ar-ap");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cash-Flow Forecast</h1>
        <p className="text-sm text-[var(--muted)]">
          Method: {data.forecast.method} · backtest RMSE ₹{data.forecast.backtest.rmse.toLocaleString("en-IN")} over {data.forecast.backtest.sampleSize} days
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="90-Day Expected" value={day90 ? formatINR(day90.expected) : "—"} />
        <StatTile label="Downside" value={day90 ? formatINR(day90.lower) : "—"} />
        <StatTile label="Upside" value={day90 ? formatINR(day90.upper) : "—"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Current Runway" value={data.runway.currentRunwayMonths !== null ? `${data.runway.currentRunwayMonths} months` : "No net burn"} />
        <StatTile label="Projected Runway" value={data.runway.projectedRunwayMonths !== null ? `${data.runway.projectedRunwayMonths} months` : "No net burn"} />
        <StatTile label="Worst-Case Runway" value={data.runway.worstCaseRunwayMonths !== null ? `${data.runway.worstCaseRunwayMonths} months` : "No net burn"} />
      </div>

      {usesKnownObligations && (
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Known Receivables (90d)" value={formatINR(totalKnownReceivables)} sublabel="Outstanding invoices expected to collect" />
          <StatTile label="Known Payables (90d)" value={formatINR(totalKnownPayables)} sublabel="Outstanding bills expected to be paid" />
        </div>
      )}

      <Card>
        <CardTitle>Cash Trajectory</CardTitle>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
              <XAxis dataKey="date" stroke="#8b98a8" fontSize={11} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#8b98a8" fontSize={12} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip contentStyle={{ background: "#161d26", border: "1px solid #232b36" }} formatter={(v) => formatINR(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="upper" stroke="none" fill="#4f8cff" fillOpacity={0.1} legendType="none" name="Upside band" />
              <Area dataKey="lower" stroke="none" fill="#0b0f14" fillOpacity={1} legendType="none" name="Downside band" />
              <Line type="monotone" dataKey="expected" stroke="#22d3ee" strokeWidth={2} dot={false} name="Adjusted expected" />
              <Line type="monotone" dataKey="modelExpected" stroke="#8b98a8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Model extrapolation only" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>How this forecast works</CardTitle>
          <div className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
            <p>Historical cash flow (damped trend + day-of-week seasonality)</p>
            <p className="pl-3">+ Known outstanding receivables (real open invoices, projected to their expected collection date)</p>
            <p className="pl-3">− Known outstanding payables (real open bills, projected to their due date)</p>
            <p className="border-t border-[var(--border)] pt-1.5 font-medium text-[var(--text)]">= Projected cash flow</p>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Confidence bands are computed from this model&apos;s actual backtested error, not an invented percentage — see{" "}
            <span className="font-numeric">docs/forecasting.md</span>. Accuracy has not been measured beyond the 60-day holdout in{" "}
            <span className="font-numeric">docs/forecast-evaluation.md</span>; treat longer horizons as directional.
          </p>
        </Card>

        <Card>
          <CardTitle>Forecast reliability by horizon</CardTitle>
          <p className="mt-1 text-xs text-[var(--muted)]">
            A qualitative read on how far out to trust this projection — not a statistical confidence interval (the shaded band above is the
            actual computed one).
          </p>
          <div className="mt-3 space-y-2">
            {RELIABILITY_BANDS.map((b) => (
              <div key={b.label} className="flex items-start gap-2 text-sm">
                <Badge tone={b.tone}>{b.label}</Badge>
                <span className="text-[var(--muted)]">{b.note}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
