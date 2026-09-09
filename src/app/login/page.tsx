"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api/client";

const DEMO_LOGINS = [
  { role: "Owner", email: "owner@novaretail.demo" },
  { role: "Accountant", email: "accountant@novaretail.demo" },
  { role: "Analyst", email: "analyst@novaretail.demo" },
  { role: "Admin", email: "admin@novaretail.demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@novaretail.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white">T</div>
          <div>
            <div className="text-lg font-semibold">TrustLedger</div>
            <div className="text-xs text-[var(--muted)]">Turn business activity into financial intelligence.</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          {error && <p className="text-xs text-[var(--high)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-xs text-[var(--muted)]">Demo logins (password: demo1234):</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo1234");
                }}
                className="rounded-md border border-[var(--border)] px-2 py-1.5 text-left text-xs hover:border-[var(--accent)]"
              >
                <div className="font-medium">{d.role}</div>
                <div className="text-[var(--muted)]">{d.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
