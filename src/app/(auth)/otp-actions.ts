"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendOtp } from "wenova-link";
import { homeFor } from "@/lib/auth";
import { formatDateLo } from "@/lib/format";
import { lo } from "@/lib/i18n/lo";
import {
  OTP,
  generateOtp,
  hashOtp,
  otpMatches,
  otpMessage,
  quotaWindowStart,
  vientianeNextMonthStart,
} from "@/lib/otp";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const t = lo.otp;

/** signup: first sign-in (creates the account); reset: forgot password (existing account only). */
export type OtpPurpose = "signup" | "reset";

export type OtpRequestState =
  | { ok: true; phone: string; remaining: number; resendIn: number; devCode?: string }
  | { ok: false; error: string };

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

async function usedThisMonth(phone: string, now: Date): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data: reset } = await admin
    .from("otp_quota_resets")
    .select("reset_at")
    .eq("phone", phone)
    .maybeSingle();
  const since = quotaWindowStart(now, reset ? new Date(reset.reset_at) : null);
  const { count } = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/** Step 1: send a one-time code by SMS (3 per number per month). */
export async function requestOtpAction(
  rawPhone: string,
  purpose: OtpPurpose = "signup",
): Promise<OtpRequestState> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: t.invalidPhone };

  const admin = createSupabaseAdminClient();
  const now = new Date();

  // Don't spend SMS on accounts that cannot sign in anyway.
  const { data: profile } = await admin
    .from("profiles")
    .select("is_active, approval, must_change_password, must_set_name")
    .eq("phone", phone)
    .maybeSingle();
  if (profile && !profile.is_active) return { ok: false, error: lo.login.inactive };
  if (profile?.approval === "rejected") return { ok: false, error: t.rejected };
  if (purpose === "reset" && !profile) return { ok: false, error: t.notRegistered };
  // Already has a password: sign in with it (or use "forgot password") instead of a new OTP.
  if (purpose === "signup" && profile && !profile.must_change_password && !profile.must_set_name) {
    return { ok: false, error: t.alreadyRegistered };
  }

  const used = await usedThisMonth(phone, now);
  if (used >= OTP.monthlyLimit) {
    return { ok: false, error: t.monthlyLimit(formatDateLo(nextMonthIso(now))) };
  }

  const { data: last } = await admin
    .from("otp_requests")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const wait =
      OTP.resendSeconds - Math.floor((now.getTime() - Date.parse(last.created_at)) / 1000);
    if (wait > 0) return { ok: false, error: t.wait(wait) };
  }

  const ip = await clientIp();
  if (ip) {
    const { count } = await admin
      .from("otp_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", new Date(now.getTime() - 3600_000).toISOString());
    if ((count ?? 0) >= OTP.perIpPerHour) return { ok: false, error: t.tooMany };
  }
  const { count: today } = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(now.getTime() - 86_400_000).toISOString());
  if ((today ?? 0) >= OTP.globalPerDay) return { ok: false, error: t.busy };

  const devLog = process.env.NODE_ENV !== "production" && process.env.OTP_DEV_LOG === "1";
  const token = process.env.WENOVA_API_TOKEN?.trim();
  if (!token && !devLog) return { ok: false, error: t.notConfigured };

  const code = generateOtp();
  const { data: row, error: insErr } = await admin
    .from("otp_requests")
    .insert({
      phone,
      code_hash: hashOtp(phone, code),
      ip,
      expires_at: new Date(now.getTime() + OTP.ttlMinutes * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (insErr || !row) return { ok: false, error: lo.errors.generic };

  if (devLog) {
    // Development only: no SMS is sent, the code is shown in the server log.
    console.info(`[otp] ${phone} → ${code}`);
  } else {
    try {
      await sendOtp({
        header: process.env.WENOVA_SMS_HEADER?.trim() || "WNV-OTP",
        phoneNumber: phone,
        message: otpMessage(code),
        token: token!,
        usePackage: process.env.WENOVA_USE_PACKAGE === "true",
      });
    } catch (e) {
      // A failed send does not count against the monthly limit.
      await admin.from("otp_requests").delete().eq("id", row.id);
      console.error("[otp] send failed:", e instanceof Error ? e.message : e);
      return { ok: false, error: t.smsFailed };
    }
  }

  return {
    ok: true,
    phone,
    remaining: OTP.monthlyLimit - used - 1,
    resendIn: OTP.resendSeconds,
  };
}

function nextMonthIso(now: Date): string {
  const d = new Date(vientianeNextMonthStart(now).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 10);
}

export type OtpVerifyState = { ok: false; error: string } | null;

/** Step 2: check the code, create the account on first use, and start a session. */
export async function verifyOtpAction(
  rawPhone: string,
  rawCode: string,
  purpose: OtpPurpose = "signup",
): Promise<OtpVerifyState> {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (!phone || code.length !== OTP.length) return { ok: false, error: t.invalidCode };

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data: req } = await admin
    .from("otp_requests")
    .select("*")
    .eq("phone", phone)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!req) return { ok: false, error: t.expired };
  if (req.attempts >= OTP.maxAttempts) return { ok: false, error: t.tooManyAttempts };

  if (!otpMatches(phone, code, req.code_hash)) {
    await admin
      .from("otp_requests")
      .update({ attempts: req.attempts + 1 })
      .eq("id", req.id);
    const left = OTP.maxAttempts - req.attempts - 1;
    return { ok: false, error: left > 0 ? t.wrongCode(left) : t.tooManyAttempts };
  }

  // Single use, even under concurrent submits.
  const { data: consumed } = await admin
    .from("otp_requests")
    .update({ consumed_at: nowIso })
    .eq("id", req.id)
    .is("consumed_at", null)
    .select("id");
  if (!consumed?.length) return { ok: false, error: t.expired };

  const email = phoneToEmail(phone);
  let { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active, approval, must_set_name, must_change_password")
    .eq("phone", phone)
    .maybeSingle();

  if (profile && !profile.is_active) return { ok: false, error: lo.login.inactive };
  if (!profile && purpose === "reset") return { ok: false, error: t.notRegistered };

  if (!profile) {
    // First sign-in: self-registration, waits for committee approval.
    const created = await admin.auth.admin.createUser({
      email,
      password: randomBytes(24).toString("base64url"),
      email_confirm: true,
    });
    let userId = created.data.user?.id;
    if (!userId) {
      // An auth user may exist without a profile (e.g. an earlier half-finished sign-up).
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      userId = link.data.user?.id;
    }
    if (!userId) return { ok: false, error: lo.errors.generic };
    const { data: inserted, error } = await admin
      .from("profiles")
      .insert({
        id: userId,
        phone,
        full_name: "",
        student_code: null,
        role: "student",
        approval: "pending",
        must_set_name: true,
        // A password is chosen on /welcome together with the name.
        must_change_password: true,
      })
      .select("id, role, is_active, approval, must_set_name, must_change_password")
      .single();
    if (error || !inserted) return { ok: false, error: lo.errors.generic };
    profile = inserted;
  }

  // Turn the verified phone into a Supabase session without exposing a password.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data.properties?.hashed_token;
  if (!tokenHash) return { ok: false, error: lo.errors.generic };
  const supabase = await createSupabaseServerClient();
  const { error: sessErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (sessErr) return { ok: false, error: lo.errors.generic };

  if (purpose === "reset" && !profile.must_set_name) {
    // Forgot password: the verified phone may now choose a new one.
    await admin.from("profiles").update({ must_change_password: true }).eq("id", profile.id);
    redirect("/change-password");
  }
  if (profile.must_set_name) redirect("/welcome");
  if (profile.must_change_password) redirect("/change-password");
  if (profile.approval !== "approved") redirect("/pending");
  redirect(homeFor(profile.role));
}
