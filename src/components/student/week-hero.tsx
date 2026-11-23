import Link from "next/link";
import { ScrollText } from "lucide-react";
import { formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import type { WeekEntry } from "@/lib/status";

function countdown(daysLeft: number): string {
  if (daysLeft > 0) return lo.week.daysLeft(daysLeft);
  if (daysLeft === 0) return lo.week.dueToday;
  return lo.week.windowClosed;
}

/** Big sky banner for the current week, sticky under the header. */
export function WeekHero({
  entry,
  amount,
  daysLeft,
}: {
  entry: WeekEntry;
  amount: number;
  daysLeft: number;
}) {
  const sub =
    entry.status === "paid"
      ? lo.dashboard.allClear
      : entry.status === "pending"
        ? lo.dashboard.waitingReview
        : entry.status === "rejected" && entry.payment?.reject_reason
          ? lo.dashboard.rejectedReason(entry.payment.reject_reason)
          : countdown(daysLeft);

  return (
    <section className="flex press-3d overflow-hidden rounded-2xl bg-sky text-white [--press-shade:var(--sky-shade)] active:transform-none">
      <div className="min-w-0 flex-1 px-4 py-3">
        <p className="text-xs font-bold tracking-wide text-white/80">
          {lo.dashboard.thisWeek} · {formatWeekRange(entry.weekStart)}
        </p>
        <p className="mt-0.5 text-lg leading-snug font-bold">
          {lo.status[entry.status]} · <span className="money">{formatKip(amount)}</span>
        </p>
        <p className="text-sm text-white/90">{sub}</p>
      </div>
      <Link
        href="/history"
        aria-label={lo.dashboard.viewHistory}
        className="grid w-16 shrink-0 place-items-center border-l-2 border-sky-shade/60 transition-colors hover:bg-white/10"
      >
        <ScrollText className="size-6" strokeWidth={2.4} aria-hidden />
      </Link>
    </section>
  );
}
