import { StudentsManager } from "@/components/committee/students-manager";
import { demoStudents } from "@/lib/demo-committee";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.students };

export default function Page() {
  return <StudentsManager initial={demoStudents} />;
}
