import "server-only";
import { unstable_cache } from "next/cache";
import { themeByKey, type FestivalTheme } from "@/lib/themes";
import { formatWeekRange } from "@/lib/format";
import { quotaWindowStart, vientianeMonthStart } from "@/lib/otp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditRow, PaymentRow, ProfileRow } from "@/types/database";
import type {
  AuditAction,
  AuditView,
  ClassWeekStats,
  ExpenseView,
  FundSummary,
  PaymentView,
  SettingsView,
  StudentView,
} from "./types";

/** All reads go through the signed-in user's client, so RLS decides what comes back. */

/** `withQr`: also sign the QR image URL (one extra storage call), only needed where it is shown. */
export async function getSettings({ withQr = false } = {}): Promise<SettingsView> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`settings: ${error?.message ?? "missing"}`);
  let qrUrl: string | null = null;
  // Column added by migration 0009; treat it as empty until that runs.
  const byWeeks = (data.qr_by_weeks ?? {}) as Record<string, string>;
  const weekPaths = Object.entries(byWeeks).filter(
    ([k, v]) => /^[1-7]$/.test(k) && typeof v === "string" && v,
  );
  const qrByWeeks: SettingsView["qrByWeeks"] = {};
  if (withQr) {
    const paths = [...(data.qr_path ? [data.qr_path] : []), ...weekPaths.map(([, v]) => v)];
    const urls = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("settings")
        .createSignedUrls(paths, 60 * 60);
      for (const x of signed ?? []) if (x.path && x.signedUrl) urls.set(x.path, x.signedUrl);
    }
    qrUrl = data.qr_path ? (urls.get(data.qr_path) ?? null) : null;
    for (const [k, v] of weekPaths) qrByWeeks[Number(k)] = { path: v, url: urls.get(v) ?? null };
  } else {
    for (const [k, v] of weekPaths) qrByWeeks[Number(k)] = { path: v, url: null };
  }
  return {
    weeklyAmount: Number(data.weekly_amount),
    startDate: data.start_date,
    bankName: data.bank_name ?? "",
    accountName: data.account_name ?? "",
    accountNo: data.account_no ?? "",
    qrPath: data.qr_path,
    qrUrl,
    qrByWeeks,
    note: data.note ?? "",
  };
}

export async function getFundSummary(): Promise<FundSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_fund_summary");
  if (error) throw new Error(`fund: ${error.message}`);
  const row = data?.[0];
  return {
    totalApproved: Number(row?.total_approved ?? 0),
    totalExpenses: Number(row?.total_expenses ?? 0),
    balance: Number(row?.balance ?? 0),
    pendingCount: Number(row?.pending_count ?? 0),
  };
}

function toPaymentView(p: PaymentRow, names: Map<string, string>): PaymentView {
  return {
    id: p.id,
    student_id: p.student_id,
    week_start: p.week_start,
    status: p.status,
    amount: Number(p.amount),
    created_at: p.created_at,
    reject_reason: p.reject_reason,
    source: p.source,
    hasSlip: !!p.slip_path,
    reviewed_at: p.reviewed_at,
    reviewer: p.reviewed_by ? (names.get(p.reviewed_by) ?? null) : null,
    reference: p.transfer_ref,
    note: p.note,
    self_reviewed: p.self_reviewed,
  };
}

/** Payments visible to the caller: own rows for students, everyone's for committee. */
/**
 * `withReviewerNames`: look up reviewers' names (one extra query). Committee only;
 * students cannot read other profiles anyway.
 */
export async function getPayments(
  filter: { studentId?: string; withReviewerNames?: boolean } = {},
): Promise<PaymentView[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("payments").select("*").order("created_at", { ascending: false });
  if (filter.studentId) q = q.eq("student_id", filter.studentId);
  const { data, error } = await q;
  if (error) throw new Error(`payments: ${error.message}`);
  const rows = data ?? [];
  const names = filter.withReviewerNames
    ? await getProfileNames(rows.map((r) => r.reviewed_by).filter(Boolean) as string[])
    : new Map<string, string>();
  return rows.map((r) => toPaymentView(r, names));
}

/** Names for the given profile ids that the caller is allowed to read. */
async function getProfileNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

function toStudentView(p: ProfileRow): StudentView {
  return {
    id: p.id,
    code: p.student_code,
    name: p.full_name,
    phone: p.phone,
    isActive: p.is_active,
    role: p.role,
    mustChangePassword: p.must_change_password,
    approval: p.approval,
    mustSetName: p.must_set_name,
  };
}

/** Committee only (RLS returns just the caller's own row for students). */
export async function getStudents(): Promise<StudentView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`profiles: ${error.message}`);
  return (data ?? []).map(toStudentView);
}

/**
 * OTP codes sent this month per phone. The OTP tables have no user grants,
 * so this uses the service role; call it only after requireSession("committee").
 */
