/**
 * End-to-end test of pages + server actions against the running dev server and real Supabase.
 * Calls server actions over HTTP the way the browser does (Next-Action header), with sessions of
 * throwaway users (codes ZZE…). Everything it creates is deleted at the end; settings are restored.
 *   pnpm dev  (another terminal)  →  pnpm test:e2e
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { codeToEmail } from "../src/lib/validators";
import { currentWeekStart } from "../src/lib/week";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const tag = randomBytes(3).toString("hex").toUpperCase();
const users: string[] = [];
const expenseIds: string[] = [];
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

// --- helpers -------------------------------------------------------------

function png(seed: number): Blob {
  // Valid 1x1 PNG with a varying tEXt chunk so each "slip" has a different hash.
  const base = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const extra = Buffer.from(`seed${seed}${tag}`);
  return new Blob([Buffer.concat([base, extra])], { type: "image/png" });
}

async function signIn(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>();
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) =>
        list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function makeUser(suffix: string, role: "student" | "committee") {
  const code = `ZZE${tag}${suffix}`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email: codeToEmail(code),
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  users.push(data.user.id);
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    student_code: code,
    full_name: `E2E ${role} ${suffix}`,
    role,
    must_change_password: false,
  });
  if (pe) throw new Error(`profile: ${pe.message}`);
  return { id: data.user.id, code, cookie: await signIn(codeToEmail(code), password) };
}

async function page(path: string, cookie: string) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), html: await res.text() };
}

/** Find server action ids in compiled client chunks: createServerReference("<id>", …, "<name>"). */
function findActionIds(): Map<string, string> {
  const ids = new Map<string, string>();
  const roots = [".next/static/chunks", ".next/server"];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".js")) {
        const src = readFileSync(p, "utf8");
        // Turbopack: createServerReference"])("<id>", <callServer>, void 0, <findSourceMapURL>, "<name>")
        const re =
          /createServerReference"?\]?\)?\(\s*"([0-9a-f]{40,})"[\s\S]{0,1200}?"(\w+Action)"\)/g;
        for (const m of src.matchAll(re)) ids.set(m[2]!, m[1]!);
      }
    }
  };
  for (const r of roots) {
    try {
      walk(r);
    } catch {
      /* missing dir */
    }
  }
  return ids;
}

type Result = { ok: boolean; error?: string; data?: unknown } | null;

/** Invoke a server action like the React client does and pull the returned value out of the RSC payload. */
async function action(
  ids: Map<string, string>,
  name: string,
  cookie: string,
  args: unknown[] | FormData,
  pagePath = "/",
): Promise<{ status: number; result: Result }> {
  const id = ids.get(name);
  if (!id) throw new Error(`action id not found: ${name}`);
  let body: BodyInit;
  const headers: Record<string, string> = { cookie, "next-action": id, accept: "text/x-component" };
  if (args instanceof FormData) {
    const fd = new FormData();
    // Same layout as React's encodeReply: referenced FormData entries first, root model last.
    for (const [k, v] of args.entries()) fd.append(`_1_${k}`, v);
    fd.append("0", '["$K1"]');
    body = fd;
  } else {
    body = JSON.stringify(args);
    headers["content-type"] = "text/plain;charset=UTF-8";
  }
  const res = await fetch(BASE + pagePath, { method: "POST", headers, body, redirect: "manual" });
  const text = await res.text();
  // RSC rows look like `<hexId>:<json>`; nested values may be outlined as "$<hexId>".
  const rows = new Map<string, unknown>();
  for (const line of text.split("\n")) {
    const m = line.match(/^([0-9a-f]+):(.*)$/);
    if (!m) continue;
    try {
      rows.set(m[1]!, JSON.parse(m[2]!));
    } catch {
      /* not JSON */
    }
  }
  const resolve = (v: unknown, depth = 0): unknown => {
    if (depth > 20) return v;
    if (typeof v === "string" && /^\$@?[0-9a-f]+$/.test(v))
      return resolve(rows.get(v.replace(/^\$@?/, "")), depth + 1);
    if (Array.isArray(v)) return v.map((x) => resolve(x, depth + 1));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, depth + 1)]));
    }
    return v;
  };
  let result: Result = null;
  for (const v of rows.values()) {
    const r = resolve(v) as Record<string, unknown> | null;
    const candidate =
      r && typeof r === "object" && "ok" in r
        ? r
        : r && typeof r === "object" && "a" in r
          ? (r.a as Record<string, unknown>)
          : null;
    if (candidate && typeof candidate === "object" && "ok" in candidate)
      result = candidate as Result;
  }
  return { status: res.status, result };
}

