/**
 * Pay ahead (up to 7 weeks per slip) and fixed-amount QR codes (migration 0009), against the
 * running dev server and real Supabase. Restores settings.qr_by_weeks and deletes everything it
 * creates (users, payments, uploaded files).
 *   pnpm dev  (another terminal)  →  pnpm test:prepay
 */
import { randomBytes } from "node:crypto";
import { formatDateLo } from "../src/lib/format";
import { codeToEmail } from "../src/lib/validators";
import { openWeeks } from "../src/lib/status";
import { addDays, currentWeekStart } from "../src/lib/week";
import {
  admin,
  callAction,
  check,
  fail,
  failureCount,
  findActionIds,
  page,
  signIn,
} from "./lib/harness.mts";

const tag = randomBytes(2).toString("hex").toUpperCase();
const users: string[] = [];
const uploaded: string[] = [];
let originalQr: Record<string, string> | null = null;
let studentId = "";

function png(seed: string): Blob {
  const base = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  return new Blob([Buffer.concat([base, Buffer.from(`${seed}${tag}`)])], { type: "image/png" });
}

async function makeUser(code: string, role: "student" | "committee", pw: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: codeToEmail(code),
    password: pw,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  users.push(data.user.id);
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    student_code: code,
    full_name: `Prepay ${role}`,
    role,
    must_change_password: false,
  });
  if (pe) throw new Error(`profile: ${pe.message}`);
  return data.user.id;
}

async function cleanup() {
  if (studentId) {
    const { data: pays } = await admin
      .from("payments")
      .select("slip_path")
      .eq("student_id", studentId);
    const slips = [...new Set((pays ?? []).map((p) => p.slip_path).filter(Boolean))] as string[];
    if (slips.length) await admin.storage.from("slips").remove(slips);
    await admin.from("payments").delete().eq("student_id", studentId);
  }
  // Restore only if it changed: every settings write adds an audit entry.
  const { data: now } = await admin.from("settings").select("qr_by_weeks").eq("id", 1).single();
  const same = (a: object, b: object) =>
    JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  if (originalQr && !same(originalQr, (now?.qr_by_weeks ?? {}) as object)) {
    await admin.from("settings").update({ qr_by_weeks: originalQr }).eq("id", 1);
  }
  const { data: s } = await admin.from("settings").select("qr_by_weeks").eq("id", 1).single();
  const kept = new Set(Object.values((s?.qr_by_weeks ?? {}) as Record<string, string>));
  const orphans = uploaded.filter((p) => !kept.has(p));
  if (orphans.length) await admin.storage.from("settings").remove(orphans);
  // The test's own audit entries (QR edits, cash, cancels) would clutter "recent activity".
  if (users.length) await admin.from("audit_log").delete().in("actor_id", users);
  if (studentId) await admin.from("audit_log").delete().eq("meta->>student_id", studentId);
  for (const id of users) await admin.auth.admin.deleteUser(id);
}

