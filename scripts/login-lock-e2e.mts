/**
 * Password sign-in lock (migration 0008) against the running dev server and real Supabase:
 * 5 wrong passwords lock the account for 2 hours; the committee can unlock it; a right password,
 * an expired lock or an OTP password reset clear it. Sends no SMS (OTP codes are planted).
 * Uses fake number 20997xxxxx and a ZZL… code, and cleans up everything it creates.
 *   pnpm dev  (another terminal)  →  pnpm test:lock
 */
import { randomBytes } from "node:crypto";
import { hashOtp } from "../src/lib/otp";
import { phoneToEmail } from "../src/lib/phone";
import { codeToEmail } from "../src/lib/validators";
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

const tag = randomBytes(2).toString("hex");
const PHONE = `20997${String(parseInt(tag, 16) % 100000).padStart(5, "0")}`;
const CODE = `ZZL${tag.toUpperCase()}`;
const COMMITTEE = `ZZK${tag.toUpperCase()}`;
const ACCOUNTS = [`phone:${PHONE}`, `code:${CODE}`, `code:${COMMITTEE}`];
const users: string[] = [];

async function cleanup() {
  await admin.from("login_failures").delete().in("account", ACCOUNTS);
  await admin.from("login_locks").delete().in("account", ACCOUNTS);
  await admin.from("otp_requests").delete().eq("phone", PHONE);
  for (const id of new Set(users)) await admin.auth.admin.deleteUser(id);
}

async function createUser(email: string, password: string, profile: Record<string, unknown>) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  users.push(data.user.id);
  const { error: pe } = await admin.from("profiles").insert({ id: data.user.id, ...profile });
  if (pe) throw new Error(`profile: ${pe.message}`);
  return data.user.id;
}

function phoneForm(phone: string, password: string) {
  const fd = new FormData();
  fd.set("phone", `0${phone}`);
  fd.set("password", password);
  return fd;
}

function codeForm(code: string, password: string) {
  const fd = new FormData();
  fd.set("code", code);
  fd.set("password", password);
  return fd;
}

async function failures(account: string): Promise<number> {
  const { count } = await admin
    .from("login_failures")
    .select("id", { count: "exact", head: true })
    .eq("account", account);
  return count ?? 0;
}

