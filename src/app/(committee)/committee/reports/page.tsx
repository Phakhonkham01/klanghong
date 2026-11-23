import { ReportsView, type ReportRow } from "@/components/committee/reports-view";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings, getStudents } from "@/lib/data/queries";
import { formatMonthLo, formatWeekRange } from "@/lib/format";
import { isMember } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { listWeeks } from "@/lib/week";

export const metadata = { title: lo.nav.reports };

export default async function Page() {
  await requireSession("committee");
  const now = new Date();
  const [settings, payments, students] = await Promise.all([
    getSettings(),
    getPayments(),
    getStudents(),
  ]);
  // Expected per week uses the current roster and fee (history is not versioned).
  const active = students.filter(isMember).length;
  const expected = active * settings.weeklyAmount;

  const weekly: ReportRow[] = listWeeks(settings.startDate, now).map((w) => {
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
