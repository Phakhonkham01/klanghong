import Link from "next/link";
import { ArrowRight, ChevronRight, CircleCheck, TriangleAlert } from "lucide-react";
import { auditIcon } from "@/components/committee/audit-icons";
import { FundCard } from "@/components/committee/fund-card";
import { WeekCollectCard } from "@/components/committee/week-collect-card";
import { SectionCard } from "@/components/committee/bits";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import {
  getAudit,
  getFundSummary,
  getPayments,
  getSettings,
  getStudents,
} from "@/lib/data/queries";
import { formatDateTimeLo } from "@/lib/format";
import { isMember } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";
import { currentWeekStart } from "@/lib/week";

export const metadata = { title: lo.nav.committee };

/** Collapse back-to-back identical entries (same action, detail and person) into one row. */
function groupActivity<T extends { action: string; detail: string; actor: string }>(rows: T[]) {
  const out: { item: T; times: number }[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (
      last &&
      last.item.action === r.action &&
      last.item.detail === r.detail &&
      last.item.actor === r.actor
    ) {
      last.times++;
    } else {
      out.push({ item: r, times: 1 });
    }
  }
  return out;
}

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
  const active = students.filter(isMember);

  const collected = fund.totalApproved;
  const spent = fund.totalExpenses;
  const pending = fund.pendingCount;

  const thisWeek = payments.filter((p) => p.week_start === week);
  const paidNow = thisWeek.filter((p) => p.status === "approved").length;
  // Money in, split by transfer / cash (all time, and this week).
  const approved = payments.filter((p) => p.status === "approved");
  const approvedNow = thisWeek.filter((p) => p.status === "approved");
  const sumBy = (rows: typeof payments, source: "transfer" | "cash") =>
    rows.filter((p) => p.source === source).reduce((s, p) => s + p.amount, 0);
  const pendingNow = thisWeek.filter((p) => p.status === "pending").length;

  // Per member: past weeks still owed, and whether this week is still open.
  const perMember = active.map((s) => {
    const entries = buildStudentWeeks(
      settings.startDate,
      payments.filter((p) => p.student_id === s.id),
      now,
    );
    const current = entries.at(-1);
    return {
      student: s,
      ...summarizeOutstanding(entries, settings.weeklyAmount),
      unpaidNow: current?.status === "unpaid" || current?.status === "rejected",
    };
  });
  const owing = perMember.filter((o) => o.count > 0).sort((a, b) => b.count - a.count);
  const unpaidNow = perMember.filter((o) => o.unpaidNow).map((o) => o.student);

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

      <FundCard
        balance={fund.balance}
        collected={collected}
        split={{
          transfer: sumBy(approved, "transfer"),
          cash: sumBy(approved, "cash"),
        }}
        spent={spent}
        pending={pending}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <WeekCollectCard
          week={week}
          members={active.length}
          paid={paidNow}
          pending={pendingNow}
          collected={thisWeek
            .filter((p) => p.status === "approved")
            .reduce((sum, p) => sum + p.amount, 0)}
          split={{
            transfer: sumBy(approvedNow, "transfer"),
            cash: sumBy(approvedNow, "cash"),
            transferPeople: new Set(
              approvedNow.filter((p) => p.source === "transfer").map((p) => p.student_id),
            ).size,
            cashPeople: new Set(
              approvedNow.filter((p) => p.source === "cash").map((p) => p.student_id),
            ).size,
          }}
          expected={active.length * settings.weeklyAmount}
        />

        <SectionCard title={lo.committee.overview.outstandingStudents}>
          {/* Two kinds of "not paid": past weeks still owed, and this week not paid yet. */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: lo.committee.overview.owingPast,
                n: owing.length,
                href: "/committee/members?filter=overdue",
                tone: "text-status-overdue bg-status-overdue-bg",
              },
              {
                label: lo.committee.overview.unpaidThisWeek,
                n: unpaidNow.length,
                href: "/committee/members?filter=unpaid",
                tone: "text-status-pending bg-status-pending-bg",
              },
            ].map((x) => (
              <Link
                key={x.label}
                href={x.href}
                className={cn("flex items-center justify-between rounded-xl px-3 py-2", x.tone)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{x.label}</span>
                  <span className="money text-2xl leading-none font-black">
                    {x.n}
                    <span className="ml-1 text-xs font-bold">{lo.committee.overview.people}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>

          {owing.length ? (
            <ul className="mt-2 divide-y">
              {owing.slice(0, 5).map((o) => (
                <li key={o.student.id}>
                  <Link
                    href={`/committee/members/${o.student.id}`}
                    className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <TriangleAlert
                      className="size-4 shrink-0 text-status-rejected"
                      strokeWidth={2.6}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {o.student.name}
                    </span>
                    <span className="money text-sm font-bold whitespace-nowrap text-status-overdue">
                      {o.count} · {formatKip(o.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-status-paid">
              <CircleCheck className="size-5" strokeWidth={2.6} aria-hidden />
              {lo.committee.overview.nobodyOwes}
            </p>
          )}

          {unpaidNow.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unpaidNow.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  href={`/committee/members/${s.id}`}
                  className="max-w-40 truncate rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold hover:bg-muted"
                >
                  {s.name || s.phone}
                </Link>
              ))}
              {unpaidNow.length > 8 ? (
                <Link
                  href="/committee/members?filter=unpaid"
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground"
                >
                  +{unpaidNow.length - 8}
                </Link>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard
        title={lo.committee.overview.recent}
        action={
          <Link
            href="/committee/audit"
            className="flex items-center text-sm font-bold whitespace-nowrap text-sky"
          >
            {lo.committee.overview.viewAll} <ChevronRight className="size-4" />
          </Link>
        }
      >
        <ol className="divide-y">
          {groupActivity(activity).map(({ item: a, times }) => {
            const { icon: Icon, tone } = auditIcon[a.action];
            return (
              <li key={a.id} className="flex items-center gap-2.5 py-2">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", tone)}>
                  <Icon className="size-4" strokeWidth={2.8} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {lo.committee.audit.actions[a.action]}
                    {a.detail ? ` · ${a.detail}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.actor && a.actor !== "—" ? a.actor : lo.committee.overview.system} ·{" "}
                    {formatDateTimeLo(a.created_at)}
                  </p>
                </div>
                {times > 1 ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 money text-xs font-bold text-muted-foreground">
                    ×{times}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </SectionCard>
    </div>
  );
}
