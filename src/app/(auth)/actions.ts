"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { lo } from "@/lib/i18n/lo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkNewPassword,
  codeToEmail,
  normalizeStudentCode,
  safeNextPath,
} from "@/lib/validators";

export type FormState = { error: string | null; code?: string };

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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: codeToEmail(code),
    password,
  });
  if (error || !data.user) {
    return {
      error: error?.status === 429 ? lo.login.tooMany : lo.login.invalidCredentials,
      code: typed,
    };
  }

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

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = checkNewPassword(password, confirm);
  if (problem === "too_short") return { error: lo.changePassword.tooShort };
  if (problem === "too_long") return { error: lo.changePassword.tooLong };
  if (problem === "mismatch") return { error: lo.changePassword.mismatch };

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
    .select("role")
    .single();
  if (upErr || !profile) return { error: lo.errors.generic };

  redirect(homeFor(profile.role));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** First sign-in by phone: the student sets their display name. */
export async function setNameAction(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if ([...name].length < 2 || [...name].length > 80) return { error: lo.welcome.invalid };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Users have no UPDATE on profiles (RLS); change only the caller's own name.
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: name, must_set_name: false })
    .eq("id", user.id)
    .select("role, approval")
    .single();
  if (error || !profile) return { error: lo.errors.generic };

  redirect(profile.approval === "approved" ? homeFor(profile.role) : "/pending");
}
