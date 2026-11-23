import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coins,
  Hourglass,
  Plus,
  Receipt,
  RotateCcw,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ChunkyProgress, SectionCard, StatTile } from "@/components/committee/bits";
import { buttonVariants } from "@/components/ui/button";
import { demoSettings } from "@/lib/demo";
import {
  demoAllPayments,
  demoAudit,
  demoExpenses,
  demoStudents,
  type DemoAudit,
} from "@/lib/demo-committee";
import { formatDateTimeLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";
import { currentWeekStart } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.committee };

const auditIcon: Record<DemoAudit["action"], { icon: LucideIcon; tone: string }> = {
  approve: { icon: Check, tone: "bg-status-paid text-white" },
  reject: { icon: RotateCcw, tone: "bg-status-rejected text-white" },
  expense_create: { icon: Receipt, tone: "bg-sky text-white" },
  settings_update: { icon: Settings, tone: "bg-muted-foreground text-white" },
  cash_payment: { icon: Coins, tone: "bg-status-paid text-white" },
};

export default function Page() {
  const now = new Date();
  const payments = demoAllPayments(now);
  const week = currentWeekStart(now);
  const active = demoStudents.filter((s) => s.isActive);

  const collected = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  const spent = demoExpenses.reduce((s, e) => s + e.amount, 0);
  const pending = payments.filter((p) => p.status === "pending").length;

  const thisWeek = payments.filter((p) => p.week_start === week);
  const paidNow = thisWeek.filter((p) => p.status === "approved").length;
  const pendingNow = thisWeek.filter((p) => p.status === "pending").length;

  const owing = active
    .map((s) => {
      const entries = buildStudentWeeks(
        demoSettings.startDate,
        payments.filter((p) => p.student_id === s.id),
        now,
      );
      return { student: s, ...summarizeOutstanding(entries, demoSettings.weeklyAmount) };
    })
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count);

  const activity = demoAudit(payments).slice(0, 6);

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
        <p className="mt-1 money text-4xl font-black">{formatKip(collected - spent)}</p>
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
              {formatKip(active.length * demoSettings.weeklyAmount)}
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
