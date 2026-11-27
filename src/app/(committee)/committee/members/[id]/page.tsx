import Link from "next/link";
import { ArrowLeft, CircleCheck, Coins, TriangleAlert } from "lucide-react";
import { CancelCashButton, CashPaymentButton } from "@/components/committee/cash-payment";
import { nodeStyle, paymentStyle } from "@/components/student/status-style";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings, getStudent } from "@/lib/data/queries";
import { formatDateLo, formatDateTimeLo, formatWeekRange } from "@/lib/format";
import { studentLabel } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { formatPhone } from "@/lib/phone";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, openWeeks, summarizeOutstanding } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata = { title: lo.nav.members };

const t = lo.committee.members;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession("committee");
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const student = isUuid ? await getStudent(id) : null;
  if (!student) {
    return (
      <div className="py-16 text-center">
        <p className="font-bold">{t.notFound}</p>
        <Link href="/committee/members" className="mt-3 inline-block font-bold text-sky">
          {t.backToList}
        </Link>
      </div>
    );
  }

  const now = new Date();
  const [settings, payments] = await Promise.all([
    getSettings(),
    getPayments({ studentId: id, withReviewerNames: true }),
  ]);
  const entries = buildStudentWeeks(settings.startDate, payments, now);
  const outstanding = summarizeOutstanding(entries, settings.weeklyAmount);
  const paidTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  // Weeks the committee can take cash for, in pay order (owed first, then weeks ahead).
  const open = openWeeks(settings.startDate, payments, now);

  return (
    <div className="space-y-5">
      <Link
        href="/committee/members"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.backToList}
      </Link>

      {/* Name and contact on one line; the cash button goes full width under it on phones. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <span className="grid size-12 shrink-0 press-3d place-items-center rounded-full bg-sky text-xl font-black text-white [--press-depth:3px] [--press-shade:var(--sky-shade)]">
          {student.name.replace(/^ນາງ /, "").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="line-clamp-2 text-xl leading-snug font-bold">{student.name}</h1>
          <p className="truncate money text-sm text-muted-foreground">
            {studentLabel(student)}
            {student.code && student.phone ? ` · ${formatPhone(student.phone)}` : ""}
          </p>
        </div>
        <CashPaymentButton
          weeks={open}
          weeklyAmount={settings.weeklyAmount}
          studentId={student.id}
          studentName={student.name}
          className="w-full sm:w-auto"
        />
      </div>

      {/* One compact card: money paid, weeks paid (with a bar), weeks still owed. */}
      {(() => {
        const paidWeeks = entries.filter((e) => e.status === "paid").length;
        const pct = entries.length ? Math.round((paidWeeks / entries.length) * 100) : 0;
        const cols = [
          {
            icon: Coins,
            tone: "text-status-paid",
            label: t.statPaid,
            value: formatKip(paidTotal),
          },
          {
            icon: CircleCheck,
            tone: "text-sky",
            label: t.statWeeks,
            value: `${paidWeeks}/${entries.length}`,
          },
          {
            icon: TriangleAlert,
            tone: outstanding.count ? "text-status-rejected" : "text-muted-foreground",
            label: t.statOwed,
            value: String(outstanding.count),
            sub: outstanding.count ? formatKip(outstanding.total) : null,
          },
        ];
        return (
          <section className="rounded-2xl border-2 p-3">
            <div className="grid grid-cols-3 divide-x-2">
              {cols.map((c) => (
                <div key={c.label} className="min-w-0 px-2 first:pl-1 last:pr-1">
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <c.icon
                      className={cn("size-3.5 shrink-0", c.tone)}
                      strokeWidth={2.6}
                      aria-hidden
                    />
                    <span className="truncate">{c.label}</span>
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 truncate money text-lg leading-tight font-black",
                      c.label === lo.stats.outstanding &&
                        outstanding.count &&
                        "text-status-rejected",
                    )}
                  >
                    {c.value}
                    {c.sub ? (
                      <span className="ml-1 text-xs font-bold text-status-rejected">{c.sub}</span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={lo.profile.weeksPaid}
                className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="money text-xs font-bold text-primary">{pct}%</span>
            </div>
          </section>
        );
      })()}

      <section className="rounded-2xl border-2 p-4">
        <h2 className="mb-3 font-bold">{t.weeks}</h2>
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {entries.map((e) => {
            const { className, icon: Icon } = nodeStyle[e.status];
            return (
              <li key={e.weekStart} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid size-12 press-3d place-items-center rounded-full [--press-depth:4px]",
                    className,
                    e.isCurrent && "ring-4 ring-sky/30",
                  )}
                >
                  <Icon className="size-5" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-center text-[11px] leading-tight font-semibold text-muted-foreground">
                  {formatDateLo(e.weekStart, false)}
                  <span className="sr-only"> · {lo.status[e.status]}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 font-bold">{t.history}</h2>
        <ol className="space-y-2">
          {payments.map((p) => {
            const style = paymentStyle[p.status];
            const Icon = style.icon;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 p-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    style.fill,
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.8} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{formatWeekRange(p.week_start)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTimeLo(p.created_at)}
                    {p.reviewer ? ` · ${p.reviewer}` : ""}
                  </p>
                  {p.reject_reason ? (
                    <p className="truncate text-xs font-semibold text-status-rejected">
                      {p.reject_reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end">
                  <p className="money font-bold">{formatKip(p.amount)}</p>
                  <p className={cn("text-xs font-bold", style.text)}>
                    {p.source === "cash" ? lo.committee.members.cashLabel : lo.status[p.status]}
                  </p>
                  {p.source === "cash" ? (
                    <CancelCashButton paymentId={p.id} label={formatWeekRange(p.week_start)} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
