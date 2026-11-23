import { ExpensesManager } from "@/components/committee/expenses-manager";
import { requireSession } from "@/lib/auth";
import { getExpenses } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";
import { todayInTz } from "@/lib/week";

export const metadata = { title: lo.nav.expenses };

export default async function Page() {
  await requireSession("committee");
  return <ExpensesManager initial={await getExpenses()} today={todayInTz()} />;
}
