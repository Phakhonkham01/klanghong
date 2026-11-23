import Link from "next/link";
import { ArrowRight, Coins, Hourglass, Plus, Receipt, TriangleAlert } from "lucide-react";
import { auditIcon } from "@/components/committee/audit-icons";
import { ChunkyProgress, SectionCard, StatTile } from "@/components/committee/bits";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import {
  getAudit,
  getFundSummary,
  getPayments,
  getSettings,
  getStudents,
} from "@/lib/data/queries";
import { formatDateTimeLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";
import { currentWeekStart } from "@/lib/week";

export const metadata = { title: lo.nav.committee };

export default async function Page() {
  await requireSession("committee");
  const now = new Date();
  const [settings, payments, fund, students, audit] = await Promise.all([
    getSettings(),
    getPayments(),
    getFundSummary(),
    getStudents(),
    getAudit(6),
  ]);
  const week = currentWeekStart(now);
  const active = students.filter((s) => s.isActive);

  const collected = fund.totalApproved;
  const spent = fund.totalExpenses;
  const pending = fund.pendingCount;

  const thisWeek = payments.filter((p) => p.week_start === week);
  const paidNow = thisWeek.filter((p) => p.status === "approved").length;
  const pendingNow = thisWeek.filter((p) => p.status === "pending").length;

  const owing = active
    .map((s) => {
      const entries = buildStudentWeeks(
        settings.startDate,
        payments.filter((p) => p.student_id === s.id),
        now,
      );
      return { student: s, ...summarizeOutstanding(entries, settings.weeklyAmount) };
    })
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count);

  const activity = audit;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">{lo.committee.overview.title}</h1>
        <Link
          href="/committee/review"
          className={cn(buttonVariants({ variant: "chunky", size: "lg" }), "h-11 px-5")}
        >
          {lo.committee.overview.reviewNow(pending)}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Balance hero */}
      <section className="press-3d rounded-2xl bg-sky p-5 text-white [--press-shade:var(--sky-shade)] active:transform-none">
        <p className="text-sm font-bold text-white/85">{lo.committee.overview.balance}</p>
        <p className="mt-1 money text-4xl font-black">{formatKip(fund.balance)}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Coins}
          label={lo.committee.overview.collected}
          value={formatKip(collected)}
          tone="text-status-paid"
        />
        <StatTile
          icon={Receipt}
          label={lo.committee.overview.expenses}
          value={formatKip(spent)}
          tone="text-status-rejected"
        />
        <StatTile
          icon={Hourglass}
          label={lo.committee.overview.pending}
          value={pending}
          tone="text-status-pending"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title={lo.committee.overview.thisWeek}>
          <p className="mb-2 text-sm text-muted-foreground">{formatWeekRange(week)}</p>
          <ChunkyProgress
            value={(paidNow / Math.max(active.length, 1)) * 100}
            label={lo.committee.overview.thisWeek}
          />
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-bold">
              {lo.committee.overview.paidOf(paidNow, active.length)}
            </span>
            <span className="font-semibold text-status-pending">
              {lo.status.pending} {pendingNow}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lo.committee.overview.expected}{" "}
            <span className="money font-bold text-foreground">
              {formatKip(active.length * settings.weeklyAmount)}
            </span>
          </p>
        </SectionCard>

        <SectionCard
          title={lo.committee.overview.outstandingStudents}
          action={
            <Link href="/committee/members?filter=overdue" className="text-sm font-bold text-sky">
              {lo.committee.overview.viewAll}
            </Link>
          }
        >
          <ul className="space-y-2">
            {owing.slice(0, 5).map((o) => (
              <li key={o.student.id}>
                <Link
                  href={`/committee/members/${o.student.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted"
                >
                  <TriangleAlert
                    className="size-5 text-status-rejected"
                    strokeWidth={2.6}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">{o.student.name}</span>
                  <span className="money text-sm font-bold text-status-overdue">
                    {o.count} · {formatKip(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title={lo.committee.overview.recent}
        action={
          <div className="flex gap-3 text-sm font-bold">
            <Link href="/committee/expenses" className="flex items-center gap-1 text-sky">
              <Plus className="size-4" /> {lo.committee.expenses.add}
            </Link>
            <Link href="/committee/audit" className="text-sky">
              {lo.committee.overview.viewAll}
            </Link>
          </div>
        }
      >
        <ol className="divide-y">
          {activity.map((a) => {
            const { icon: Icon, tone } = auditIcon[a.action];
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", tone)}>
                  <Icon className="size-4" strokeWidth={2.8} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {lo.committee.audit.actions[a.action]} · {a.detail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.actor} · {formatDateTimeLo(a.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </SectionCard>
    </div>
  );
}
