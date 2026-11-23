import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bordered stat card used across committee pages. */
export function StatTile({
  icon: Icon,
  label,
  value,
  tone = "text-foreground",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border-2 p-4", className)}>
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Icon className={cn("size-5", tone)} strokeWidth={2.6} aria-hidden />
        {label}
      </div>
      <p className="mt-1 money text-2xl font-bold">{value}</p>
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border-2 p-4", className)}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="font-bold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Thick rounded progress bar with a glossy highlight. */
export function ChunkyProgress({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-4 overflow-hidden rounded-full bg-muted"
    >
      <div
        className="relative h-full rounded-full bg-primary transition-[width] duration-500 after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/30"
        style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}
