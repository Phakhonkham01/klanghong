import { HistoryList } from "@/components/student/history-list";
import { requireSession } from "@/lib/auth";
import { getPayments } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.history };

export default async function Page() {
  const { userId } = await requireSession();
  const payments = await getPayments({ studentId: userId });
  return <HistoryList payments={payments} />;
}
