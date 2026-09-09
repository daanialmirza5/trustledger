"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, Receipt, Users, Truck, FileText, Activity, TrendingUp,
  ShieldAlert, AlertTriangle, Share2, FlaskConical, Waves, Sparkles, ScrollText, Settings, LogOut,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/cashflow", label: "Cash Flow", icon: Activity },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/risk", label: "Risk Center", icon: ShieldAlert },
  { href: "/anomalies", label: "Anomaly Center", icon: AlertTriangle },
  { href: "/financial-graph", label: "Financial Graph", icon: Share2 },
  { href: "/scenarios", label: "What-If Simulator", icon: FlaskConical },
  { href: "/stress-test", label: "Stress Lab", icon: Waves },
  { href: "/insights", label: "AI Analyst", icon: Sparkles },
  { href: "/audit", label: "Audit Trail", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { name?: string; email: string; role: string } }>("/api/auth/me"),
    retry: false,
  });

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white">T</div>
        <div>
          <div className="text-sm font-semibold">TrustLedger</div>
          <div className="text-[10px] text-[var(--muted)]">Financial Intelligence</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] px-4 py-3">
        {data?.user && (
          <div className="mb-2 text-xs">
            <div className="font-medium text-[var(--text)]">{data.user.email}</div>
            <div className="text-[var(--muted)]">{data.user.role}</div>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--text)]">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