async function main() {
  const { data: s0, error } = await admin.from("settings").select("*").eq("id", 1).single();
  if (error || !s0) throw new Error(`settings: ${error?.message}`);
  if (!("qr_by_weeks" in s0)) {
    console.error("Column settings.qr_by_weeks is missing: run 0009_prepay_and_amount_qr.sql.");
    process.exit(2);
  }
  originalQr = (s0.qr_by_weeks ?? {}) as Record<string, string>;
  // Never touch a real QR: replacing a slot deletes its file. Stop if the test slot is in use.
  if (originalQr["4"]) {
    console.error("The 4-week QR slot is in use; this test would replace it. Not running.");
    process.exit(2);
  }
  const weekly = Number(s0.weekly_amount);
  const thisWeek = currentWeekStart();
  if (s0.start_date > thisWeek)
    throw new Error("start_date is after this week; test needs it open");

  const pw = randomBytes(12).toString("base64url");
  await makeUser(`ZZC${tag}`, "committee", pw);
  studentId = await makeUser(`ZZP${tag}`, "student", pw);
  const committee = await signIn(codeToEmail(`ZZC${tag}`), pw);
  const student = await signIn(codeToEmail(`ZZP${tag}`), pw);

  await page("/committee/settings", committee);
  await page("/pay", student);
  const ids = findActionIds();
  await page(`/committee/members/${studentId}`, committee);
  const more = findActionIds();
  for (const [k, v] of more) ids.set(k, v);
  for (const n of [
    "saveWeekQrAction",
    "submitPaymentAction",
    "addCashPaymentAction",
    "cancelCashPaymentAction",
  ]) {
    if (!ids.has(n)) throw new Error(`missing action id ${n}`);
  }

  // --- committee: fixed-amount QR for 4 weeks ---
  const up = new FormData();
  up.set("weeks", "4");
  up.set("qr", png("qr4"), "qr4.png");
  const saved = await callAction(ids, "saveWeekQrAction", committee, [up], "/committee/settings");
  const { data: s1 } = await admin.from("settings").select("qr_by_weeks").eq("id", 1).single();
  const qr4 = ((s1?.qr_by_weeks ?? {}) as Record<string, string>)["4"];
  if (qr4) uploaded.push(qr4);
  check(
    "committee uploads the 4-week QR",
    saved.result?.ok === true && !!qr4?.startsWith("qr/weeks-4/"),
    JSON.stringify(saved.result),
  );
  const bad = new FormData();
  bad.set("weeks", "8");
  bad.set("qr", png("qr8"), "qr8.png");
  const eight = await callAction(ids, "saveWeekQrAction", committee, [bad], "/committee/settings");
  check("QR for 8 weeks refused", eight.result?.ok === false, JSON.stringify(eight.result));
  const byStudent = await callAction(ids, "saveWeekQrAction", student, [up], "/pay");
  check("student cannot upload a QR", byStudent.result?.ok !== true);

  const settingsPage = await page("/committee/settings", committee);
  check("settings page lists the 4-week QR", settingsPage.html.includes("qr/weeks-4/"));
  const payPage = await page("/pay", student);
  check("pay page receives the 4-week QR", payPage.html.includes("weeks-4"));
  check(
    "pay page offers weeks ahead",
    payPage.html.includes(formatDateLo(addDays(thisWeek, 42), false).split(" ")[0]!),
  );

  // --- student: this week + 3 ahead in one slip ---
  // A new student owes every week since the start date: pay the oldest 4 open weeks, in order.
  const open = openWeeks(s0.start_date, []).map((o) => o.weekStart);
  const skip = new FormData();
  skip.append("weeks", open[1]!);
  skip.append("slip", png("skip"), "slip.png");
  const skipped = await callAction(ids, "submitPaymentAction", student, [skip], "/pay");
  check("skipping the oldest open week refused", skipped.result?.ok === false);

  const four = open.slice(0, 4);
  const f4 = new FormData();
  for (const w of four) f4.append("weeks", w);
  f4.append("slip", png("slip4"), "slip.png");
  const paid4 = await callAction(ids, "submitPaymentAction", student, [f4], "/pay");
  const { data: rows } = await admin
    .from("payments")
    .select("week_start, status, amount")
    .eq("student_id", studentId)
    .order("week_start");
  check(
    "the 4 oldest open weeks submitted with one slip",
    paid4.result?.ok === true && rows?.length === 4 && rows.every((r) => r.status === "pending"),
    JSON.stringify(paid4.result),
  );
  check("each week is charged the weekly fee", !!rows?.every((r) => Number(r.amount) === weekly));

  const dash = await page("/dashboard", student);
  check(
    "dashboard shows a week paid ahead as waiting for review",
    dash.html.includes(`${formatDateLo(four[3]!)} · ລໍຖ້າກວດ`),
  );

  // --- limits ---
  const f8 = new FormData();
  for (let i = 4; i < 12; i++) f8.append("weeks", addDays(thisWeek, 7 * i));
  f8.append("slip", png("slip8"), "slip.png");
  const eightWeeks = await callAction(ids, "submitPaymentAction", student, [f8], "/pay");
  check("8 weeks in one slip refused", eightWeeks.result?.ok === false);
  const far = new FormData();
  far.append("weeks", addDays(thisWeek, 49));
  far.append("slip", png("far"), "slip.png");
  const tooFar = await callAction(ids, "submitPaymentAction", student, [far], "/pay");
  check("a week 7 ahead refused", tooFar.result?.ok === false);

  // --- committee removes the QR ---
  const rm = new FormData();
  rm.set("weeks", "4");
  rm.set("remove", "1");
  const removed = await callAction(ids, "saveWeekQrAction", committee, [rm], "/committee/settings");
  const { data: s2 } = await admin.from("settings").select("qr_by_weeks").eq("id", 1).single();
  const { data: files } = await admin.storage.from("settings").list("qr/weeks-4");
  check(
    "committee removes the 4-week QR (setting and file)",
    removed.result?.ok === true &&
      !((s2?.qr_by_weeks ?? {}) as Record<string, string>)["4"] &&
      !(files ?? []).some((f) => qr4?.endsWith(f.name)),
    JSON.stringify(removed.result),
  );

  // --- committee: cash for several weeks, in order, then cancel one ---
  const after = openWeeks(s0.start_date, rows ?? []).map((o) => o.weekStart);
  const cashSkip = await callAction(
    ids,
    "addCashPaymentAction",
    committee,
    [studentId, [after[1]], "skip"],
    `/committee/members/${studentId}`,
  );
  check("cash that skips a week refused", cashSkip.result?.ok !== true);
  const cash2 = await callAction(
    ids,
    "addCashPaymentAction",
    committee,
    [studentId, after.slice(0, 2), "e2e cash"],
    `/committee/members/${studentId}`,
  );
  const { data: cashRows } = await admin
    .from("payments")
    .select("id, week_start, status, source")
    .eq("student_id", studentId)
    .eq("source", "cash")
    .order("week_start");
  check(
    "committee records cash for 2 weeks at once",
    cash2.result?.ok === true &&
      cashRows?.length === 2 &&
      cashRows.every((r) => r.status === "approved"),
    JSON.stringify(cash2.result),
  );
  const byStudentCancel = await callAction(
    ids,
    "cancelCashPaymentAction",
    student,
    [cashRows?.[1]?.id],
    "/dashboard",
  );
  check("student cannot cancel cash", byStudentCancel.result?.ok !== true);
  const cancel = await callAction(
    ids,
    "cancelCashPaymentAction",
    committee,
    [cashRows?.[1]?.id],
    `/committee/members/${studentId}`,
  );
  const { count: left } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("source", "cash");
  const { data: logged } = await admin
    .from("audit_log")
    .select("action")
    .eq("action", "cash_cancel")
    .eq("entity_id", cashRows?.[1]?.id ?? "");
  check(
    "committee cancels one cash week (removed and logged)",
    cancel.result?.ok === true && left === 1 && (logged ?? []).length === 1,
    JSON.stringify(cancel.result),
  );
  const transferRow = await admin
    .from("payments")
    .select("id")
    .eq("student_id", studentId)
    .eq("source", "transfer")
    .limit(1)
    .single();
  const notCash = await callAction(
    ids,
    "cancelCashPaymentAction",
    committee,
    [transferRow.data?.id],
    `/committee/members/${studentId}`,
  );
  check("a transfer cannot be cancelled as cash", notCash.result?.ok === false);
}

try {
  await main();
} catch (e) {
  console.error(e);
  fail();
} finally {
  await cleanup();
}
const failed = failureCount();
console.log(failed ? `\n${failed} check(s) failed` : "\nAll prepay checks passed");
process.exit(failed ? 1 : 0);
