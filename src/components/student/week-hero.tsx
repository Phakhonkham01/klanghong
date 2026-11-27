import Link from "next/link";
import { ScrollText } from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { ClassWeekStats } from "@/lib/data/types";
import type { WeekEntry } from "@/lib/status";
import { cn } from "@/lib/utils";

function countdown(daysLeft: number): string {
  if (daysLeft > 0) return lo.week.daysLeft(daysLeft);
  if (daysLeft === 0) return lo.week.dueToday;
  return lo.week.windowClosed;
}

/** Class-wide counts for this week inside the banner: numbers only, no names. */
function ClassStrip({ stats }: { stats: ClassWeekStats }) {
  const t = lo.dashboard;
  const paid = stats.paidTransfer + stats.paidCash;
  const unpaid = Math.max(0, stats.total - paid - stats.pending);
  const pct = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);
  const items = [
    { label: t.classTransfer, value: stats.paidTransfer, dot: "bg-primary" },
    { label: t.classCash, value: stats.paidCash, dot: "bg-brand-shade" },
    { label: t.classPending, value: stats.pending, dot: "bg-gold" },
    { label: t.classUnpaid, value: unpaid, dot: "bg-white/40" },
  ];
  return (
    <div className="border-t-2 border-sky-shade/50 px-4 pt-2 pb-3">
      <div className="flex items-baseline justify-between gap-2 text-xs font-bold">
        <span className="text-white/80">{t.classTitle}</span>
        <span className="money">{t.classPaid(paid, stats.total)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={stats.total}
        aria-valuenow={paid}
        aria-label={t.classPaid(paid, stats.total)}
        className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-white/25"
      >
        <span className="h-full bg-primary" style={{ width: `${pct(stats.paidTransfer)}%` }} />
        <span className="h-full bg-brand-shade" style={{ width: `${pct(stats.paidCash)}%` }} />
        <span className="h-full bg-gold" style={{ width: `${pct(stats.pending)}%` }} />
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold text-white/90">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", i.dot)} aria-hidden />
            {i.label} <span className="money font-bold text-white">{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Big sky banner for the current week (and how the class is doing), sticky under the header. */
export function WeekHero({
  entry,
  amount,
  daysLeft,
  classStats,
}: {
  entry: WeekEntry;
  amount: number;
  daysLeft: number;
  classStats?: ClassWeekStats;
}) {
  // Paid weeks need no extra line; the others say what to do or why.
  const sub =
    entry.status === "paid"
      ? null
      : entry.status === "pending"
        ? lo.dashboard.waitingReview
        : entry.status === "rejected" && entry.payment?.reject_reason
          ? lo.dashboard.rejectedReason(entry.payment.reject_reason)
          : countdown(daysLeft);

  return (
    <section className="press-3d overflow-hidden rounded-2xl bg-sky text-white [--press-shade:var(--sky-shade)] active:transform-none">
      <div className="flex">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <p className="text-lg leading-snug font-bold">
            {lo.status[entry.status]} · <span className="money">{formatKip(amount)}</span>
          </p>
          {sub ? <p className="text-sm text-white/90">{sub}</p> : null}
        </div>
        <Link
          href="/history"
          aria-label={lo.dashboard.viewHistory}
          className="grid w-16 shrink-0 place-items-center border-l-2 border-sky-shade/60 transition-colors hover:bg-white/10"
        >
          <ScrollText className="size-6" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
      {classStats ? <ClassStrip stats={classStats} /> : null}
    </section>
  );
}