export async function getOtpUsage(
  phones: string[],
  now: Date = new Date(),
): Promise<Map<string, number>> {
  const unique = [...new Set(phones.filter(Boolean))];
  if (!unique.length) return new Map();
  const admin = createSupabaseAdminClient();
  const month = vientianeMonthStart(now);
  const [{ data: reqs }, { data: resets }] = await Promise.all([
    admin
      .from("otp_requests")
      .select("phone, created_at")
      .in("phone", unique)
      .gte("created_at", month.toISOString()),
    admin.from("otp_quota_resets").select("phone, reset_at").in("phone", unique),
  ]);
  const resetAt = new Map((resets ?? []).map((r) => [r.phone, new Date(r.reset_at)]));
  const used = new Map<string, number>();
  for (const r of reqs ?? []) {
    const since = quotaWindowStart(now, resetAt.get(r.phone) ?? null);
    if (new Date(r.created_at) >= since) used.set(r.phone, (used.get(r.phone) ?? 0) + 1);
  }
  return used;
}

export async function getStudent(id: string): Promise<StudentView | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? toStudentView(data) : null;
}

export async function getExpenses(): Promise<ExpenseView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("spent_at", { ascending: false });
  if (error) throw new Error(`expenses: ${error.message}`);
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    spent_at: e.spent_at,
    note: e.note,
    hasReceipt: !!e.receipt_path,
  }));
}

function describeAudit(row: AuditRow, names: Map<string, string>): string {
  const m = row.meta as Record<string, unknown>;
  if (row.entity === "payment") {
    const who = names.get(String(m.student_id)) ?? "";
    const week = typeof m.week_start === "string" ? formatWeekRange(m.week_start) : "";
    const reason = typeof m.reason === "string" && m.reason ? ` · ${m.reason}` : "";
    return `${who} · ${week}${reason}`;
  }
  if (row.entity === "expense") return `${m.title ?? ""}`;
  if (row.entity === "settings") {
    const amount = m.weekly_amount as [number, number] | undefined;
    return amount && amount[0] !== amount[1] ? `${amount[0]} → ${amount[1]} ₭` : "";
  }
  return "";
}

export async function getAudit(limit = 100): Promise<AuditView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`audit: ${error.message}`);
  const rows = data ?? [];
  const ids = rows.flatMap((r) => [
    r.actor_id,
    (r.meta as Record<string, unknown>)?.student_id as string | undefined,
  ]);
  const names = await getProfileNames(ids.filter((x): x is string => !!x));
  return rows.map((r) => ({
    id: r.id,
    actor: (r.actor_id && names.get(r.actor_id)) || "—",
    action: r.action as AuditAction,
    detail: describeAudit(r, names),
    created_at: r.created_at,
  }));
}

/**
 * How many members paid this week (cash / transfer) out of how many. Students cannot read other
 * students' rows (RLS), so this counts with the service role and returns numbers only: call it
 * after requireSession().
 */
export async function getClassWeekStats(weekStart: string): Promise<ClassWeekStats> {
  const admin = createSupabaseAdminClient();
  const [{ data: members, error: mErr }, { data: pays, error: pErr }] = await Promise.all([
    admin.from("profiles").select("id").eq("is_active", true).eq("approval", "approved"),
    admin
      .from("payments")
      .select("student_id, source, status")
      .eq("week_start", weekStart)
      .in("status", ["approved", "pending"]),
  ]);
  if (mErr) throw new Error(`members: ${mErr.message}`);
  if (pErr) throw new Error(`payments: ${pErr.message}`);

  const memberIds = new Set((members ?? []).map((m) => m.id));
  const paid = new Map<string, "cash" | "transfer">();
  const pending = new Set<string>();
  for (const p of pays ?? []) {
    if (!memberIds.has(p.student_id)) continue;
    if (p.status === "approved") paid.set(p.student_id, p.source === "cash" ? "cash" : "transfer");
    else pending.add(p.student_id);
  }
  for (const id of paid.keys()) pending.delete(id);
  const paidCash = [...paid.values()].filter((s) => s === "cash").length;
  return {
    total: memberIds.size,
    paidCash,
    paidTransfer: paid.size - paidCash,
    pending: pending.size,
  };
}

/**
 * Counts for the committee nav badges: transfer slips waiting for review and phone sign-ups
 * waiting for approval. Uses the signed-in committee member's client (RLS lets them see all).
 */
export async function getCommitteeBadges(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const [slips, signups] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval", "pending")
      .eq("is_active", true),
  ]);
  return {
    "/committee/review": slips.count ?? 0,
    "/committee/students": signups.count ?? 0,
  };
}

/** Cache tag for the active festival theme; the save action revalidates it. */
export const THEME_TAG = "active-theme";

const readActiveTheme = unstable_cache(
  async (): Promise<string | null> => {
    const { data, error } = await createSupabaseAdminClient()
      .from("settings")
      .select("active_theme")
      .eq("id", 1)
      .single();
    // Before migration 0010 the column is missing: behave as "default theme".
    if (error) return null;
    return data?.active_theme ?? null;
  },
  ["active-theme"],
  { tags: [THEME_TAG], revalidate: 300 },
);

/** The festival theme everyone sees right now, or null for the default look. */
export async function getActiveTheme(): Promise<FestivalTheme | null> {
  return themeByKey(await readActiveTheme().catch(() => null));
}
