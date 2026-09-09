"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const SAMPLE_CSV = `date,description,amount,type,category
2026-09-01,Payment received - Sample Customer,45000,INFLOW,Product Sales
2026-09-02,Payment to Sample Supplier,12000,OUTFLOW,Procurement
2026-09-03,SaaS Subscriptions,9000,OUTFLOW,Software & Operations`;

interface ImportResult {
  importedCount: number;
  rejected: { row: number; reason: string }[];
  flaggedDuplicates: { row: number; existingTransactionId: string; reason: string }[];
  categorized: { row: number; category: string; confidence: number }[];
}

export default function ImportPage() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [accountId, setAccountId] = useState<string>("");

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<{ accounts: { id: string; name: string }[] }>("/api/accounts"),
  });

  const mutation = useMutation({
    mutationFn: () => apiFetch<ImportResult>("/api/transactions/import", { method: "POST", body: JSON.stringify({ accountId, csv }) }),
  });

  const accounts = accountsData?.accounts ?? [];
  const selectedAccount = accountId || accounts[0]?.id || "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import Transactions</h1>
        <p className="text-sm text-[var(--muted)]">Raw fact → validation → normalization → categorization → duplicate detection → ledger.</p>
      </div>

      <Card>
        <CardTitle>CSV data</CardTitle>
        <p className="mt-1 text-xs text-[var(--muted)]">Columns: date, description, amount, type (INFLOW/OUTFLOW), category (optional)</p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 font-numeric text-xs outline-none focus:border-[var(--accent)]"
        />
        <div className="mt-3 flex items-center gap-3">
          <select
            value={selectedAccount}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedAccount}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? "Importing…" : "Run import"}
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-2 text-sm text-[var(--high)]">
            {mutation.error instanceof ApiClientError ? mutation.error.message : "Import failed."}
          </p>
        )}
      </Card>

      {mutation.data && (
        <Card>
          <CardTitle>Result</CardTitle>
          <div className="mt-3 flex gap-3 text-sm">
            <Badge tone="success">{mutation.data.importedCount} imported</Badge>
            <Badge tone={mutation.data.flaggedDuplicates.length > 0 ? "danger" : "neutral"}>
              {mutation.data.flaggedDuplicates.length} possible duplicates
            </Badge>
            <Badge tone={mutation.data.rejected.length > 0 ? "danger" : "neutral"}>{mutation.data.rejected.length} rejected</Badge>
          </div>

          {mutation.data.flaggedDuplicates.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-[var(--muted)]">Potential duplicates (review before trusting the ledger)</div>
              <ul className="mt-2 space-y-1 text-sm">
                {mutation.data.flaggedDuplicates.map((d, i) => (
                  <li key={i}>
                    Row {d.row + 1}: {d.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mutation.data.rejected.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-[var(--muted)]">Rejected rows</div>
              <ul className="mt-2 space-y-1 text-sm text-[var(--high)]">
                {mutation.data.rejected.map((r, i) => (
                  <li key={i}>
                    Row {r.row + 1}: {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
