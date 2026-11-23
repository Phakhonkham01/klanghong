import { ExpensesManager } from "@/components/committee/expenses-manager";
import { demoExpenses } from "@/lib/demo-committee";
import { lo } from "@/lib/i18n/lo";
import { todayInTz } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.expenses };

export default function Page() {
  return <ExpensesManager initial={demoExpenses} today={todayInTz()} />;
}
