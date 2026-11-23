import { StudentsManager } from "@/components/committee/students-manager";
import { requireSession } from "@/lib/auth";
import { getStudents } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";

export const metadata = { title: lo.nav.students };

export default async function Page() {
  await requireSession("committee");
  return <StudentsManager initial={await getStudents()} />;
}
