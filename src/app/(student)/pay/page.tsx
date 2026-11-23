import { PayFlow, type PayWeekOption } from "@/components/student/pay-flow";
import { demoPayments, demoSettings } from "@/lib/demo";
import { lo } from "@/lib/i18n/lo";
import { buildStudentWeeks, defaultPayWeek } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.pay };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const now = new Date();
  const entries = buildStudentWeeks(demoSettings.startDate, demoPayments(now), now);

  const options: PayWeekOption[] = entries
    .filter((e) => e.isPayable)
    .map((e) => ({ weekStart: e.weekStart, status: e.status, isCurrent: e.isCurrent }));

  // Preselect the requested week if it is payable, else the oldest payable week.
  const requested = typeof week === "string" ? week : undefined;
  const initial = options.some((o) => o.weekStart === requested)
    ? requested!
    : defaultPayWeek(entries);

  return (
    <PayFlow
      options={options}
      initialWeeks={initial ? [initial] : []}
      weeklyAmount={demoSettings.weeklyAmount}
      bank={{
        name: demoSettings.bankName,
        accountName: demoSettings.accountName,
        accountNo: demoSettings.accountNo,
        qrUrl: demoSettings.qrUrl,
      }}
    />
  );
}
