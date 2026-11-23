import { StudentsManager } from "@/components/committee/students-manager";
import { requireSession } from "@/lib/auth";
import { getOtpUsage, getStudents } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.students };

export default async function Page() {
  await requireSession("committee");
  const students = await getStudents();
  const usage = await getOtpUsage(students.map((s) => s.phone ?? ""));
  return (
    <StudentsManager
      initial={students.map((s) => ({ ...s, otpUsed: s.phone ? (usage.get(s.phone) ?? 0) : 0 }))}
    />
  );
}
