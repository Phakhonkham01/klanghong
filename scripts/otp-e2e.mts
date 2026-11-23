/**
 * Phone + OTP flow against the running dev server and real Supabase, WITHOUT sending SMS:
 * codes are planted directly (hashed like the server does), and every requestOtp call made
 * here is one the server must refuse before sending (invalid, over limit, cooldown, rejected).
 * Uses fake numbers 2099990xxx and cleans up everything it creates.
 *   pnpm dev  (another terminal)  →  pnpm test:otp
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
const A = `20999${String(parseInt(tag, 16) % 100000).padStart(5, "0")}`;
const B = `20998${String(parseInt(tag, 16) % 100000).padStart(5, "0")}`;
const PHONES = [A, B];
const users: string[] = [];

async function plant(
  phone: string,
  code: string,
  opts: { expired?: boolean; ageSec?: number } = {},
) {
  const created = new Date(Date.now() - (opts.ageSec ?? 0) * 1000);
  const expires = new Date(opts.expired ? Date.now() - 1000 : Date.now() + 5 * 60_000);
  const { error } = await admin.from("otp_requests").insert({
    phone,
    code_hash: hashOtp(phone, code),
    created_at: created.toISOString(),
    expires_at: expires.toISOString(),
  });
  if (error) throw new Error(`plant: ${error.message}`);
}

async function monthCount(phone: string): Promise<number> {
  const { count } = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone);
  return count ?? 0;
}

async function cleanup() {
  await admin.from("otp_requests").delete().in("phone", PHONES);
  await admin.from("otp_quota_resets").delete().in("phone", PHONES);
  const { data: profs } = await admin.from("profiles").select("id").in("phone", PHONES);
  for (const p of profs ?? []) users.push(p.id);
  for (const id of new Set(users)) await admin.auth.admin.deleteUser(id);
  // Auth users for the test phones that never got a profile.
  const all = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of all.data.users) {
    if (PHONES.some((ph) => u.email === phoneToEmail(ph))) await admin.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  await cleanup();
  await page("/login"); // compile login + its actions
  const ids = findActionIds();
  for (const n of ["requestOtpAction", "verifyOtpAction"]) {
    if (!ids.has(n)) throw new Error(`missing action id ${n} (open /login once in the dev server)`);
  }

  // Committee account (code + password) for approvals.
  const code = `ZZO${tag.toUpperCase()}`;
  const password = randomBytes(18).toString("base64url");
  const { data: cu } = await admin.auth.admin.createUser({
    email: codeToEmail(code),
    password,
    email_confirm: true,
  });
  users.push(cu.user!.id);
  await admin.from("profiles").insert({
    id: cu.user!.id,
    student_code: code,
    full_name: "OTP test committee",
    role: "committee",
    must_change_password: false,
  });
  const committee = await signIn(codeToEmail(code), password);
  await page("/committee/students", committee); // compile committee actions
  const ids2 = findActionIds();
  for (const [k, v] of ids2) ids.set(k, v);

  // --- input validation (never sends) ---
  const bad = await callAction(ids, "requestOtpAction", "", ["021 555"], "/login");
  check("invalid phone refused", bad.result?.ok === false, JSON.stringify(bad.result));

  // --- verify: wrong, right, reuse ---
  await plant(A, "111111");
  const wrong = await callAction(ids, "verifyOtpAction", "", [`0${A}`, "222222"], "/login");
  check(
    "wrong code refused with tries left",
    wrong.result?.ok === false && /4/.test(String(wrong.result?.error)),
    JSON.stringify(wrong.result),
  );
  const right = await callAction(ids, "verifyOtpAction", "", [`+856 ${A}`, "111111"], "/login");
  check(
    "right code signs in and goes to /welcome",
    right.redirect === "/welcome" && right.cookie.includes("auth-token"),
    `${right.status} ${right.redirect}`,
  );
  const { data: pa } = await admin
    .from("profiles")
    .select("id, approval, must_set_name, role, full_name")
    .eq("phone", A)
    .single();
  if (pa) users.push(pa.id);
  check(
    "new number registered as pending student without name",
    pa?.approval === "pending" && pa?.must_set_name === true && pa?.role === "student",
  );
  const reuse = await callAction(ids, "verifyOtpAction", "", [A, "111111"], "/login");
  check("code is single-use", reuse.result?.ok === false, JSON.stringify(reuse.result));

  const sA = right.cookie;
  const toWelcome = await page("/dashboard", sA);
  check(
    "unnamed account is sent to /welcome",
    toWelcome.location === "/welcome",
    `${toWelcome.status} ${toWelcome.location}`,
  );
  const welcome = await page("/welcome", sA);
  check("/welcome renders", welcome.status === 200);
  for (const [k, v] of findActionIds()) ids.set(k, v);

  // --- name + password ---
  const PW1 = `Pw-${tag}-first1`;
  const PW2 = `Pw-${tag}-second2`;
  const shortName = new FormData();
  shortName.append("name", "x");
  shortName.append("password", PW1);
  shortName.append("confirm", PW1);
  const n1 = await callAction(
    ids,
    "setupAccountAction",
    sA,
    [{ error: null }, shortName],
    "/welcome",
  );
  check(
    "too-short name refused",
    typeof n1.result?.error === "string" && !!n1.result?.error,
    JSON.stringify(n1.result),
  );
  const mismatch = new FormData();
  mismatch.append("name", "ສົມພອນ ທົດສອບ");
  mismatch.append("password", PW1);
  mismatch.append("confirm", PW2);
  const n0 = await callAction(
    ids,
    "setupAccountAction",
    sA,
    [{ error: null }, mismatch],
    "/welcome",
  );
  check(
    "mismatched passwords refused",
    typeof n0.result?.error === "string" && !!n0.result?.error,
    JSON.stringify(n0.result),
  );
  const okName = new FormData();
  okName.append("name", "  ສົມພອນ   ທົດສອບ ");
  okName.append("password", PW1);
  okName.append("confirm", PW1);
  const n2 = await callAction(ids, "setupAccountAction", sA, [{ error: null }, okName], "/welcome");
  const { data: pa2 } = await admin
    .from("profiles")
    .select("full_name, must_set_name, must_change_password")
    .eq("id", pa!.id)
    .single();
  check(
    "name + password saved, sent to /pending",
    n2.redirect === "/pending" &&
      pa2?.full_name === "ສົມພອນ ທົດສອບ" &&
      pa2?.must_set_name === false &&
      pa2?.must_change_password === false,
    `${n2.redirect} ${JSON.stringify(pa2)}`,
  );

  // --- phone + password sign-in (no OTP) ---
  for (const [k, v] of findActionIds()) ids.set(k, v);
  const loginForm = (phone: string, password: string) => {
    const f = new FormData();
    f.append("phone", phone);
    f.append("password", password);
    return f;
  };
  const badPw = await callAction(
    ids,
    "signInPhoneAction",
    "",
    [{ error: null }, loginForm(`0${A}`, "wrong-password")],
    "/login",
  );
  check(
    "wrong password refused",
    typeof badPw.result?.error === "string" && !!badPw.result?.error,
    JSON.stringify(badPw.result),
  );
  const pwLogin = await callAction(
    ids,
    "signInPhoneAction",
    "",
    [{ error: null }, loginForm(`0${A.slice(0, 2)} ${A.slice(2, 6)} ${A.slice(6)}`, PW1)],
    "/login",
  );
  check(
    "phone + password signs in (pending → /pending)",
    pwLogin.redirect === "/pending" && pwLogin.cookie.includes("auth-token"),
    `${pwLogin.status} ${pwLogin.redirect}`,
  );

  // Registered numbers are told to use the password instead of spending an OTP.
  const again = await callAction(ids, "requestOtpAction", "", [A, "signup"], "/login");
  check(
    "sign-up OTP refused for a number that has a password",
    again.result?.ok === false && /ລະຫັດຜ່ານ/.test(String(again.result?.error)),
    JSON.stringify(again.result),
  );
  const C = `20997${A.slice(5)}`;
  PHONES.push(C);
  const resetUnknown = await callAction(ids, "requestOtpAction", "", [C, "reset"], "/login");
  check(
    "reset OTP refused for an unregistered number",
    resetUnknown.result?.ok === false && /ສະໝັກ/.test(String(resetUnknown.result?.error)),
    JSON.stringify(resetUnknown.result),
  );

  const pend = await page("/dashboard", sA);
  check(
    "pending account cannot open dashboard",
    pend.location === "/pending",
    `${pend.status} ${pend.location}`,
  );
  const pendPay = await page("/pay", sA);
  check("pending account cannot open pay page", pendPay.location === "/pending");

  // --- monthly limit (precondition: exactly 3 this month, so the server refuses before any SMS) ---
  await plant(A, "333333", { ageSec: 120 });
  await plant(A, "444444", { ageSec: 90 });
  const used = await monthCount(A);
  if (used !== 3) {
    fail();
    console.log(
      `✗ precondition: expected 3 OTPs for ${A}, found ${used} — skipping limit tests to avoid sending SMS`,
    );
  } else {
    const limited = await callAction(ids, "requestOtpAction", "", [A, "reset"], "/login");
    check(
      "4th OTP in a month refused",
      limited.result?.ok === false && /3/.test(String(limited.result?.error)),
      JSON.stringify(limited.result),
    );

    // Committee approves and resets the quota; the next request is then stopped only by the 60 s cooldown.
    const appr = await callAction(
      ids,
      "decideRegistrationAction",
      committee,
      [pa!.id, "approved"],
      "/committee/students",
    );
    check("committee approves registration", appr.result?.ok === true, JSON.stringify(appr.result));
    const reset = await callAction(
      ids,
      "resetOtpQuotaAction",
      committee,
      [pa!.id],
      "/committee/students",
    );
    check("committee resets OTP quota", reset.result?.ok === true, JSON.stringify(reset.result));
    await plant(A, "555555", { ageSec: 5 }); // most recent request → cooldown applies
    const cool = await callAction(ids, "requestOtpAction", "", [A, "reset"], "/login");
    check(
      "after reset: limit lifted, 60 s cooldown still applies",
      cool.result?.ok === false && /ວິນາທີ/.test(String(cool.result?.error)),
      JSON.stringify(cool.result),
    );
  }

  const dash = await page("/dashboard", sA);
  check("approved account opens dashboard", dash.status === 200, `${dash.status} ${dash.location}`);

  const pwApproved = await callAction(
    ids,
    "signInPhoneAction",
    "",
    [{ error: null }, loginForm(A, PW1)],
    "/login",
  );
  check(
    "approved student signs in with password → /dashboard",
    pwApproved.redirect === "/dashboard",
    `${pwApproved.redirect}`,
  );

  // --- forgot password: OTP (reset) → /change-password → new password works, old one doesn't ---
  await admin
    .from("otp_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", A)
    .is("consumed_at", null);
  await plant(A, "121212");
  const rv = await callAction(ids, "verifyOtpAction", "", [A, "121212", "reset"], "/login");
  check(
    "reset OTP signs in and goes to /change-password",
    rv.redirect === "/change-password",
    `${rv.status} ${rv.redirect}`,
  );
  const forced = await page("/dashboard", rv.cookie);
  check("must set the new password before anything else", forced.location === "/change-password");
  await page("/change-password", rv.cookie);
  for (const [k, v] of findActionIds()) ids.set(k, v);
  const cp = new FormData();
  cp.append("password", PW2);
  cp.append("confirm", PW2);
  const changed = await callAction(
    ids,
    "changePasswordAction",
    rv.cookie,
    [{ error: null }, cp],
    "/change-password",
  );
  check(
    "new password saved → /dashboard",
    changed.redirect === "/dashboard",
    `${changed.redirect} ${JSON.stringify(changed.result)}`,
  );
  const oldPw = await callAction(
    ids,
    "signInPhoneAction",
    "",
    [{ error: null }, loginForm(A, PW1)],
    "/login",
  );
  check("old password no longer works", !!oldPw.result?.error && !oldPw.redirect);
  const newPw = await callAction(
    ids,
    "signInPhoneAction",
    "",
    [{ error: null }, loginForm(A, PW2)],
    "/login",
  );
  check("new password works", newPw.redirect === "/dashboard");

  // --- expiry and brute force ---
  await plant(A, "666666", { expired: true });
  await admin
    .from("otp_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", A)
    .is("consumed_at", null)
    .neq("code_hash", hashOtp(A, "666666"));
  const exp = await callAction(ids, "verifyOtpAction", "", [A, "666666"], "/login");
  check("expired code refused", exp.result?.ok === false, JSON.stringify(exp.result));
  await plant(A, "777777");
  let last: Record<string, unknown> | null = null;
  for (let i = 0; i < 5; i++)
    last = (await callAction(ids, "verifyOtpAction", "", [A, "000000"], "/login")).result;
  const afterBrute = await callAction(ids, "verifyOtpAction", "", [A, "777777"], "/login");
  check(
    "after 5 wrong tries even the right code is refused",
    afterBrute.result?.ok === false && last?.ok === false,
    JSON.stringify(afterBrute.result),
  );

  // --- rejected registration never gets an SMS ---
  await plant(B, "888888", { ageSec: 300 });
  const vb = await callAction(ids, "verifyOtpAction", "", [B, "888888"], "/login");
  const { data: pb } = await admin.from("profiles").select("id").eq("phone", B).single();
  if (pb) users.push(pb.id);
  check("second number registers", vb.redirect === "/welcome" && !!pb);
  const rej = await callAction(
    ids,
    "decideRegistrationAction",
    committee,
    [pb!.id, "rejected"],
    "/committee/students",
  );
  check(
    "committee rejects registration",
    rej.result?.ok === true,
    `${rej.status} ${JSON.stringify(rej.result)} ${rej.redirect}`,
  );
  const rb = await callAction(ids, "requestOtpAction", "", [B], "/login");
  check(
    "rejected number gets no OTP",
    rb.result?.ok === false && /ປະຕິເສດ/.test(String(rb.result?.error)),
    JSON.stringify(rb.result),
  );
  const rbPage = await page("/dashboard", vb.cookie);
  check(
    "rejected account is held on /pending (or /welcome)",
    rbPage.location === "/pending" || rbPage.location === "/welcome",
  );

  // --- any registered number is refused at sign-up; committee-added students use "forgot password" ---
  const D = `20996${A.slice(5)}`;
  PHONES.push(D);
  const added = await callAction(
    ids,
    "createStudentAction",
    committee,
    [`0${D}`, "ນັກສຶກສາ ເພີ່ມໂດຍຄະນະ"],
    "/committee/students",
  );
  check(
    "committee adds a student by phone",
    added.result?.ok === true,
    JSON.stringify(added.result),
  );
  const dupSignup = await callAction(ids, "requestOtpAction", "", [D, "signup"], "/login");
  check(
    "sign-up with a number already in the system is refused",
    dupSignup.result?.ok === false && /ມີໃນລະບົບແລ້ວ/.test(String(dupSignup.result?.error)),
    JSON.stringify(dupSignup.result),
  );
  await plant(D, "343434");
  const dupVerify = await callAction(ids, "verifyOtpAction", "", [D, "343434", "signup"], "/login");
  check(
    "sign-up verify is refused for a registered number too",
    dupVerify.result?.ok === false && !dupVerify.redirect,
  );
  await admin.from("otp_requests").update({ consumed_at: new Date().toISOString() }).eq("phone", D);
  await plant(D, "565656");
  const firstPw = await callAction(ids, "verifyOtpAction", "", [D, "565656", "reset"], "/login");
  check(
    "committee-added student sets a password via forgot-password",
    firstPw.redirect === "/change-password",
    `${firstPw.redirect}`,
  );

  // --- students page shows OTP usage ---
  const sp = await page("/committee/students", committee);
  check(
    "students page renders with phone accounts",
    sp.status === 200 && sp.html.includes("ສົມພອນ ທົດສອບ"),
  );
}

try {
  await main();
} catch (e) {
  fail();
  console.error("✗ aborted:", e instanceof Error ? e.message : e);
} finally {
  await cleanup();
  const f = failureCount();
  console.log(f ? `\n${f} check(s) failed` : "\nAll OTP checks passed");
  process.exit(f ? 1 : 0);
}