async function main() {
  for (const t of ["login_failures", "login_locks"] as const) {
    const { error } = await admin.from(t).select("*").limit(1);
    if (error) {
      console.error(`Table ${t} is missing: run supabase/migrations/0008_login_lock.sql first.`);
      process.exit(2);
    }
  }
  await cleanup();

  const pw = randomBytes(12).toString("base64url");
  const studentId = await createUser(phoneToEmail(PHONE), pw, {
    phone: PHONE,
    full_name: "Lock test student",
    student_code: null,
    role: "student",
    approval: "approved",
    must_set_name: false,
    must_change_password: false,
  });
  await createUser(codeToEmail(CODE), pw, {
    student_code: CODE,
    full_name: "Lock test code account",
    role: "committee",
    must_change_password: false,
  });
  await createUser(codeToEmail(COMMITTEE), pw, {
    student_code: COMMITTEE,
    full_name: "Lock test committee",
    role: "committee",
    must_change_password: false,
  });

  await page("/login");
  const committee = await signIn(codeToEmail(COMMITTEE), pw);
  await page("/committee/students", committee);
  const ids = findActionIds();
  for (const n of ["signInPhoneAction", "signInAction", "unlockLoginAction", "verifyOtpAction"]) {
    if (!ids.has(n)) throw new Error(`missing action id ${n}`);
  }
  const phoneLogin = (password: string) =>
    callAction(
      ids,
      "signInPhoneAction",
      "",
      [{ error: null }, phoneForm(PHONE, password)],
      "/login",
    );
  const err = (r: Awaited<ReturnType<typeof phoneLogin>>) => String(r.result?.error ?? "");

  // --- 4 wrong passwords count down, the 5th locks ---
  for (let i = 1; i <= 4; i++) {
    const r = await phoneLogin("wrong-password");
    check(`wrong password ${i} shows ${5 - i} left`, err(r).includes(`ອີກ ${5 - i} ຄັ້ງ`), err(r));
  }
  const fifth = await phoneLogin("wrong-password");
  check("5th wrong password locks the account", err(fifth).includes("ລັອກ"), err(fifth));
  const { data: lock } = await admin
    .from("login_locks")
    .select("locked_until")
    .eq("account", `phone:${PHONE}`)
    .single();
  const mins = lock ? (Date.parse(lock.locked_until) - Date.now()) / 60_000 : 0;
  check("lock lasts 2 hours", mins > 118 && mins <= 120, `${mins.toFixed(1)} min`);

  const rightWhileLocked = await phoneLogin(pw);
  check(
    "right password is refused while locked",
    rightWhileLocked.redirect === null && err(rightWhileLocked).includes("ລັອກ"),
    `${rightWhileLocked.redirect} ${err(rightWhileLocked)}`,
  );
  check("refused attempts are not recorded", (await failures(`phone:${PHONE}`)) === 5);

  // --- committee sees the lock and unlocks ---
  const list = await page("/committee/students", committee);
  check(
    "students page shows the lock",
    // The badge sits on the members tab; the page data carries the lock for this student.
    /Lock test student[^}]*"lockedUntil":"20\d\d-/.test(list.html.replace(/\\"/g, '"')),
    `${list.status} ${list.location} ${list.html.includes("Lock test student")}`,
  );
  const studentCookie = await signIn(phoneToEmail(PHONE), pw).catch(() => "");
  const forged = await callAction(
    ids,
    "unlockLoginAction",
    studentCookie,
    [studentId],
    "/dashboard",
  );
  check("a student cannot call unlock", forged.result?.ok !== true, JSON.stringify(forged.result));
  const unlock = await callAction(
    ids,
    "unlockLoginAction",
    committee,
    [studentId],
    "/committee/students",
  );
  check(
    "committee unlock succeeds",
    unlock.result?.ok === true,
    `${unlock.status} ${unlock.redirect} ${JSON.stringify(unlock.result)}`,
  );
  const afterUnlock = await phoneLogin(pw);
  check(
    "right password works after unlock",
    afterUnlock.redirect === "/dashboard",
    err(afterUnlock),
  );

  // --- a successful sign-in resets the count ---
  await phoneLogin("wrong-password");
  await phoneLogin(pw);
  const fresh = await phoneLogin("wrong-password");
  check("count restarts after a successful sign-in", err(fresh).includes("ອີກ 4 ຄັ້ງ"), err(fresh));

  // --- parallel guesses cannot exceed 5 ---
  await admin.from("login_failures").delete().eq("account", `phone:${PHONE}`);
  await Promise.all(Array.from({ length: 12 }, () => phoneLogin("wrong-password")));
  const counted = await failures(`phone:${PHONE}`);
  check("12 parallel guesses: at most 5 checked", counted <= 5, `${counted} recorded`);
  const afterBurst = await phoneLogin(pw);
  check("account is locked after the burst", afterBurst.redirect === null, err(afterBurst));

  // --- an expired lock lets the user in ---
  const past = new Date(Date.now() - 1000).toISOString();
  const old = new Date(Date.now() - 3 * 3600_000).toISOString();
  await admin.from("login_locks").update({ locked_until: past }).eq("account", `phone:${PHONE}`);
  await admin.from("login_failures").update({ created_at: old }).eq("account", `phone:${PHONE}`);
  const expired = await phoneLogin(pw);
  check("sign-in works once 2 hours have passed", expired.redirect === "/dashboard", err(expired));

  // --- OTP password reset clears a lock ---
  for (let i = 0; i < 5; i++) await phoneLogin("wrong-password");
  await admin.from("otp_requests").insert({
    phone: PHONE,
    code_hash: hashOtp(PHONE, "424242"),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  const reset = await callAction(ids, "verifyOtpAction", "", [PHONE, "424242", "reset"], "/login");
  check(
    "OTP reset goes to /change-password",
    reset.redirect === "/change-password",
    String(reset.redirect),
  );
  const { data: lockAfterOtp } = await admin
    .from("login_locks")
    .select("account")
    .eq("account", `phone:${PHONE}`)
    .maybeSingle();
  check("OTP reset removes the lock", !lockAfterOtp && (await failures(`phone:${PHONE}`)) === 0);

  // --- code accounts are locked the same way ---
  const codeLogin = (password: string) =>
    callAction(ids, "signInAction", "", [{ error: null }, codeForm(CODE, password)], "/login");
  for (let i = 0; i < 5; i++) await codeLogin("wrong-password");
  const codeLocked = await codeLogin(pw);
  check(
    "code account locked after 5 wrong passwords",
    codeLocked.redirect === null && String(codeLocked.result?.error).includes("ລັອກ"),
    String(codeLocked.result?.error),
  );
  check("phone account is not affected", (await failures(`phone:${PHONE}`)) === 0);
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
console.log(failed ? `\n${failed} check(s) failed` : "\nAll login lock checks passed");
process.exit(failed ? 1 : 0);
