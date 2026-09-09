"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";
import type { DetectedAnomaly } from "@/lib/analytics/anomaly";

export default function AnomaliesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => apiFetch<{ anomalies: DetectedAnomaly[] }>("/api/anomalies"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Anomaly Center</h1>
        <p className="text-sm text-[var(--muted)]">Statistical outliers requiring review — not automatically labeled as fraud or error.</p>
      </div>

      {isLoading && <div className="text-sm text-[var(--muted)]">Loading…</div>}
      {error && <div className="text-sm text-[var(--high)]">Failed to load anomalies.</div>}
      {data && data.anomalies.length === 0 && <Card>No anomalies detected in the recent window.</Card>}

      <div className="space-y-3">
        {data?.anomalies.map((a) => (
          <Card key={a.transactionId}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-numeric text-xl font-semibold">{formatINR(a.amount)}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">Category: {a.category}</div>
              </div>
              <Badge tone="danger">z = {a.zScore}</Badge>
            </div>
            <p className="mt-3 text-sm">
              Expected range: <span className="font-numeric">{formatINR(a.expectedLow)} – {formatINR(a.expectedHigh)}</span>
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{a.reason}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
