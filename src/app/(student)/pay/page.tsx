import { PayFlow, type PayWeekOption } from "@/components/student/pay-flow";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";
import { buildStudentWeeks, defaultPayWeek } from "@/lib/status";

export const metadata = { title: lo.nav.pay };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const { userId } = await requireSession();
  const now = new Date();
  const [settings, payments] = await Promise.all([
    getSettings({ withQr: true }),
    getPayments({ studentId: userId }),
  ]);
  const entries = buildStudentWeeks(settings.startDate, payments, now);

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
      weeklyAmount={settings.weeklyAmount}
      bank={{
        name: settings.bankName,
        accountName: settings.accountName,
        accountNo: settings.accountNo,
        qrUrl: settings.qrUrl,
      }}
    />
  );
}
