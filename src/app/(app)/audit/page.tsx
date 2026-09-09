"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<{ events: AuditEvent[]; total: number }>("/api/audit"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Trail</h1>
        <p className="text-sm text-[var(--muted)]">{data ? `${data.total.toLocaleString("en-IN")} events` : "Loading…"}</p>
      </div>
      <Card className="p-0">
        {isLoading && <div className="p-5 text-sm text-[var(--muted)]">Loading…</div>}
        {error && <div className="p-5 text-sm text-[var(--high)]">This role cannot view the audit trail, or the request failed.</div>}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)]/50">
                  <td className="px-4 py-2.5 text-[var(--muted)]">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-2.5">{e.actor}</td>
                  <td className="px-4 py-2.5 font-numeric text-xs">{e.action}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{e.entity}:{e.entityId.slice(-6)}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{e.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
