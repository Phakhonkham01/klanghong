import { HistoryList } from "@/components/student/history-list";
import { demoPayments } from "@/lib/demo";
import { lo } from "@/lib/i18n/lo";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.history };

export default function Page() {
  const payments = demoPayments(new Date()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return <HistoryList payments={payments} />;
}
