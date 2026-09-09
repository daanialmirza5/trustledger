import { clsx } from "clsx";
import { Card } from "./Card";

export function StatTile({
  label,
  value,
  sublabel,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { value: number; positiveIsGood?: boolean };
}) {
  const trendGood = trend ? (trend.positiveIsGood ?? true ? trend.value >= 0 : trend.value < 0) : null;
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-numeric text-2xl font-semibold text-[var(--text)]">{value}</div>
      {(sublabel || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {trend && (
            <span className={clsx("font-numeric font-medium", trendGood ? "text-[var(--low)]" : "text-[var(--high)]")}>
              {trend.value >= 0 ? "+" : ""}
              {(trend.value * 100).toFixed(1)}%
            </span>
          )}
          {sublabel && <span className="text-[var(--muted)]">{sublabel}</span>}
        </div>
      )}
    </Card>
  );
}
