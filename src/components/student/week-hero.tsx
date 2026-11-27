import Link from "next/link";
import { ChevronRight, ScrollText } from "lucide-react";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { ClassWeekStats } from "@/lib/data/types";
import type { WeekEntry } from "@/lib/status";
import { cn } from "@/lib/utils";
import { pathNodeStyle } from "./status-style";

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
  const share = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);
  const percent = Math.round(share(paid));
  const items = [
    { label: t.classTransfer, value: stats.paidTransfer, dot: "bg-primary" },
    { label: t.classCash, value: stats.paidCash, dot: "bg-brand-shade" },
    { label: t.classPending, value: stats.pending, dot: "bg-gold" },
    { label: t.classUnpaid, value: unpaid, dot: "bg-white/50" },
  ];

  return (
    <div className="mx-2 mb-2 rounded-xl bg-sky-shade/35 px-3 pt-2.5 pb-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-white/75">{t.classTitle}</p>
          <p className="money text-base leading-tight font-bold">
            {t.classPaid(paid, stats.total)}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 money text-xs font-black text-sky">
          {percent}%
        </span>
      </div>

      {/* Chunky stacked bar: transfer, cash, waiting for review; the track is the rest. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={stats.total}
        aria-valuenow={paid}
        aria-label={t.classPaid(paid, stats.total)}
        className="relative mt-2 flex h-3.5 overflow-hidden rounded-full bg-white/25"
      >
        <span className="h-full bg-primary" style={{ width: `${share(stats.paidTransfer)}%` }} />
        <span className="h-full bg-brand-shade" style={{ width: `${share(stats.paidCash)}%` }} />
        <span className="h-full bg-gold" style={{ width: `${share(stats.pending)}%` }} />
        {/* glossy highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-0.5 h-1 rounded-full bg-white/30"
        />
      </div>

      <ul className="mt-2.5 grid grid-cols-4 gap-1.5">
        {items.map((i) => (
          <li
            key={i.label}
            className="flex flex-col items-center rounded-lg bg-white/15 px-1 py-1.5 text-center"
          >
            <span className="money text-lg leading-none font-black">{i.value}</span>
            <span className="mt-1 flex items-center gap-1 text-[10px] leading-none font-semibold whitespace-nowrap text-white/85">
              <span className={cn("size-1.5 shrink-0 rounded-full", i.dot)} aria-hidden />
              {i.label}
            </span>
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
  const { icon: StatusIcon, className: badge } = pathNodeStyle[entry.status];

  return (
    <section className="relative press-3d overflow-hidden rounded-2xl bg-linear-to-br from-sky via-sky to-sky-shade text-white [--press-shade:var(--sky-shade)] active:transform-none">
      {/* soft decorative bubbles */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-white/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-6 right-16 size-8 rounded-full bg-white/10"
      />

      <div className="relative flex items-center gap-3 px-3 py-3">
        <span
          className={cn(
            "grid size-11 shrink-0 press-3d place-items-center rounded-full ring-2 ring-white/70 [--press-depth:3px]",
            badge,
          )}
        >
          <StatusIcon className="size-5" strokeWidth={3} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-white/75">
            {lo.dashboard.thisWeek}
          </p>
          <p className="text-lg leading-tight font-bold">
            {lo.status[entry.status]} · <span className="money">{formatKip(amount)}</span>
          </p>
          {sub ? <p className="truncate text-xs text-white/90">{sub}</p> : null}
        </div>
        <Link
          href="/history"
          aria-label={lo.dashboard.viewHistory}
          className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/15 px-2.5 py-2 transition-colors hover:bg-white/25"
        >
          <ScrollText className="size-5" strokeWidth={2.4} aria-hidden />
          <ChevronRight className="size-4 text-white/70" strokeWidth={2.6} aria-hidden />
        </Link>
      </div>
      {classStats ? <ClassStrip stats={classStats} /> : null}
    </section>
  );
}
