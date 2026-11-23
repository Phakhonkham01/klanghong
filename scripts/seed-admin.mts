/**
 * Create (or repair) the first committee account from ADMIN_CODE / ADMIN_PASSWORD / ADMIN_NAME.
 * Safe to re-run: an existing account keeps its id; its password, name and role are reset.
 * Never prints the password.
 *   pnpm seed:admin
 */
import { createClient } from "@supabase/supabase-js";
import {
  codeToEmail,
  normalizeStudentCode,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "../src/lib/validators";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const code = normalizeStudentCode(process.env.ADMIN_CODE);
const password = process.env.ADMIN_PASSWORD ?? "";
const name = (process.env.ADMIN_NAME ?? "").trim();

const problems = [
  !url && "NEXT_PUBLIC_SUPABASE_URL is empty",
  !serviceKey && "SUPABASE_SERVICE_ROLE_KEY is empty",
  !code && "ADMIN_CODE must be 3–20 letters or digits",
  (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) &&
    `ADMIN_PASSWORD must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
  (!name || [...name].length > 80) && "ADMIN_NAME must be 1–80 characters",
].filter(Boolean);
if (problems.length) {
  console.error(`✗ ${problems.join("\n✗ ")}`);
  process.exit(1);
}

const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
const email = codeToEmail(code!);

const { data: existing, error: findErr } = await admin
  .from("profiles")
  .select("id")
  .eq("student_code", code!)
  .maybeSingle();
if (findErr) {
  console.error("✗ Could not read profiles:", findErr.message);
  process.exit(1);
}

let userId = existing?.id as string | undefined;

if (userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email,
    email_confirm: true,
  });
  if (error) {
    console.error("✗ Could not update the auth user:", error.message);
    process.exit(1);
  }
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("✗ Could not create the auth user:", error?.message);
    process.exit(1);
  }
  userId = data.user.id;
}

const { error: upsertErr } = await admin.from("profiles").upsert({
  id: userId,
  student_code: code!,
  full_name: name,
  role: "committee",
  is_active: true,
  must_change_password: false,
});
if (upsertErr) {
  console.error("✗ Could not save the profile:", upsertErr.message);
  process.exit(1);
}

console.log(`✓ Committee account ${code} is ready (${existing ? "updated" : "created"}).`);
