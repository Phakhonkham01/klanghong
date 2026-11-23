import type { PaymentView, StudentView } from "@/lib/data/types";
import { buildStudentWeeks, summarizeOutstanding, type WeekStatus } from "@/lib/status";
import { listWeeks, type IsoDate } from "@/lib/week";

export interface MemberRow {
  id: string;
  code: string;
  name: string;
  /** Status per week, aligned with the `weeks` array. */
  statuses: WeekStatus[];
  totalPaid: number;
  overdueCount: number;
  currentStatus: WeekStatus | null;
}

/** Build the committee payment matrix: one row per active student, one column per week. */
export function buildMemberRows(
  students: StudentView[],
  payments: PaymentView[],
  startDate: IsoDate,
  weeklyAmount: number,
  now: Date,
): { weeks: IsoDate[]; rows: MemberRow[] } {
  const weeks = listWeeks(startDate, now);
  const byStudent = new Map<string, PaymentView[]>();
  for (const p of payments)
    byStudent.set(p.student_id, [...(byStudent.get(p.student_id) ?? []), p]);

  const rows = students
    .filter((s) => s.isActive)
    .map((s): MemberRow => {
      const own = byStudent.get(s.id) ?? [];
      const entries = buildStudentWeeks(startDate, own, now);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        statuses: entries.map((e) => e.status),
        totalPaid: own.filter((p) => p.status === "approved").reduce((sum, p) => sum + p.amount, 0),
        overdueCount: summarizeOutstanding(entries, weeklyAmount).count,
        currentStatus: entries.at(-1)?.status ?? null,
      };
    });
  return { weeks, rows };
}
