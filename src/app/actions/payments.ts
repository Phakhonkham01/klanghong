"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/data/types";
import { readImageUpload } from "@/lib/files";
import { lo } from "@/lib/i18n/lo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPayableWeek } from "@/lib/week";

const MAX_WEEKS = 26;

function mapDbError(message: string, code?: string): string {
  if (code === "23505") return lo.errors.weekTaken;
  if (/future_week|before_start/.test(message)) return lo.errors.weekNotPayable;
  if (/self_review/.test(message)) return lo.errors.selfReview;
  if (/already_reviewed/.test(message)) return lo.errors.alreadyReviewed;
  if (/payments_reject_reason/.test(message)) return lo.errors.reasonTooShort;
  if (code === "42501" || /forbidden|inactive_user|permission denied/.test(message)) {
    return lo.errors.notAllowed;
  }
  return lo.errors.generic;
}

function revalidateAll() {
  for (const p of [
    "/dashboard",
    "/history",
    "/pay",
    "/profile",
    "/committee",
    "/committee/review",
    "/committee/members",
    "/committee/reports",
  ]) {
    revalidatePath(p);
  }
}

/** Student submits one slip for one or more weeks (one payment row per week). */
export async function submitPaymentAction(form: FormData): Promise<ActionResult> {
  const { userId } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const weeks = [...new Set(form.getAll("weeks").map(String))].sort();
  if (!weeks.length) return { ok: false, error: lo.errors.noWeeks };
  if (weeks.length > MAX_WEEKS) return { ok: false, error: lo.errors.weekNotPayable };

  const { data: settings } = await supabase.from("settings").select("start_date").single();
  if (!settings) return { ok: false, error: lo.errors.generic };
  if (weeks.some((w) => !checkPayableWeek(w, settings.start_date).ok)) {
    return { ok: false, error: lo.errors.weekNotPayable };
  }

  const file = await readImageUpload(form.get("slip"));
  if (!file.ok) {
    return {
      ok: false,
      error:
        file.reason === "too_large"
          ? lo.errors.slipTooLarge
          : file.reason === "not_image"
            ? lo.errors.slipNotImage
            : lo.errors.slipMissing,
    };
  }

  // Slip reuse: the same image may not back another live payment (any student).
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("slip_sha256", file.sha256)
    .in("status", ["pending", "approved"]);
  if (count) return { ok: false, error: lo.errors.slipReused };

  const reference =
    String(form.get("reference") ?? "")
      .trim()
      .slice(0, 64) || null;
  const note =
    String(form.get("note") ?? "")
      .trim()
      .slice(0, 200) || null;

  // Uploaded with the user's own session: storage RLS limits it to their folder.
  const path = `${userId}/${weeks[0]}/${randomUUID()}.${file.kind.ext}`;
  const { error: upErr } = await supabase.storage
    .from("slips")
    .upload(path, file.bytes, { contentType: file.kind.mime, upsert: false });
  if (upErr) return { ok: false, error: lo.errors.uploadFailed };

  // Amount/status/review fields are forced by the insert trigger; one statement = all or nothing.
  const { error } = await supabase.from("payments").insert(
    weeks.map((week_start) => ({
      student_id: userId,
      week_start,
      amount: 1,
      slip_path: path,
      slip_sha256: file.sha256,
      transfer_ref: reference,
      note,
    })),
  );
  if (error) {
    await supabase.storage.from("slips").remove([path]);
    return { ok: false, error: mapDbError(error.message, error.code) };
  }

  revalidateAll();
  return { ok: true };
}

/** Short-lived URL for a payment's slip; RLS decides whether the caller may see it. */
export async function getSlipUrlAction(paymentId: string): Promise<ActionResult<string>> {
  await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select("slip_path")
    .eq("id", paymentId)
    .maybeSingle();
  if (!data?.slip_path) return { ok: false, error: lo.errors.slipUnavailable };
  const { data: signed } = await supabase.storage
    .from("slips")
    .createSignedUrl(data.slip_path, 120);
  if (!signed?.signedUrl) return { ok: false, error: lo.errors.slipUnavailable };
  return { ok: true, data: signed.signedUrl };
}

export async function reviewPaymentAction(
  paymentId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  await requireSession("committee");
  const why = (reason ?? "").trim();
  if (decision === "rejected" && why.length < 5)
    return { ok: false, error: lo.errors.reasonTooShort };

  const supabase = await createSupabaseServerClient();
  // reviewed_by / reviewed_at / self_reviewed are set by the update trigger.
  const { data, error } = await supabase
    .from("payments")
    .update({ status: decision, reject_reason: decision === "rejected" ? why.slice(0, 200) : null })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id");
  if (error) return { ok: false, error: mapDbError(error.message, error.code) };
  if (!data?.length) return { ok: false, error: lo.errors.alreadyReviewed };

  revalidateAll();
  return { ok: true };
}

/** Committee records cash received for a student (approved immediately by the trigger). */
export async function addCashPaymentAction(
  studentId: string,
  weeks: string[],
  note: string,
): Promise<ActionResult<number>> {
  await requireSession("committee");
  const supabase = await createSupabaseServerClient();
  const unique = [...new Set(weeks)].slice(0, MAX_WEEKS);
  if (!unique.length) return { ok: false, error: lo.errors.noWeeks };

  const { error } = await supabase.from("payments").insert(
    unique.map((week_start) => ({
      student_id: studentId,
      week_start,
      amount: 1,
      source: "cash" as const,
      note: note.trim().slice(0, 200) || lo.history.cash,
    })),
  );
  if (error) return { ok: false, error: mapDbError(error.message, error.code) };

  revalidateAll();
  revalidatePath(`/committee/members/${studentId}`);
  return { ok: true, data: unique.length };
}
