"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { formatDateTimeLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  beginLogin,
  loginAccount,
  loginFailed,
  loginNotChecked,
  loginSucceeded,
  type LoginAttempt,
} from "@/lib/login-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkNewPassword,
  codeToEmail,
  normalizeStudentCode,
  safeNextPath,
} from "@/lib/validators";

export type FormState = { error: string | null; code?: string };

/** Message for a refused attempt (account locked or too many from this IP). */
function refusedMessage(a: Exclude<LoginAttempt, { ok: true }>, phoneAccount: boolean): string {
  if (a.reason === "ip") return lo.login.lockedIp;
  return lo.login.locked(formatDateTimeLo(a.until), phoneAccount);
}

/** Message after a wrong password: attempts left, or the new lock. */
function wrongPasswordMessage(
  base: string,
  r: { left: number } | { until: Date },
  phoneAccount: boolean,
): string {
  return "until" in r
    ? lo.login.locked(formatDateTimeLo(r.until), phoneAccount)
    : `${base} · ${lo.login.attemptsLeft(r.left)}`;
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const rawCode = form.get("code");
  const password = form.get("password");
  // Echo the typed code back so the field is not cleared after a failed attempt.
  const typed = typeof rawCode === "string" ? rawCode.slice(0, 20) : "";
  if (typeof password !== "string" || !password || !typed) {
    return { error: lo.login.required, code: typed };
  }
  const code = normalizeStudentCode(typed);
  if (!code) return { error: lo.login.invalidCode, code: typed };

  const account = loginAccount("code", code);
  const attempt = await beginLogin(account, await clientIp());
  if (!attempt.ok) return { error: refusedMessage(attempt, false), code: typed };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: codeToEmail(code),
    password,
  });
  if (error || !data.user) {
    if (error?.status === 429) {
      await loginNotChecked(attempt);
      return { error: lo.login.tooMany, code: typed };
    }
    const r = await loginFailed(account, attempt);
    return { error: wrongPasswordMessage(lo.login.invalidCredentials, r, false), code: typed };
  }
  await loginSucceeded(account);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, must_change_password")
    .eq("id", data.user.id)
    .single();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: lo.login.inactive, code: typed };
  }

  if (profile.must_change_password) redirect("/change-password");
  const next = safeNextPath(form.get("next"));
  const home = homeFor(profile.role);
  // Students may not be sent into the committee area via ?next=.
  redirect(next && !(next.startsWith("/committee") && profile.role !== "committee") ? next : home);
}

function passwordError(problem: ReturnType<typeof checkNewPassword>): string | null {
  if (problem === "too_short") return lo.changePassword.tooShort;
  if (problem === "too_long") return lo.changePassword.tooLong;
  if (problem === "invalid_chars") return lo.changePassword.invalidChars;
  if (problem === "mismatch") return lo.changePassword.mismatch;
  return null;
}

/** Where a signed-in user goes next, given their onboarding state. */
function nextStep(p: {
  role: "student" | "committee";
  approval: string;
  must_set_name: boolean;
  must_change_password: boolean;
}): string {
  if (p.must_set_name) return "/welcome";
  if (p.must_change_password) return "/change-password";
  if (p.approval !== "approved") return "/pending";
  return homeFor(p.role);
}

/** Students: phone number + password (set after the first OTP sign-up). */
export async function signInPhoneAction(_prev: FormState, form: FormData): Promise<FormState> {
  const typed = String(form.get("phone") ?? "").slice(0, 20);
  const password = String(form.get("password") ?? "");
  if (!typed || !password) return { error: lo.login.required, code: typed };
  const phone = normalizePhone(typed);
  if (!phone) return { error: lo.otp.invalidPhone, code: typed };

  const account = loginAccount("phone", phone);
  const attempt = await beginLogin(account, await clientIp());
  if (!attempt.ok) return { error: refusedMessage(attempt, true), code: typed };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password,
  });
  if (error || !data.user) {
    if (error?.status === 429) {
      await loginNotChecked(attempt);
      return { error: lo.login.tooMany, code: typed };
    }
    // A sign-up left before choosing a password has none yet: point to "sign up" to resume.
    const { data: unfinished } = await createSupabaseAdminClient()
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .eq("must_set_name", true)
      .maybeSingle();
    if (unfinished) {
      // No password exists yet, so this is not a guess: don't count it.
      await loginNotChecked(attempt);
      return { error: lo.otp.unfinishedSignup, code: typed };
    }
    const r = await loginFailed(account, attempt);
    return { error: wrongPasswordMessage(lo.otp.invalidCredentials, r, true), code: typed };
  }
  await loginSucceeded(account);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, approval, must_set_name, must_change_password")
    .eq("id", data.user.id)
    .single();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: lo.login.inactive, code: typed };
  }
  redirect(nextStep(profile));
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = passwordError(checkNewPassword(password, confirm));
  if (problem) return { error: problem };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: lo.changePassword.sameAsOld };
    if (error.code === "weak_password") return { error: lo.changePassword.weak };
    return { error: lo.errors.generic };
  }

  // Users cannot update their own profile row (RLS); clear the flag for this user only.
  const admin = createSupabaseAdminClient();
  const { data: profile, error: upErr } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
    .select("role, approval, must_set_name, must_change_password")
    .single();
  if (upErr || !profile) return { error: lo.errors.generic };

  redirect(nextStep(profile));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** First sign-in by phone: the student sets their display name and a password. */
export async function setupAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if ([...name].length < 2 || [...name].length > 80) return { error: lo.welcome.invalid };
  const password = String(form.get("password") ?? "");
  const problem = passwordError(checkNewPassword(password, String(form.get("confirm") ?? "")));
  if (problem) return { error: problem };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: pwErr } = await supabase.auth.updateUser({ password });
  if (pwErr && pwErr.code !== "same_password") {
    return {
      error: pwErr.code === "weak_password" ? lo.changePassword.weak : lo.errors.generic,
    };
  }

  // Users have no UPDATE on profiles (RLS); change only the caller's own row.
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: name, must_set_name: false, must_change_password: false })
    .eq("id", user.id)
    .select("role, approval, must_set_name, must_change_password")
    .single();
  if (error || !profile) return { error: lo.errors.generic };

  redirect(nextStep(profile));
}
