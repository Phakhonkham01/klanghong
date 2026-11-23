import { MembersMatrix } from "@/components/committee/members-matrix";
import { demoSettings } from "@/lib/demo";
import { demoAllPayments, demoStudents } from "@/lib/demo-committee";
import { lo } from "@/lib/i18n/lo";
import { buildMemberRows } from "@/lib/members";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.members };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const now = new Date();
  const { weeks, rows } = buildMemberRows(
    demoStudents,
    demoAllPayments(now),
    demoSettings.startDate,
    demoSettings.weeklyAmount,
    now,
  );
  const initialFilter = filter === "overdue" || filter === "unpaid" ? filter : "all";
  return <MembersMatrix weeks={weeks} rows={rows} initialFilter={initialFilter} />;
}
