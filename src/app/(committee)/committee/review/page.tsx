import { ReviewQueue, type ReviewItem } from "@/components/committee/review-queue";
import { demoSettings } from "@/lib/demo";
import { demoAllPayments, demoStudents } from "@/lib/demo-committee";
import { lo } from "@/lib/i18n/lo";
import { buildStudentWeeks } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: lo.nav.review };

export default function Page() {
  const now = new Date();
  const payments = demoAllPayments(now);
  const students = new Map(demoStudents.map((s) => [s.id, s]));

  const recentByStudent = new Map(
    demoStudents.map((s) => [
      s.id,
      buildStudentWeeks(
        demoSettings.startDate,
        payments.filter((p) => p.student_id === s.id),
        now,
      )
        .slice(-8)
        .map((e) => ({ weekStart: e.weekStart, status: e.status })),
    ]),
  );

  const items: ReviewItem[] = payments
    .filter((p) => p.source === "transfer")
    .map((p) => ({
      ...p,
      studentName: students.get(p.student_id)?.name ?? "",
      studentCode: students.get(p.student_id)?.code ?? "",
      recent: recentByStudent.get(p.student_id) ?? [],
    }));

  return <ReviewQueue initialItems={items} bankName={demoSettings.bankName} />;
}
