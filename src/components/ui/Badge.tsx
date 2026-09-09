import { clsx } from "clsx";

const LEVEL_STYLES: Record<string, string> = {
  LOW: "bg-[var(--low)]/15 text-[var(--low)] border-[var(--low)]/30",
  MODERATE: "bg-[var(--moderate)]/15 text-[var(--moderate)] border-[var(--moderate)]/30",
  HIGH: "bg-[var(--high)]/15 text-[var(--high)] border-[var(--high)]/30",
  CRITICAL: "bg-[var(--critical)]/15 text-[var(--critical)] border-[var(--critical)]/30",
};

export function RiskBadge({ level }: { level: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", LEVEL_STYLES[level] ?? LEVEL_STYLES.LOW)}>
      {level}
    </span>
  );
}

const HEALTH_BAND_TO_LEVEL: Record<string, string> = {
  STRONG: "LOW",
  HEALTHY: "LOW",
  STABLE: "MODERATE",
  AT_RISK: "HIGH",
  CRITICAL: "CRITICAL",
};

export function HealthBandBadge({ band }: { band: string }) {
  const level = HEALTH_BAND_TO_LEVEL[band] ?? "LOW";
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", LEVEL_STYLES[level] ?? LEVEL_STYLES.LOW)}>
      {band.replace(/_/g, " ")}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-white/5 text-[var(--muted)] border-[var(--border)]",
    accent: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
    success: "bg-[var(--low)]/15 text-[var(--low)] border-[var(--low)]/30",
    danger: "bg-[var(--high)]/15 text-[var(--high)] border-[var(--high)]/30",
  };
  return <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}
