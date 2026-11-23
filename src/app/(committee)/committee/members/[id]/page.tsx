import Link from "next/link";
import { ArrowLeft, CircleCheck, Coins, TriangleAlert } from "lucide-react";
import { StatTile } from "@/components/committee/bits";
import { CashPaymentButton } from "@/components/committee/cash-payment";
import { nodeStyle, paymentStyle } from "@/components/student/status-style";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings, getStudent } from "@/lib/data/queries";
import { formatDateLo, formatDateTimeLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { formatKip } from "@/lib/money";
import { buildStudentWeeks, summarizeOutstanding } from "@/lib/status";
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
  const [settings, payments] = await Promise.all([getSettings(), getPayments({ studentId: id })]);
  const entries = buildStudentWeeks(settings.startDate, payments, now);
  const outstanding = summarizeOutstanding(entries, settings.weeklyAmount);
  const paidTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  const payable = entries.filter((e) => e.isPayable).map((e) => e.weekStart);

  return (
    <div className="space-y-5">
      <Link
        href="/committee/members"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.backToList}
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 press-3d place-items-center rounded-full bg-sky text-2xl font-black text-white [--press-shade:var(--sky-shade)]">
          {student.name.replace(/^ນາງ /, "").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="money text-sm text-muted-foreground">
            {student.code}
            {student.phone ? ` · ${student.phone}` : ""}
          </p>
        </div>
        <CashPaymentButton weeks={payable} studentId={student.id} studentName={student.name} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Coins}
          label={lo.stats.paidTotal}
          value={formatKip(paidTotal)}
          tone="text-status-paid"
        />
        <StatTile
          icon={CircleCheck}
          label={lo.profile.weeksPaid}
          value={`${entries.filter((e) => e.status === "paid").length}/${entries.length}`}
          tone="text-sky"
        />
        <StatTile
          icon={TriangleAlert}
          label={lo.stats.outstanding}
          value={`${outstanding.count} · ${formatKip(outstanding.total)}`}
          tone="text-status-rejected"
        />
      </div>

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
                <div className="text-right">
                  <p className="money font-bold">{formatKip(p.amount)}</p>
                  <p className={cn("text-xs font-bold", style.text)}>{lo.status[p.status]}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
