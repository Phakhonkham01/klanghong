"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/data/types";
import { readImageUpload } from "@/lib/files";
import { lo } from "@/lib/i18n/lo";
import { parseKip } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isIsoDate, todayInTz } from "@/lib/week";
import type { SettingsRow } from "@/types/database";

const e = lo.committee.expenses;
const s = lo.committee.settings;

function revalidateMoney() {
  for (const p of [
    "/committee",
    "/committee/expenses",
    "/expenses",
    "/committee/reports",
    "/dashboard",
    "/committee/audit",
  ]) {
    revalidatePath(p);
  }
}

export async function saveExpenseAction(input: {
  id: string | null;
  title: string;
  amount: string;
  date: string;
  note: string;
}): Promise<ActionResult> {
  await requireSession("committee");
  const title = input.title.trim().slice(0, 100);
  const amount = parseKip(input.amount);
  if (!title || !amount || !isIsoDate(input.date) || input.date > todayInTz()) {
    return { ok: false, error: e.invalid };
  }
  const row = {
    title,
    amount,
    spent_at: input.date,
    note: input.note.trim().slice(0, 200) || null,
  };
  const supabase = await createSupabaseServerClient();
  const { error } = input.id
    ? await supabase.from("expenses").update(row).eq("id", input.id)
    : await supabase.from("expenses").insert(row);
  if (error) return { ok: false, error: lo.errors.generic };
  revalidateMoney();
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  await requireSession("committee");
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: lo.errors.generic };
  if (row?.receipt_path) await supabase.storage.from("receipts").remove([row.receipt_path]);
  revalidateMoney();
  return { ok: true };
}

export async function saveSettingsAction(form: FormData): Promise<ActionResult> {
  await requireSession("committee");
  const supabase = await createSupabaseServerClient();

  const amount = parseKip(String(form.get("weeklyAmount") ?? ""));
  if (!amount || amount <= 0) return { ok: false, error: s.invalidAmount };
  const startDate = String(form.get("startDate") ?? "");
  if (!isIsoDate(startDate)) return { ok: false, error: lo.week.errors.invalid_date };

  const update: Partial<SettingsRow> = {
    weekly_amount: amount,
    start_date: startDate,
    bank_name:
      String(form.get("bankName") ?? "")
        .trim()
        .slice(0, 60) || null,
    account_name:
      String(form.get("accountName") ?? "")
        .trim()
        .slice(0, 80) || null,
    account_no:
      String(form.get("accountNo") ?? "")
        .trim()
        .slice(0, 40) || null,
    note:
      String(form.get("note") ?? "")
        .trim()
        .slice(0, 300) || null,
  };

  const { data: current } = await supabase.from("settings").select("qr_path").single();
  let oldQr: string | null = null;

  const qr = form.get("qr");
  if (qr && typeof qr !== "string" && qr.size > 0) {
    const file = await readImageUpload(qr);
    if (!file.ok) {
      return {
        ok: false,
        error: file.reason === "too_large" ? lo.errors.slipTooLarge : lo.errors.slipNotImage,
      };
    }
    const path = `qr/${randomUUID()}.${file.kind.ext}`;
    const { error } = await supabase.storage
      .from("settings")
      .upload(path, file.bytes, { contentType: file.kind.mime });
    if (error) return { ok: false, error: lo.errors.uploadFailed };
    update.qr_path = path;
    oldQr = current?.qr_path ?? null;
  } else if (form.get("removeQr") === "1") {
    update.qr_path = null;
    oldQr = current?.qr_path ?? null;
  }

  const { error } = await supabase.from("settings").update(update).eq("id", 1);
  if (error) return { ok: false, error: lo.errors.generic };
  if (oldQr) await supabase.storage.from("settings").remove([oldQr]);

  for (const p of ["/committee/settings", "/pay", "/dashboard", "/committee", "/committee/audit"])
    revalidatePath(p);
  return { ok: true };
}
