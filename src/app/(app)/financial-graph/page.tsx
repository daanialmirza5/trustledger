"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import type { GraphNode, GraphEdge } from "@/app/api/graph/route";

const COLORS: Record<GraphNode["type"], string> = {
  BUSINESS: "#4f8cff",
  ACCOUNT: "#22d3ee",
  CUSTOMER: "#34d399",
  SUPPLIER: "#fb7185",
};

function layout(nodes: GraphNode[]): Node[] {
  const business = nodes.filter((n) => n.type === "BUSINESS");
  const accounts = nodes.filter((n) => n.type === "ACCOUNT");
  const customers = nodes.filter((n) => n.type === "CUSTOMER");
  const suppliers = nodes.filter((n) => n.type === "SUPPLIER");

  const result: Node[] = [];
  business.forEach((n, i) => result.push(toFlowNode(n, 400, 20 + i * 80)));
  accounts.forEach((n, i) => result.push(toFlowNode(n, 400, 160 + i * 90)));
  customers.forEach((n, i) => result.push(toFlowNode(n, 40, 20 + i * 70)));
  suppliers.forEach((n, i) => result.push(toFlowNode(n, 780, 20 + i * 70)));
  return result;
}

function toFlowNode(n: GraphNode, x: number, y: number): Node {
  return {
    id: n.id,
    position: { x, y },
    data: { label: (
      <div>
        <div className="text-xs font-semibold">{n.label}</div>
        {n.detail && <div className="text-[10px] opacity-70">{n.detail}</div>}
      </div>
    ) },
    style: { background: "#161d26", border: `1px solid ${COLORS[n.type]}`, borderRadius: 8, padding: 8, color: "#e6ebf1", width: 190 },
  };
}

export default function FinancialGraphPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["graph"],
    queryFn: () => apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/api/graph"),
  });
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const flowNodes = useMemo(() => (data ? layout(data.nodes) : []), [data]);
  const flowEdges: Edge[] = useMemo(
    () =>
      data
        ? data.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, style: { stroke: "#232b36" }, labelStyle: { fill: "#8b98a8", fontSize: 10 } }))
        : [],
    [data]
  );

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (error || !data) return <div className="text-sm text-[var(--high)]">Failed to load the financial graph.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Financial Graph</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="h-[600px] rounded-lg border border-[var(--border)] bg-[var(--surface)] lg:col-span-3">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={(_, node) => setSelected(data.nodes.find((n) => n.id === node.id) ?? null)}
            fitView
          >
            <Background color="#232b36" />
            <Controls />
          </ReactFlow>
        </div>
        <Card>
          <div className="text-sm font-medium">Details</div>
          {selected ? (
            <div className="mt-2 text-sm">
              <div className="font-semibold">{selected.label}</div>
              <div className="mt-1 text-[var(--muted)]">{selected.type}</div>
              {selected.detail && <div className="mt-2">{selected.detail}</div>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Click a node to inspect it.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
