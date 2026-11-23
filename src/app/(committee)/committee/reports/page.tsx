import { ReportsView, type ReportRow } from "@/components/committee/reports-view";
import { demoSettings } from "@/lib/demo";
import { demoAllPayments, demoStudents } from "@/lib/demo-committee";
import { formatMonthLo, formatWeekRange } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { listWeeks } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.reports };

export default function Page() {
  const now = new Date();
  const payments = demoAllPayments(now);
  const active = demoStudents.filter((s) => s.isActive).length;
  const expected = active * demoSettings.weeklyAmount;

  const weekly: ReportRow[] = listWeeks(demoSettings.startDate, now).map((w) => {
    const collected = payments
      .filter((p) => p.week_start === w && p.status === "approved")
      .reduce((s, p) => s + p.amount, 0);
    return {
      key: w,
      label: formatWeekRange(w),
      collected,
      expected,
      outstanding: expected - collected,
    };
  });

  const byMonth = new Map<string, ReportRow>();
  for (const r of weekly) {
    const m = formatMonthLo(r.key);
    const cur = byMonth.get(m) ?? { key: m, label: m, collected: 0, expected: 0, outstanding: 0 };
    cur.collected += r.collected;
    cur.expected += r.expected;
    cur.outstanding += r.outstanding;
    byMonth.set(m, cur);
  }

  return <ReportsView weekly={weekly} monthly={[...byMonth.values()]} weeklyExpected={expected} />;
}
