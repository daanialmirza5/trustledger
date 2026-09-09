import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={clsx("text-sm font-medium text-[var(--muted)] uppercase tracking-wide", className)}>{children}</h3>;
}