// --- test ----------------------------------------------------------------

const { data: originalSettings } = await admin.from("settings").select("*").single();

async function main() {
  const s1 = await makeUser("S1", "student");
  const s2 = await makeUser("S2", "student");
  const c1 = await makeUser("C1", "committee");
  const c2 = await makeUser("C2", "committee");

  // Render pages (also compiles them so their action ids exist).
  for (const p of ["/dashboard", "/pay", "/history", "/profile"]) {
    const r = await page(p, s1.cookie);
    check(`student page ${p} renders`, r.status === 200, `status ${r.status}`);
  }
  for (const p of [
    "/committee",
    "/committee/review",
    "/committee/members",
    `/committee/members/${s1.id}`,
    "/committee/students",
    "/committee/expenses",
    "/committee/reports",
    "/committee/settings",
    "/committee/audit",
  ]) {
    const r = await page(p, c1.cookie);
    check(
      `committee page ${p} renders`,
      r.status === 200,
      `status ${r.status} ${r.location ?? ""}`,
    );
  }
  const prof = await page("/profile", s1.cookie);
  check("profile shows the signed-in student", prof.html.includes(s1.code));

  const ids = findActionIds();
  check("server action ids found", ids.size >= 10, `found ${[...ids.keys()].join(",")}`);

  const thisWeek = currentWeekStart();

  // --- student submits a slip ---
  const f1 = new FormData();
  f1.append("weeks", thisWeek);
  f1.append("slip", png(1), "slip.png");
  f1.append("reference", "E2E-REF");
  const sub = await action(ids, "submitPaymentAction", s1.cookie, f1, "/pay");
  check("student submits slip", sub.result?.ok === true, JSON.stringify(sub));

  const { data: p1 } = await admin.from("payments").select("*").eq("student_id", s1.id).single();
  check(
    "payment stored as pending with settings amount",
    p1?.status === "pending" && Number(p1?.amount) === Number(originalSettings!.weekly_amount),
  );
  check(
    "slip stored in student's folder",
    typeof p1?.slip_path === "string" && p1.slip_path.startsWith(`${s1.id}/`),
  );

  const f2 = new FormData();
  f2.append("weeks", thisWeek);
  f2.append("slip", png(1), "slip.png");
  const reuse = await action(ids, "submitPaymentAction", s2.cookie, f2, "/pay");
  check(
    "same slip by another student rejected",
    reuse.result?.ok === false && /ສະລິບນີ້ເຄີຍ/.test(reuse.result.error ?? ""),
    JSON.stringify(reuse.result),
  );

  const f3 = new FormData();
  f3.append("weeks", thisWeek);
  f3.append("slip", png(2), "slip.png");
  const dup = await action(ids, "submitPaymentAction", s1.cookie, f3, "/pay");
  check(
    "second live payment for same week rejected",
    dup.result?.ok === false,
    JSON.stringify(dup.result),
  );

  const f4 = new FormData();
  f4.append("weeks", thisWeek);
  f4.append("slip", new Blob(["<svg onload=alert(1)>"], { type: "image/png" }), "x.png");
  const fake = await action(ids, "submitPaymentAction", s2.cookie, f4, "/pay");
  check("disguised non-image rejected", fake.result?.ok === false, JSON.stringify(fake.result));

  const f5 = new FormData();
  f5.append("weeks", "2099-01-05");
  f5.append("slip", png(3), "slip.png");
  const fut = await action(ids, "submitPaymentAction", s2.cookie, f5, "/pay");
  check("future week rejected", fut.result?.ok === false, JSON.stringify(fut.result));

  // --- slip access ---
  const own = await action(ids, "getSlipUrlAction", s1.cookie, [p1!.id], "/history");
  check("owner gets a signed slip URL", own.result?.ok === true, JSON.stringify(own.result));
  const other = await action(ids, "getSlipUrlAction", s2.cookie, [p1!.id], "/history");
  check(
    "other student cannot get the slip",
    other.result?.ok === false,
    JSON.stringify(other.result),
  );
  const comm = await action(ids, "getSlipUrlAction", c1.cookie, [p1!.id], "/committee/review");
  check("committee gets the slip", comm.result?.ok === true, JSON.stringify(comm.result));

  // --- review ---
  const studentReview = await action(
    ids,
    "reviewPaymentAction",
    s1.cookie,
    [p1!.id, "approved"],
    "/dashboard",
  );
  const { data: still } = await admin.from("payments").select("status").eq("id", p1!.id).single();
  check(
    "student cannot approve (stays pending)",
    still?.status === "pending",
    `status ${studentReview.status}`,
  );

  const short = await action(
    ids,
    "reviewPaymentAction",
    c1.cookie,
    [p1!.id, "rejected", "no"],
    "/committee/review",
  );
  check("reject without a 5-char reason refused", short.result?.ok === false);
  const rej = await action(
    ids,
    "reviewPaymentAction",
    c1.cookie,
    [p1!.id, "rejected", "ສະລິບບໍ່ຊັດເຈນ"],
    "/committee/review",
  );
  check("committee rejects with reason", rej.result?.ok === true, JSON.stringify(rej.result));

  const f6 = new FormData();
  f6.append("weeks", thisWeek);
  f6.append("slip", png(4), "slip.png");
  const resub = await action(ids, "submitPaymentAction", s1.cookie, f6, "/pay");
  check(
    "student resubmits after rejection",
    resub.result?.ok === true,
    JSON.stringify(resub.result),
  );
  const { data: p2 } = await admin
    .from("payments")
    .select("id")
    .eq("student_id", s1.id)
    .eq("status", "pending")
    .single();
  const appr = await action(
    ids,
    "reviewPaymentAction",
    c2.cookie,
    [p2!.id, "approved"],
    "/committee/review",
  );
  check("committee approves resubmission", appr.result?.ok === true, JSON.stringify(appr.result));
  const again = await action(
    ids,
    "reviewPaymentAction",
    c1.cookie,
    [p2!.id, "rejected", "ທົດສອບອີກຄັ້ງ"],
    "/committee/review",
  );
  check("reviewed payment cannot be changed", again.result?.ok === false);

  const dash = await page("/dashboard", s1.cookie);
  check("student dashboard reflects approval", dash.status === 200 && dash.html.includes("ຈ່າຍແລ້ວ"));

  // Committee member's own slip cannot be self-reviewed while another committee exists.
  const f7 = new FormData();
  f7.append("weeks", thisWeek);
  f7.append("slip", png(5), "slip.png");
  await action(ids, "submitPaymentAction", c1.cookie, f7, "/pay");
  const { data: pc } = await admin.from("payments").select("id").eq("student_id", c1.id).single();
  const self = await action(
    ids,
    "reviewPaymentAction",
    c1.cookie,
    [pc!.id, "approved"],
    "/committee/review",
  );
  check(
    "committee cannot approve own slip",
    self.result?.ok === false,
    JSON.stringify(self.result),
  );

  // --- cash ---
  const cash = await action(
    ids,
    "addCashPaymentAction",
    c1.cookie,
    [s2.id, [thisWeek], "ຮັບເງິນສົດ"],
    `/committee/members/${s2.id}`,
  );
  const { data: pcash } = await admin
    .from("payments")
    .select("status, source")
    .eq("student_id", s2.id)
    .single();
  check(
    "cash payment recorded as approved",
    cash.result?.ok === true && pcash?.status === "approved" && pcash?.source === "cash",
    JSON.stringify(cash.result),
  );
  const cashByStudent = await action(
    ids,
    "addCashPaymentAction",
    s1.cookie,
    [s1.id, [thisWeek], "x"],
    "/dashboard",
  );
  check("student cannot record cash", cashByStudent.result?.ok !== true);

  // --- students ---
  const newCode = `ZZE${tag}N1`;
  const created = await action(
    ids,
    "createStudentAction",
    c1.cookie,
    [newCode.toLowerCase(), "  E2E   New Student "],
    "/committee/students",
  );
  const createdData = created.result?.data as { code: string; password: string } | undefined;
  check(
    "committee creates a student with temp password",
    created.result?.ok === true &&
      createdData?.code === newCode &&
      (createdData?.password.length ?? 0) >= 10,
    JSON.stringify(created.result?.ok),
  );
  const { data: np } = await admin
    .from("profiles")
    .select("id, full_name, must_change_password")
    .eq("student_code", newCode)
    .single();
  if (np) users.push(np.id);
  check(
    "new student must change password, name normalized",
    np?.must_change_password === true && np?.full_name === "E2E New Student",
  );
  if (createdData) {
    const cookie = await signIn(codeToEmail(newCode), createdData.password).catch(() => "");
    check("new student can sign in with temp password", !!cookie);
  }
  const dupCreate = await action(
    ids,
    "createStudentAction",
    c1.cookie,
    [newCode, "Dup"],
    "/committee/students",
  );
  check("duplicate student code refused", dupCreate.result?.ok === false);

  const imp = await action(
    ids,
    "importStudentsAction",
    c1.cookie,
    [`ZZE${tag}I1,Import One\nbad line\nZZE${tag}I1,Again`],
    "/committee/students",
  );
  const impData = imp.result?.data as { created: unknown[]; skipped: number } | undefined;
  check(
    "bulk import creates valid rows and skips bad ones",
    imp.result?.ok === true && impData?.created.length === 1 && impData?.skipped === 2,
    JSON.stringify(impData && { c: impData.created.length, s: impData.skipped }),
  );
  const { data: ip } = await admin
    .from("profiles")
    .select("id")
    .eq("student_code", `ZZE${tag}I1`)
    .maybeSingle();
  if (ip) users.push(ip.id);

  const reset = await action(ids, "resetPasswordAction", c1.cookie, [s2.id], "/committee/students");
  check("committee resets a password", reset.result?.ok === true);
  const { data: s2p } = await admin
    .from("profiles")
    .select("must_change_password")
    .eq("id", s2.id)
    .single();
  check("reset forces password change", s2p?.must_change_password === true);

  const selfOff = await action(
    ids,
    "setActiveAction",
    c1.cookie,
    [c1.id, false],
    "/committee/students",
  );
  check("committee cannot deactivate self", selfOff.result?.ok === false);
  const off = await action(
    ids,
    "setActiveAction",
    c1.cookie,
    [s1.id, false],
    "/committee/students",
  );
  check("committee deactivates a student", off.result?.ok === true);
  const blocked = await page("/dashboard", s1.cookie);
  check("deactivated student is signed out", blocked.status >= 300 && blocked.status < 400);
  const studentCreates = await action(
    ids,
    "createStudentAction",
    s2.cookie,
    [`ZZE${tag}X9`, "Nope"],
    "/dashboard",
  );
  const { data: x9 } = await admin
    .from("profiles")
    .select("id")
    .eq("student_code", `ZZE${tag}X9`)
    .maybeSingle();
  check("student cannot create accounts", !x9 && studentCreates.result?.ok !== true);

  // --- expenses ---
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Vientiane" }).format(new Date());
  const ex = await action(
    ids,
    "saveExpenseAction",
    c1.cookie,
    [{ id: null, title: `E2E ${tag}`, amount: "12,000", date: today, note: "" }],
    "/committee/expenses",
  );
  const { data: exRow } = await admin
    .from("expenses")
    .select("*")
    .eq("title", `E2E ${tag}`)
    .single();
  if (exRow) expenseIds.push(exRow.id);
  check(
    "committee adds expense",
    ex.result?.ok === true && Number(exRow?.amount) === 12000,
    JSON.stringify(ex.result),
  );
  const exUp = await action(
    ids,
    "saveExpenseAction",
    c1.cookie,
    [{ id: exRow!.id, title: `E2E ${tag}`, amount: "15000", date: today, note: "edited" }],
    "/committee/expenses",
  );
  const { data: exRow2 } = await admin
    .from("expenses")
    .select("amount, note")
    .eq("id", exRow!.id)
    .single();
  check(
    "committee edits expense",
    exUp.result?.ok === true && Number(exRow2?.amount) === 15000 && exRow2?.note === "edited",
  );
  const exFuture = await action(
    ids,
    "saveExpenseAction",
    c1.cookie,
    [{ id: null, title: "future", amount: "1", date: "2099-01-01", note: "" }],
    "/committee/expenses",
  );
  check("expense dated in the future refused", exFuture.result?.ok === false);
  const exDel = await action(
    ids,
    "deleteExpenseAction",
    c1.cookie,
    [exRow!.id],
    "/committee/expenses",
  );
  const { data: gone } = await admin
    .from("expenses")
    .select("id")
    .eq("id", exRow!.id)
    .maybeSingle();
  check("committee deletes expense", exDel.result?.ok === true && !gone);

  // --- settings (restored afterwards) ---
  const sf = new FormData();
  sf.append("weeklyAmount", "10,000");
  sf.append("startDate", originalSettings!.start_date);
  sf.append("bankName", "E2E Bank");
  sf.append("accountName", "E2E");
  sf.append("accountNo", "000");
  sf.append("note", "");
  sf.append("qr", png(9), "qr.png");
  const st = await action(ids, "saveSettingsAction", c1.cookie, sf, "/committee/settings");
  const { data: st1 } = await admin.from("settings").select("bank_name, qr_path").single();
  check(
    "committee saves settings with QR",
    st.result?.ok === true && st1?.bank_name === "E2E Bank" && !!st1?.qr_path,
    JSON.stringify(st.result),
  );
  const payPage = await page("/pay", c2.cookie);
  check("pay page shows bank from settings", payPage.html.includes("E2E Bank"));
  const sf2 = new FormData();
  for (const [k, v] of [
    ["weeklyAmount", String(originalSettings!.weekly_amount)],
    ["startDate", originalSettings!.start_date],
    ["bankName", originalSettings!.bank_name ?? ""],
    ["accountName", originalSettings!.account_name ?? ""],
    ["accountNo", originalSettings!.account_no ?? ""],
    ["note", originalSettings!.note ?? ""],
    ["removeQr", "1"],
  ] as const)
    sf2.append(k, v);
  const st2 = await action(ids, "saveSettingsAction", c1.cookie, sf2, "/committee/settings");
  const { data: st3 } = await admin.from("settings").select("qr_path, bank_name").single();
  check(
    "QR removed and settings restored",
    st2.result?.ok === true &&
      st3?.qr_path === (originalSettings!.qr_path ?? null) &&
      st3?.bank_name === originalSettings!.bank_name,
  );
  const stStudent = await action(ids, "saveSettingsAction", s2.cookie, sf, "/dashboard");
  const { data: st4 } = await admin.from("settings").select("bank_name").single();
  check(
    "student cannot change settings",
    st4?.bank_name === originalSettings!.bank_name && stStudent.result?.ok !== true,
  );

  // Audit trail written for the review actions.
  const { data: audit } = await admin.from("audit_log").select("action").eq("entity_id", p1!.id);
  check(
    "rejection written to audit log",
    (audit ?? []).some((a) => a.action === "reject"),
  );
}

