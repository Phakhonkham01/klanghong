import { MembersMatrix } from "@/components/committee/members-matrix";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings, getStudents } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";
import { buildMemberRows } from "@/lib/members";

export const metadata = { title: lo.nav.members };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  await requireSession("committee");
  const now = new Date();
  const [settings, payments, students] = await Promise.all([
    getSettings(),
    getPayments(),
    getStudents(),
  ]);
  const { weeks, rows } = buildMemberRows(
    students,
    payments,
    settings.startDate,
    settings.weeklyAmount,
    now,
  );
  const FILTERS = ["paid", "transfer", "cash", "overdue", "unpaid"] as const;
  const initialFilter = (FILTERS as readonly string[]).includes(filter ?? "")
    ? (filter as (typeof FILTERS)[number])
    : "all";
  return <MembersMatrix weeks={weeks} rows={rows} initialFilter={initialFilter} />;
}
