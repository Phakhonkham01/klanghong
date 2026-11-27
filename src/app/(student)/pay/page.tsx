import { PayFlow, type PayWeekOption } from "@/components/student/pay-flow";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";
import { openWeeks } from "@/lib/status";
import { MAX_WEEKS_PER_SLIP } from "@/lib/week";

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

  const options: PayWeekOption[] = openWeeks(settings.startDate, payments, now);

  // Weeks are paid in order: preselect from the oldest open week up to the requested one.
  const requested = typeof week === "string" ? week : undefined;
  const upTo = Math.max(
    0,
    options.findIndex((o) => o.weekStart === requested),
  );

  return (
    <PayFlow
      options={options}
      initialWeeks={options
        .slice(0, Math.min(upTo + 1, MAX_WEEKS_PER_SLIP))
        .map((o) => o.weekStart)}
      weeklyAmount={settings.weeklyAmount}
      bank={{
        name: settings.bankName,
        accountName: settings.accountName,
        accountNo: settings.accountNo,
        qrUrl: settings.qrUrl,
        qrByWeeks: Object.fromEntries(
          Object.entries(settings.qrByWeeks).map(([n, q]) => [n, q.url]),
        ),
      }}
    />
  );
}
