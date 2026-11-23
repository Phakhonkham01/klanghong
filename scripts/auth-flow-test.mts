/**
 * Route-guard checks against the running dev server (http://localhost:3000) with real sessions.
 * Creates throwaway users (…@klanghong.local, codes starting with ZZT), signs them in to get
 * session cookies, requests pages with redirect: "manual", then deletes the users.
 *   pnpm dev  (in another terminal)  →  pnpm test:auth
 */
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { codeToEmail } from "../src/lib/validators";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const tag = randomBytes(3).toString("hex").toUpperCase();
const created: string[] = [];
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function makeUser(suffix: string, role: "student" | "committee", mustChange: boolean) {
  const code = `ZZT${tag}${suffix}`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email: codeToEmail(code),
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  created.push(data.user.id);
  const { error: pe } = await admin.from("profiles").insert({
    id: data.user.id,
    student_code: code,
    full_name: `Auth test ${suffix}`,
    role,
    must_change_password: mustChange,
  });
  if (pe) throw new Error(`profile: ${pe.message}`);

  // Sign in through @supabase/ssr so we get exactly the cookies the app expects.
  const jar = new Map<string, string>();
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) =>
        list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error: se } = await ssr.auth.signInWithPassword({ email: codeToEmail(code), password });
  if (se) throw new Error(`signIn: ${se.message}`);
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return { id: data.user.id, cookie };
}

async function get(path: string, cookie?: string) {
  const res = await fetch(BASE + path, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  const loc = res.headers.get("location");
  return {
    status: res.status,
    location: loc ? new URL(loc, BASE).pathname + new URL(loc, BASE).search : null,
  };
}

function expectRedirect(name: string, r: { status: number; location: string | null }, to: string) {
  check(
    name,
    r.status >= 300 && r.status < 400 && r.location === to,
    `got ${r.status} ${r.location}`,
  );
}
function expectOk(name: string, r: { status: number; location: string | null }) {
  check(name, r.status === 200, `got ${r.status} ${r.location}`);
}

async function main() {
  const ping = await fetch(BASE + "/login").catch(() => null);
  if (!ping) throw new Error(`dev server not reachable at ${BASE}`);

  expectRedirect("signed out: /pay → login with next", await get("/pay"), "/login?next=%2Fpay");
  expectRedirect("signed out: / → login", await get("/"), "/login");
  expectOk("signed out: /login renders", await get("/login"));

  const s = await makeUser("S", "student", true);
  expectRedirect(
    "must change password: /dashboard → /change-password",
    await get("/dashboard", s.cookie),
    "/change-password",
  );
  expectOk(
    "must change password: /change-password renders",
    await get("/change-password", s.cookie),
  );

  await admin.from("profiles").update({ must_change_password: false }).eq("id", s.id);
  expectOk("student: /dashboard renders", await get("/dashboard", s.cookie));
  expectOk("student: /profile renders", await get("/profile", s.cookie));
  expectRedirect(
    "student: /committee → /dashboard",
    await get("/committee", s.cookie),
    "/dashboard",
  );
  expectRedirect(
    "student: /committee/review → /dashboard",
    await get("/committee/review", s.cookie),
    "/dashboard",
  );
  expectRedirect("student: /login → /dashboard", await get("/login", s.cookie), "/dashboard");
  expectRedirect("student: / → /dashboard", await get("/", s.cookie), "/dashboard");

  const c = await makeUser("C", "committee", false);
  expectOk("committee: /committee renders", await get("/committee", c.cookie));
  expectOk("committee: /dashboard renders", await get("/dashboard", c.cookie));
  expectRedirect("committee: / → /committee", await get("/", c.cookie), "/committee");

  await admin.from("profiles").update({ is_active: false }).eq("id", s.id);
  expectRedirect(
    "deactivated student: /dashboard → /login",
    await get("/dashboard", s.cookie),
    "/login",
  );
}

try {
  await main();
} catch (e) {
  failures++;
  console.error("✗ aborted:", e instanceof Error ? e.message : e);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll auth flow checks passed");
  process.exit(failures ? 1 : 0);
}
