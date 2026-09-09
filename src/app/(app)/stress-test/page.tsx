"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";
import type { StressTestResult } from "@/lib/analytics/stress";
import type { BaselineSnapshot } from "@/lib/analytics/simulation";

const IMPACT_TO_LEVEL: Record<string, string> = { LOW: "LOW", MODERATE: "MODERATE", HIGH: "HIGH", SEVERE: "CRITICAL" };

export default function StressTestPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stress-test"],
    queryFn: () => apiFetch<{ baseline: BaselineSnapshot; results: StressTestResult[] }>("/api/stress-test"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load the stress lab.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Financial Stress Lab</h1>
        <p className="text-sm text-[var(--muted)]">
          Baseline: {formatINR(data.baseline.currentCash)} cash, {formatINR(data.baseline.monthlyRevenue)} monthly revenue.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.results.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{r.label}</CardTitle>
              <RiskBadge level={IMPACT_TO_LEVEL[r.liquidityImpact] ?? "LOW"} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[var(--muted)]">Projected 90-day cash</div>
                <div className="font-numeric font-medium">{formatINR(r.projectedCash90d)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Projected runway</div>
                <div className="font-numeric font-medium">{r.projectedRunwayMonths !== null ? `${r.projectedRunwayMonths} months` : "No net burn"}</div>
              </div>
            </div>
            {r.notes.map((n, i) => (
              <p key={i} className="mt-2 text-xs text-[var(--muted)]">{n}</p>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
