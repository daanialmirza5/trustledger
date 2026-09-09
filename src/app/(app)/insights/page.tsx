"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

const SAMPLE_QUESTIONS = [
  "Why did cash decline?",
  "What are the biggest expense drivers?",
  "Which customers create receivables risk?",
  "What upcoming obligations matter?",
  "Why is liquidity risk increasing?",
];

interface Insight {
  id: string;
  question: string | null;
  agent: string;
  provider: string;
  summary: string;
  detail: string;
  createdAt: string;
  evidenceLinks: { entityType: string; entityId: string; note: string | null }[];
}

export default function InsightsPage() {
  const qc = useQueryClient();
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const { data } = useQuery({ queryKey: ["insights"], queryFn: () => apiFetch<{ insights: Insight[] }>("/api/insights") });

  const ask = useMutation({
    mutationFn: () => apiFetch("/api/ai/analyze", { method: "POST", body: JSON.stringify({ question }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI Financial Analyst</h1>
        <p className="text-sm text-[var(--muted)]">
          Every answer is grounded in structured evidence computed by the deterministic analytics engines — the model narrates facts, it does not invent them.
        </p>
      </div>

      <Card>
        <CardTitle>Ask a question</CardTitle>
        <div className="mt-3 flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => ask.mutate()}
            disabled={ask.isPending}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {ask.isPending ? "Analyzing…" : "Ask"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAMPLE_QUESTIONS.map((q) => (
            <button key={q} onClick={() => setQuestion(q)} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)]">
              {q}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {data?.insights.map((i) => (
          <Card key={i.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{i.question ?? "Analysis"}</div>
                <div className="text-xs text-[var(--muted)]">{formatDate(i.createdAt)}</div>
              </div>
              <div className="flex gap-1.5">
                <Badge tone="accent">{i.agent.replace(/_/g, " ")}</Badge>
                <Badge>{i.provider}</Badge>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium">{i.summary}</p>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">{i.detail}</pre>
            {i.evidenceLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {i.evidenceLinks.map((e, idx) => (
                  <Badge key={idx}>{e.entityType}: {e.entityId}</Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
