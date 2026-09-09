"use client";

import { useQuery } from "@tanstack/react-query";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatINR } from "@/lib/format";
import type { ForecastRun } from "@/lib/analytics/forecast";
import type { RunwayResult } from "@/lib/analytics/runway";

interface ForecastResponse {
  forecast: ForecastRun;
  runway: RunwayResult;
  currentCash: number;
}

export default function ForecastPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast"],
    queryFn: () => apiFetch<ForecastResponse>("/api/forecast"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load forecast.</div>;

  const day90 = data.forecast.points.at(-1);
  const chartData = data.forecast.points.filter((_, i) => i % 2 === 0);

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

      <Card>
        <CardTitle>Cash Trajectory</CardTitle>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
              <XAxis dataKey="date" stroke="#8b98a8" fontSize={11} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#8b98a8" fontSize={12} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip contentStyle={{ background: "#161d26", border: "1px solid #232b36" }} formatter={(v) => formatINR(Number(v))} />
              <Area dataKey="upper" stroke="none" fill="#4f8cff" fillOpacity={0.1} />
              <Area dataKey="lower" stroke="none" fill="#0b0f14" fillOpacity={1} />
              <Line type="monotone" dataKey="expected" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
