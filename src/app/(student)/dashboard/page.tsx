import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { HideOnScroll } from "@/components/student/hide-on-scroll";
import { StatBar } from "@/components/student/stat-bar";
import { dotClass } from "@/components/student/status-style";
import { WeekHero } from "@/components/student/week-hero";
import { WeekPath } from "@/components/student/week-path";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getClassWeekStats, getFundSummary, getPayments, getSettings } from "@/lib/data/queries";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, computeStreak, openWeeks, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";
import { currentWeekStart, daysUntilDeadline, todayInTz } from "@/lib/week";

export default async function Page() {
  const { userId } = await requireSession();
  const now = new Date();
  const [settings, payments, fund, classStats] = await Promise.all([
    getSettings(),
    getPayments({ studentId: userId }),
    getFundSummary(),
    getClassWeekStats(currentWeekStart(now)),
  ]);
  const entries = buildStudentWeeks(settings.startDate, payments, now);
  // Upcoming weeks paid in advance: approved wins over waiting for review.
  const thisWeek = currentWeekStart(now);
  const paidAhead: Partial<Record<string, "paid" | "pending">> = {};
  for (const p of payments) {
    if (p.week_start <= thisWeek || p.status === "rejected") continue;
    if (p.status === "approved") paidAhead[p.week_start] = "paid";
    else paidAhead[p.week_start] ??= "pending";
  }
  const current = entries.at(-1);
  const outstanding = summarizeOutstanding(entries, settings.weeklyAmount);
  const paidTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <StatBar
        streak={computeStreak(entries)}
        paidTotal={paidTotal}
        outstanding={outstanding.count}
        fund={fund.balance}
      />

      <HideOnScroll className="sticky top-16 z-20 -mx-1 bg-background/90 px-1 pb-2 backdrop-blur">
        {current ? (
          <WeekHero
            entry={current}
            amount={settings.weeklyAmount}
            daysLeft={daysUntilDeadline(now)}
            classStats={classStats}
          />
        ) : null}
      </HideOnScroll>

      {outstanding.count > 0 ? (
        <section className="rounded-2xl border-2 border-status-rejected/30 bg-status-rejected-bg p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 size-6 shrink-0 text-status-rejected"
              strokeWidth={2.6}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-status-overdue">
                {lo.week.outstandingBanner(outstanding.count, formatKip(outstanding.total))}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {entries
                  .filter((e) => e.isOutstanding)
                  .map((e) => (
                    <li key={e.weekStart}>
                      <Link
                        href={`/pay?week=${e.weekStart}`}
                        className="flex items-center gap-1.5 rounded-xl border-2 border-tile-shade bg-tile px-2.5 py-1 text-sm font-semibold hover:bg-muted"
                      >
                        <span
                          className={cn("size-2.5 rounded-full", dotClass[e.status])}
                          aria-hidden
                        />
                        {formatDateLo(e.weekStart, false)}
                        <span className="sr-only">{lo.status[e.status]}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <Link
            href="/pay"
            className={cn(buttonVariants({ variant: "chunky-danger", size: "xl" }), "mt-4 w-full")}
          >
            {lo.dashboard.payNow}
          </Link>
        </section>
      ) : null}

      <WeekPath
        entries={entries}
        today={todayInTz(now)}
        ahead={paidAhead}
        payAhead={openWeeks(settings.startDate, payments, now)
          .filter((o) => o.ahead)
          .map((o) => o.weekStart)}
      />
    </div>
  );
}
