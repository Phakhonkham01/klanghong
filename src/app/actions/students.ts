"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { codeToEmail, normalizeStudentCode } from "@/lib/validators";

const t = lo.committee.students;
// No look-alike characters (0/O, 1/l/I) so it can be read out or written down.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function tempPassword(): string {
  return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export type CreatedAccount = { code: string; name: string; password: string };

async function createOne(code: string, name: string): Promise<CreatedAccount | string> {
  const admin = createSupabaseAdminClient();
  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: codeToEmail(code),
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return /already/i.test(error?.message ?? "") ? t.duplicateCode : lo.errors.generic;
  }
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    student_code: code,
    full_name: name,
    role: "student",
    must_change_password: true,
  });
  if (pe) {
    await admin.auth.admin.deleteUser(data.user.id);
    return pe.code === "23505" ? t.duplicateCode : lo.errors.generic;
  }
  return { code, name, password };
}

function cleanName(raw: unknown): string | null {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return name && [...name].length <= 80 ? name : null;
}

export async function createStudentAction(
  rawCode: string,
  rawName: string,
): Promise<ActionResult<CreatedAccount>> {
  await requireSession("committee");
  const code = normalizeStudentCode(rawCode);
  if (!code) return { ok: false, error: t.invalidCode };
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: t.nameRequired };
  const result = await createOne(code, name);
  if (typeof result === "string") return { ok: false, error: result };
  revalidatePath("/committee/students");
  revalidatePath("/committee/members");
  return { ok: true, data: result };
}

/** One student per line: `CODE,Full Name`. Invalid or duplicate lines are skipped. */
export async function importStudentsAction(
  text: string,
): Promise<ActionResult<{ created: CreatedAccount[]; skipped: number }>> {
  await requireSession("committee");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 300);
  const created: CreatedAccount[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const line of lines) {
    const [rawCode, ...rest] = line.split(",");
    const code = normalizeStudentCode(rawCode);
    const name = cleanName(rest.join(","));
    if (!code || !name || seen.has(code)) {
      skipped++;
      continue;
    }
    seen.add(code);
    const r = await createOne(code, name);
    if (typeof r === "string") skipped++;
    else created.push(r);
  }
  revalidatePath("/committee/students");
  revalidatePath("/committee/members");
  return { ok: true, data: { created, skipped } };
}

export async function resetPasswordAction(
  studentId: string,
): Promise<ActionResult<CreatedAccount>> {
  await requireSession("committee");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("student_code, full_name")
    .eq("id", studentId)
    .single();
  if (!profile) return { ok: false, error: lo.errors.generic };
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(studentId, { password });
  if (error) return { ok: false, error: lo.errors.generic };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", studentId);
  revalidatePath("/committee/students");
  return { ok: true, data: { code: profile.student_code, name: profile.full_name, password } };
}

export async function setActiveAction(studentId: string, active: boolean): Promise<ActionResult> {
  const { userId } = await requireSession("committee");
  if (studentId === userId && !active) return { ok: false, error: lo.errors.cannotDeactivateSelf };
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", studentId);
  if (error) return { ok: false, error: lo.errors.generic };
  // Signed-in sessions of a deactivated user are rejected by middleware on the next request.
  revalidatePath("/committee/students");
  revalidatePath("/committee/members");
  return { ok: true };
}
