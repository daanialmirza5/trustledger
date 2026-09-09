"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/format";

const SCENARIO_TYPES = [
  { type: "HIRE_EMPLOYEE", label: "Hire 2 employees" },
  { type: "INCREASE_MARKETING", label: "Increase marketing spend" },
  { type: "PURCHASE_EQUIPMENT", label: "Purchase equipment" },
  { type: "TAKE_LOAN", label: "Take a loan" },
  { type: "INCREASE_PRICES", label: "Increase prices 5%" },
  { type: "LOSE_TOP_CUSTOMER", label: "Lose top customer" },
  { type: "NEW_SUPPLIER_COST", label: "Supplier cost increase" },
  { type: "EXTEND_CUSTOMER_TERMS", label: "Extend customer payment terms" },
  { type: "ACCELERATE_COLLECTIONS", label: "Accelerate collections" },
  { type: "REDUCE_DISCRETIONARY_EXPENSES", label: "Reduce discretionary expenses" },
  { type: "DO_NOTHING", label: "Do nothing (baseline)" },
];

interface ScenarioRow {
  id: string;
  name: string;
  type: string;
  results: { deltaSummary: string; projected: string }[];
}

export default function ScenariosPage() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState(SCENARIO_TYPES[0].type);
  const { data } = useQuery({ queryKey: ["scenarios"], queryFn: () => apiFetch<{ scenarios: ScenarioRow[] }>("/api/scenarios") });

  const createAndRun = useMutation({
    mutationFn: async () => {
      const label = SCENARIO_TYPES.find((s) => s.type === selectedType)!.label;
      const created = await apiFetch<{ scenario: { id: string } }>("/api/scenarios", {
        method: "POST",
        body: JSON.stringify({ name: label, type: selectedType }),
      });
      return apiFetch(`/api/scenarios/${created.scenario.id}/run`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">What-If Simulator</h1>
        <p className="text-sm text-[var(--muted)]">Simulations never modify the production ledger — every run compares against a fresh baseline snapshot.</p>
      </div>

      <Card>
        <CardTitle>Run a new scenario</CardTitle>
        <div className="mt-3 flex gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          >
            {SCENARIO_TYPES.map((s) => (
              <option key={s.type} value={s.type}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => createAndRun.mutate()}
            disabled={createAndRun.isPending}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {createAndRun.isPending ? "Running…" : "Run scenario"}
          </button>
        </div>
      </Card>

      <div className="space-y-3">
        {data?.scenarios.map((s) => {
          const result = s.results[0];
          const projected = result ? JSON.parse(result.projected) : null;
          const delta = result ? JSON.parse(result.deltaSummary) : null;
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <CardTitle>{s.name}</CardTitle>
                <Badge tone="accent">{s.type.replace(/_/g, " ")}</Badge>
              </div>
              {projected ? (
                <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                  <Metric label="Monthly revenue Δ" value={formatINR(projected.monthlyRevenueDelta)} />
                  <Metric label="Monthly expense Δ" value={formatINR(projected.monthlyExpenseDelta)} />
                  <Metric label="90-day cash" value={formatINR(projected.projectedCash90d)} />
                  <Metric label="Projected runway" value={projected.projectedRunwayMonths !== null ? `${projected.projectedRunwayMonths} mo` : "No burn"} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">Not yet run.</p>
              )}
              {projected?.notes?.map((n: string, i: number) => (
                <p key={i} className="mt-2 text-xs text-[var(--muted)]">{n}</p>
              ))}
              {delta && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Annual revenue impact {formatINR(delta.annualRevenueImpact)} · Annual expense impact {formatINR(delta.annualExpenseImpact)}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="font-numeric font-medium">{value}</div>
    </div>
  );
}
