"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function SettingsPage() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { name?: string; email: string; role: string; organizationId: string } }>("/api/auth/me"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardTitle>Account</CardTitle>
        <div className="mt-3 space-y-1 text-sm">
          <div>Email: {data?.user.email}</div>
          <div>Role: <Badge tone="accent">{data?.user.role}</Badge></div>
        </div>
      </Card>

      <Card>
        <CardTitle>AI Providers</CardTitle>
        <p className="mt-2 text-sm text-[var(--muted)]">
          TrustLedger works fully offline with a deterministic mock narrator. To enable a real LLM, set one of{" "}
          <code className="font-numeric">ANTHROPIC_API_KEY</code>, <code className="font-numeric">OPENAI_API_KEY</code>, or{" "}
          <code className="font-numeric">GOOGLE_API_KEY</code> in your environment and restart the server. See{" "}
          <code className="font-numeric">.env.example</code>.
        </p>
      </Card>

      <Card>
        <CardTitle>Disclaimer</CardTitle>
        <p className="mt-2 text-sm text-[var(--muted)]">
          TrustLedger is a research/demo prototype using synthetic data. It does not move real money, execute real transactions,
          or make legally binding credit decisions. All risk and health scoring is decision-support only.
        </p>
      </Card>
    </div>
  );
}
