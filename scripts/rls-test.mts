/**
 * End-to-end RLS / trigger / storage checks against the real Supabase project.
 * Creates throwaway users (…@klanghong.test), runs the checks, then deletes everything it made.
 *   pnpm test:rls
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anonKey || !serviceKey) {
  console.error("Supabase env vars missing in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(4).toString("hex");
const created: { id: string }[] = [];
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function makeUser(code: string, role: "student" | "committee") {
  const email = `rls-${tag}-${code.toLowerCase()}@klanghong.test`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  created.push({ id: data.user.id });
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    student_code: `T${tag.toUpperCase()}${code}`.slice(0, 20),
    full_name: `RLS ${code}`,
    role,
    must_change_password: false,
  });
  if (pe) throw new Error(`profile: ${pe.message}`);
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: se } = await client.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn: ${se.message}`);
  return { id: data.user.id, client };
}

function vientianeMonday(offsetWeeks = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Vientiane" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1) + offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
}

const fakeHash = () => randomBytes(32).toString("hex");

async function main() {
  const { data: settings } = await admin
    .from("settings")
    .select("weekly_amount, start_date")
    .single();
  check("settings row exists", !!settings);
  // Make sure this week is payable for the test.
  const week = vientianeMonday();
  const originalStart = settings!.start_date as string;
  if (originalStart > week) await admin.from("settings").update({ start_date: week }).eq("id", 1);

  const a = await makeUser("A", "student");
  const b = await makeUser("B", "student");
  const c = await makeUser("C", "committee");
  const d = await makeUser("D", "committee");

  // --- inserts (a transfer must point at a slip the student uploaded: migration 0007) ---
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const slipPath = `${a.id}/${week}/${randomUUID()}.png`;
  const up = await a.client.storage
    .from("slips")
    .upload(slipPath, png, { contentType: "image/png" });
  const dSlip = `${d.id}/${week}/${randomUUID()}.png`;
  await d.client.storage.from("slips").upload(dSlip, png, { contentType: "image/png" });

  const missing = await a.client.from("payments").insert({
    student_id: a.id,
    week_start: week,
    amount: 1,
    slip_path: `${a.id}/${week}/does-not-exist.png`,
    slip_sha256: fakeHash(),
  });
  check(
    "payment with a slip that was never uploaded rejected",
    /bad_slip/.test(missing.error?.message ?? ""),
  );
  const othersSlip = await b.client.from("payments").insert({
    student_id: b.id,
    week_start: week,
    amount: 1,
    slip_path: slipPath,
    slip_sha256: fakeHash(),
  });
  check(
    "payment pointing at another student's slip rejected",
    /bad_slip/.test(othersSlip.error?.message ?? ""),
  );
  const ins = await a.client
    .from("payments")
    .insert({
      student_id: a.id,
      week_start: week,
      amount: 1,
      status: "approved",
      slip_path: slipPath,
      slip_sha256: fakeHash(),
    })
    .select()
    .single();
  check("student can insert own payment", !ins.error, ins.error?.message);
  check("amount forced from settings", ins.data?.amount === settings!.weekly_amount);
  check("status forced to pending", ins.data?.status === "pending");
  const payId = ins.data?.id as string;

  const dup = await a.client.from("payments").insert({
    student_id: a.id,
    week_start: week,
    amount: 1,
    slip_path: slipPath,
    slip_sha256: fakeHash(),
  });
  check("duplicate live payment for same week rejected", !!dup.error);

  const forOther = await a.client.from("payments").insert({
    student_id: b.id,
    week_start: week,
    amount: 1,
    slip_path: `${b.id}/${week}/x.png`,
    slip_sha256: fakeHash(),
  });
  check("student cannot insert for another student", !!forOther.error);

  const future = await b.client.from("payments").insert({
    student_id: b.id,
    week_start: vientianeMonday(7), // pay-ahead limit is 6 weeks (0009)
    amount: 1,
    slip_path: `${b.id}/x.png`,
    slip_sha256: fakeHash(),
  });
  check(
    "week beyond the pay-ahead limit rejected",
    !!future.error && /future_week/.test(future.error.message),
  );

  // --- reads ---
  const bSees = await b.client.from("payments").select("id").eq("id", payId);
  check("student cannot read others' payments", (bSees.data ?? []).length === 0);
  const bProfiles = await b.client.from("profiles").select("id");
  check(
    "student reads only own profile",
    (bProfiles.data ?? []).every((p) => p.id === b.id),
  );
  const cSees = await c.client.from("payments").select("id").eq("id", payId);
  check("committee reads all payments", (cSees.data ?? []).length === 1);

  // --- updates ---
  const selfApprove = await a.client
    .from("payments")
    .update({ status: "approved" })
    .eq("id", payId)
    .select();
  check(
    "student cannot change status",
    !!selfApprove.error || (selfApprove.data ?? []).length === 0,
  );
  const sneaky = await c.client.from("payments").update({ amount: 999999 }).eq("id", payId);
  check("committee cannot change amount", !!sneaky.error);
  const shortReason = await c.client
    .from("payments")
    .update({ status: "rejected", reject_reason: "no" })
    .eq("id", payId);
  check("reject needs reason ≥ 5 chars", !!shortReason.error);
  const approve = await c.client
    .from("payments")
    .update({ status: "approved" })
    .eq("id", payId)
    .select()
    .single();
  check(
    "committee approves",
    !approve.error && approve.data?.status === "approved",
    approve.error?.message,
  );
  check("reviewed_by set by trigger", approve.data?.reviewed_by === c.id);
  // 0005: a reviewed slip may be re-reviewed (approved ↔ rejected), but not set to the same status
  // and its slip/amount fields stay fixed.
  const same = await c.client.from("payments").update({ status: "approved" }).eq("id", payId);
  check("re-review to the same status refused", !!same.error);
  const again = await c.client
    .from("payments")
    .update({ status: "rejected", reject_reason: "ທົດສອບອີກ" })
    .eq("id", payId);
  check("committee can change a reviewed slip", !again.error, again.error?.message);
  const back = await c.client
    .from("payments")
    .update({ status: "approved", reject_reason: null })
    .eq("id", payId);
  check("and change it back", !back.error, back.error?.message);

  // Committee D submits own slip; D cannot self-review while C exists.
  const dPay = await d.client
    .from("payments")
    .insert({
      student_id: d.id,
      week_start: week,
      amount: 1,
      slip_path: dSlip,
      slip_sha256: fakeHash(),
    })
    .select()
    .single();
  const selfReview = await d.client
    .from("payments")
    .update({ status: "approved" })
    .eq("id", dPay.data?.id);
  check("committee cannot review own payment", !!selfReview.error);

  // --- expenses / audit / fund ---
  const aExp = await a.client.from("expenses").insert({ title: "x", amount: 1, spent_at: week });
  check("student cannot add expense", !!aExp.error);
  const cExp = await c.client
    .from("expenses")
    .insert({ title: `RLS ${tag}`, amount: 1, spent_at: week })
    .select()
    .single();
  check("committee adds expense", !cExp.error, cExp.error?.message);
  const aAudit = await a.client.from("audit_log").select("id");
  check("student cannot read audit log", (aAudit.data ?? []).length === 0);
  const cAudit = await c.client.from("audit_log").select("action").eq("entity_id", payId);
  check(
    "approval written to audit log",
    (cAudit.data ?? []).some((r) => r.action === "approve"),
  );
  const fund = await a.client.rpc("get_fund_summary");
  check(
    "student can read fund totals",
    !fund.error && Array.isArray(fund.data),
    fund.error?.message,
  );
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonFund = await anon.rpc("get_fund_summary");
  check("anonymous cannot read fund totals", !!anonFund.error);
  const anonPay = await anon.from("payments").select("id");
  check("anonymous reads no payments", (anonPay.data ?? []).length === 0);

  // --- storage ---
  check("student uploads into own folder", !up.error, up.error?.message);
  const upOther = await a.client.storage
    .from("slips")
    .upload(`${b.id}/${week}/${randomUUID()}.png`, png, { contentType: "image/png" });
  check("student cannot upload into another folder", !!upOther.error);
  const bRead = await b.client.storage.from("slips").download(slipPath);
  check("student cannot read another student's slip", !!bRead.error);
  const cRead = await c.client.storage.from("slips").download(slipPath);
  check("committee reads any slip", !cRead.error, cRead.error?.message);
  const txt = await a.client.storage
    .from("slips")
    .upload(`${a.id}/${week}/${randomUUID()}.txt`, Buffer.from("hi"), {
      contentType: "text/plain",
    });
  check("non-image upload rejected", !!txt.error);

  // restore settings
  if (originalStart > week)
    await admin.from("settings").update({ start_date: originalStart }).eq("id", 1);
  if (cExp.data?.id) await admin.from("expenses").delete().eq("id", cExp.data.id);
  await admin.storage.from("slips").remove([slipPath, dSlip]);
}

async function cleanup() {
  const ids = created.map((u) => u.id);
  if (!ids.length) return;
  const { data: pays } = await admin.from("payments").select("id").in("student_id", ids);
  await admin.from("payments").delete().in("student_id", ids);
  const entityIds = (pays ?? []).map((p) => p.id as string);
  if (entityIds.length) await admin.from("audit_log").delete().in("entity_id", entityIds);
  await admin.from("audit_log").delete().like("meta->>title", `RLS ${tag}%`);
  for (const id of ids) await admin.auth.admin.deleteUser(id); // cascades profiles
}

try {
  await main();
} catch (e) {
  failures++;
  console.error("✗ aborted:", e instanceof Error ? e.message : e);
} finally {
  await cleanup();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll RLS checks passed");
  process.exit(failures ? 1 : 0);
}
