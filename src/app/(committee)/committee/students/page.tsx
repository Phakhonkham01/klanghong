import { StudentsManager } from "@/components/committee/students-manager";
import { requireSession } from "@/lib/auth";
import { getOtpUsage, getStudents } from "@/lib/data/queries";
import { lo } from "@/lib/i18n/lo";
import { activeLocks, loginAccount } from "@/lib/login-guard";

export const metadata = { title: lo.nav.students };

export default async function Page() {
  await requireSession("committee");
  const students = await getStudents();
  const accountsOf = (s: (typeof students)[number]) =>
    [
      s.phone ? loginAccount("phone", s.phone) : null,
      s.code ? loginAccount("code", s.code) : null,
    ].filter((a): a is string => a !== null);
  const [usage, locks] = await Promise.all([
    getOtpUsage(students.map((s) => s.phone ?? "")),
    activeLocks(students.flatMap(accountsOf)),
  ]);
  return (
    <StudentsManager
      initial={students.map((s) => ({
        ...s,
        otpUsed: s.phone ? (usage.get(s.phone) ?? 0) : 0,
        lockedUntil:
          accountsOf(s)
            .map((a) => locks.get(a))
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
      }))}
    />
  );
}