async function cleanup() {
  const { data: pays } = await admin
    .from("payments")
    .select("id, slip_path")
    .in("student_id", users);
  const paths = [...new Set((pays ?? []).map((p) => p.slip_path).filter(Boolean) as string[])];
  if (paths.length) await admin.storage.from("slips").remove(paths);
  await admin.from("payments").delete().in("student_id", users);
  const payIds = (pays ?? []).map((p) => p.id);
  if (payIds.length) await admin.from("audit_log").delete().in("entity_id", payIds);
  if (expenseIds.length) {
    await admin.from("expenses").delete().in("id", expenseIds);
    await admin.from("audit_log").delete().in("entity_id", expenseIds);
  }
  await admin.from("audit_log").delete().in("actor_id", users);
  // Restore settings exactly and remove any QR left by the test.
  const { data: now } = await admin.from("settings").select("qr_path").single();
  if (now?.qr_path && now.qr_path !== originalSettings?.qr_path)
    await admin.storage.from("settings").remove([now.qr_path]);
  if (originalSettings) {
    const rest: Record<string, unknown> = { ...originalSettings };
    delete rest.id;
    delete rest.updated_at;
    await admin.from("settings").update(rest).eq("id", 1);
    await admin.from("audit_log").delete().eq("entity", "settings").gte("created_at", startedAt);
  }
  for (const id of users) await admin.auth.admin.deleteUser(id);
}

const startedAt = new Date().toISOString();
try {
  await main();
} catch (e) {
  failures++;
  console.error("✗ aborted:", e instanceof Error ? e.message : e);
} finally {
  await cleanup();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll end-to-end checks passed");
  process.exit(failures ? 1 : 0);
}
