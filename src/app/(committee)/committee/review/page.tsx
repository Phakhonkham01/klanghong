import { ReviewQueue, type ReviewItem } from "@/components/committee/review-queue";
import { requireSession } from "@/lib/auth";
import { getPayments, getSettings, getStudents } from "@/lib/data/queries";
import { studentLabel } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { buildStudentWeeks } from "@/lib/status";

export const metadata = { title: lo.nav.review };

export default async function Page() {
  const { profile } = await requireSession("committee");
  const now = new Date();
  const [settings, payments, students] = await Promise.all([
    getSettings(),
    getPayments({ withReviewerNames: true }),
    getStudents(),
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));

  const recentByStudent = new Map(
    students.map((s) => [
      s.id,
      buildStudentWeeks(
        settings.startDate,
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
      studentName: byId.get(p.student_id)?.name ?? "",
      studentCode: (() => {
        const st = byId.get(p.student_id);
        return st ? studentLabel(st) : "";
      })(),
      recent: recentByStudent.get(p.student_id) ?? [],
    }));

  return <ReviewQueue initialItems={items} reviewerName={profile.full_name} />;
}
