"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/data/types";
import { readImageUpload } from "@/lib/files";
import { lo } from "@/lib/i18n/lo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isInPayOrder, openWeeks, type PaymentStatus } from "@/lib/status";
import { MAX_WEEKS_PER_SLIP, checkPayableWeek } from "@/lib/week";

const STATUSES: PaymentStatus[] = ["pending", "approved", "rejected"];

function mapDbError(message: string, code?: string): string {
  if (code === "23505") return lo.errors.weekTaken;
  if (/future_week|before_start/.test(message)) return lo.errors.weekNotPayable;
  if (/slip_reused/.test(message)) return lo.errors.slipReused;
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
    "/expenses",
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
  if (weeks.length > MAX_WEEKS_PER_SLIP) return { ok: false, error: lo.errors.weekNotPayable };

  const [{ data: settings }, { data: mine }] = await Promise.all([
    supabase.from("settings").select("start_date").single(),
    supabase
      .from("payments")
      .select("week_start, status, amount, created_at")
      .eq("student_id", userId),
  ]);
  if (!settings) return { ok: false, error: lo.errors.generic };
  if (weeks.some((w) => !checkPayableWeek(w, settings.start_date).ok)) {
    return { ok: false, error: lo.errors.weekNotPayable };
  }
  // Weeks are paid in order: the slip must cover the oldest open weeks, none skipped.
  if (!isInPayOrder(weeks, openWeeks(settings.start_date, mine ?? []))) {
    return { ok: false, error: lo.errors.payInOrder };
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

/**
 * Sets a slip's status. `from` is the status the committee saw; the update only applies if it
 * is still that (another reviewer may have changed it). Reviewed slips can go back to pending
 * or be flipped approved ↔ rejected; cash payments cannot change.
 */
export async function reviewPaymentAction(
  paymentId: string,
  decision: PaymentStatus,
  reason?: string,
  from: PaymentStatus = "pending",
): Promise<ActionResult> {
  await requireSession("committee");
  if (!STATUSES.includes(decision) || !STATUSES.includes(from) || decision === from)
    return { ok: false, error: lo.errors.generic };
  const why = (reason ?? "").trim();
  if (decision === "rejected" && why.length < 5)
    return { ok: false, error: lo.errors.reasonTooShort };

  const supabase = await createSupabaseServerClient();
  // reviewed_by / reviewed_at / self_reviewed are set (or cleared) by the update trigger.
  const { data, error } = await supabase
    .from("payments")
    .update({ status: decision, reject_reason: decision === "rejected" ? why.slice(0, 200) : null })
    .eq("id", paymentId)
    .eq("status", from)
    .eq("source", "transfer")
    .select("id");
  if (error) return { ok: false, error: mapDbError(error.message, error.code) };
  if (!data?.length) return { ok: false, error: lo.errors.alreadyReviewed };

  revalidateAll();
  return { ok: true };
}

/**
 * Committee records cash received for a student (approved immediately by the trigger).
 * Same rules as a transfer: up to 7 weeks, in order from the oldest open week (pay ahead allowed).
 */
export async function addCashPaymentAction(
  studentId: string,
  weeks: string[],
  note: string,
): Promise<ActionResult<number>> {
  await requireSession("committee");
  const supabase = await createSupabaseServerClient();
  const unique = [...new Set(weeks)].sort();
  if (!unique.length) return { ok: false, error: lo.errors.noWeeks };
  if (unique.length > MAX_WEEKS_PER_SLIP) return { ok: false, error: lo.errors.weekNotPayable };

  const [{ data: settings }, { data: theirs }] = await Promise.all([
    supabase.from("settings").select("start_date").single(),
    supabase
      .from("payments")
      .select("week_start, status, amount, created_at")
      .eq("student_id", studentId),
  ]);
  if (!settings) return { ok: false, error: lo.errors.generic };
  if (!isInPayOrder(unique, openWeeks(settings.start_date, theirs ?? []))) {
    return { ok: false, error: lo.errors.payInOrder };
  }

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

/**
 * Undo a cash payment recorded by mistake. Cash rows are locked against updates, so the row is
 * removed with the service role and the removal is written to the audit log.
 */
export async function cancelCashPaymentAction(paymentId: string): Promise<ActionResult> {
  const { userId } = await requireSession("committee");
  const admin = createSupabaseAdminClient();
  const { data: p } = await admin
    .from("payments")
    .select("id, student_id, week_start, amount, source")
    .eq("id", paymentId)
    .maybeSingle();
  if (!p || p.source !== "cash") return { ok: false, error: lo.errors.generic };

  const { error } = await admin.from("payments").delete().eq("id", p.id).eq("source", "cash");
  if (error) return { ok: false, error: lo.errors.generic };
  await admin.from("audit_log").insert({
    actor_id: userId,
    action: "cash_cancel",
    entity: "payment",
    entity_id: p.id,
    meta: { student_id: p.student_id, week_start: p.week_start, amount: p.amount },
  });

  revalidateAll();
  revalidatePath(`/committee/members/${p.student_id}`);
  revalidatePath("/committee/audit");
  return { ok: true };
}
