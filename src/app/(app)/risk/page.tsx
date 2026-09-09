"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { RiskBadge, HealthBandBadge } from "@/components/ui/Badge";
import type { RiskResult } from "@/lib/analytics/types";
import type { HealthScoreResult } from "@/lib/analytics/healthScore";

interface RiskResponse {
  risks: RiskResult[];
  health: HealthScoreResult;
}

export default function RiskPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["risk"],
    queryFn: () => apiFetch<RiskResponse>("/api/risk"),
  });

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load risk data.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Risk Center</h1>
        <p className="text-sm text-[var(--muted)]">Decision-support only — every score below is a deterministic, documented calculation, not a lending decision.</p>
      </div>

      <Card>
        <CardTitle>Financial Health Score</CardTitle>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-numeric text-3xl font-semibold">{data.health.score}</span>
          <span className="text-sm text-[var(--muted)]">/ 100</span>
          <HealthBandBadge band={data.health.band} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--low)]">Positive factors</div>
            <ul className="space-y-1 text-sm">
              {data.health.positives.map((p, i) => (
                <li key={i}>+ {p.label} ({p.points})</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--high)]">Negative factors</div>
            <ul className="space-y-1 text-sm">
              {data.health.negatives.map((n, i) => (
                <li key={i}>- {n.label} ({n.points})</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.risks.map((r) => (
          <Card key={r.riskType}>
            <div className="flex items-center justify-between">
              <CardTitle>{r.riskType.replace(/_/g, " ")}</CardTitle>
              <RiskBadge level={r.level} />
            </div>
            <div className="mt-2 font-numeric text-2xl font-semibold">{r.score}</div>
            {r.factors.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No elevated factors detected.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {r.factors.map((f, i) => (
                  <li key={i}>
                    {f.factor} <span className="font-numeric text-[var(--muted)]">(+{f.impact})</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
