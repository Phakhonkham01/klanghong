"use server";

import { randomBytes, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/data/types";
import { lo } from "@/lib/i18n/lo";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const t = lo.committee.students;
// No look-alike characters (0/O, 1/l/I) so it can be read out or written down.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function tempPassword(): string {
  return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

function revalidateStudents() {
  for (const p of [
    "/committee/students",
    "/committee/members",
    "/committee",
    "/committee/reports",
  ]) {
    revalidatePath(p);
  }
}

function cleanName(raw: unknown): string | null {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return [...name].length >= 2 && [...name].length <= 80 ? name : null;
}

/** Committee adds a student by phone; the account is approved and signs in with OTP. */
async function createPhoneStudent(phone: string, name: string): Promise<true | string> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) return t.duplicatePhone;
  const { data, error } = await admin.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
  });
  if (error || !data.user)
    return /already/i.test(error?.message ?? "") ? t.duplicatePhone : lo.errors.generic;
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    phone,
    full_name: name,
    student_code: null,
    role: "student",
    approval: "approved",
    must_set_name: false,
    must_change_password: false,
  });
  if (pe) {
    await admin.auth.admin.deleteUser(data.user.id);
    return pe.code === "23505" ? t.duplicatePhone : lo.errors.generic;
  }
  return true;
}

export async function createStudentAction(
  rawPhone: string,
  rawName: string,
): Promise<ActionResult> {
  await requireSession("committee");
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: lo.otp.invalidPhone };
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: lo.welcome.invalid };
  const r = await createPhoneStudent(phone, name);
  if (r !== true) return { ok: false, error: r };
  revalidateStudents();
  return { ok: true };
}

/** One student per line: `020xxxxxxxx,Full Name`. Invalid or duplicate lines are skipped. */
export async function importStudentsAction(
  text: string,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  await requireSession("committee");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 300);
  let created = 0;
  let skipped = 0;
  const seen = new Set<string>();
  for (const line of lines) {
    const [rawPhone, ...rest] = line.split(",");
    const phone = normalizePhone(rawPhone);
    const name = cleanName(rest.join(","));
    if (!phone || !name || seen.has(phone)) {
      skipped++;
      continue;
    }
    seen.add(phone);
    if ((await createPhoneStudent(phone, name)) === true) created++;
    else skipped++;
  }
  revalidateStudents();
  return { ok: true, data: { created, skipped } };
}

/** Approve or reject a self-registered phone account. */
export async function decideRegistrationAction(
  studentId: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  await requireSession("committee");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ approval: decision })
    .eq("id", studentId)
    .eq("role", "student")
    .select("id");
  if (error || !data?.length) return { ok: false, error: lo.errors.generic };
  revalidateStudents();
  return { ok: true };
}

/** Give a number a fresh monthly OTP allowance (counts restart from now). */
export async function resetOtpQuotaAction(studentId: string): Promise<ActionResult> {
  const { userId } = await requireSession("committee");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", studentId)
    .single();
  if (!profile?.phone) return { ok: false, error: lo.errors.generic };
  const { error } = await admin
    .from("otp_quota_resets")
    .upsert({ phone: profile.phone, reset_at: new Date().toISOString(), reset_by: userId });
  if (error) return { ok: false, error: lo.errors.generic };
  revalidatePath("/committee/students");
  return { ok: true };
}

export type CreatedAccount = { code: string; name: string; password: string };

/** Committee accounts (code + password) only: issue a one-time temporary password. */
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
  if (!profile?.student_code) return { ok: false, error: lo.errors.generic };
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
  revalidateStudents();
  return { ok: true };
}
