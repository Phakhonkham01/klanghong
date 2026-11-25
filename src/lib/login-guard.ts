import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Password sign-in limits (see migration 0008). */
export const LOGIN_LIMIT = {
  maxFailures: 5,
  lockMs: 2 * 3600_000,
  /** Wrong passwords from one IP, across all accounts, within lockMs. */
  perIpFailures: 30,
} as const;

/** Account key: phone accounts and committee codes are counted separately. */
export function loginAccount(kind: "phone" | "code", id: string): string {
  return `${kind}:${id}`;
}

export type LoginAttempt =
  | { ok: true; id: number; failures: number }
  | { ok: false; reason: "locked"; until: Date }
  | { ok: false; reason: "ip" };

/**
 * Call before checking the password. The attempt is recorded first and then counted, so parallel
 * guesses cannot slip past the limit; call `loginSucceeded` or `loginFailed` afterwards.
 * If the tables are missing (migration not applied yet) it lets the attempt through.
 */
export async function beginLogin(account: string, ip: string | null): Promise<LoginAttempt> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const since = new Date(now - LOGIN_LIMIT.lockMs).toISOString();

  const [{ data: lock, error: lockErr }, ipCount] = await Promise.all([
    admin.from("login_locks").select("locked_until").eq("account", account).maybeSingle(),
    ip
      ? admin
          .from("login_failures")
          .select("id", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  if (lockErr) {
    console.error("[login] lock check failed:", lockErr.message);
    return { ok: true, id: -1, failures: 0 };
  }
  if (lock && Date.parse(lock.locked_until) > now) {
    return { ok: false, reason: "locked", until: new Date(lock.locked_until) };
  }
  if ((ipCount.count ?? 0) >= LOGIN_LIMIT.perIpFailures) return { ok: false, reason: "ip" };

  const { data: row, error } = await admin
    .from("login_failures")
    .insert({ account, ip })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[login] record failed:", error?.message);
    return { ok: true, id: -1, failures: 0 };
  }
  const { count } = await admin
    .from("login_failures")
    .select("id", { count: "exact", head: true })
    .eq("account", account)
    .gte("created_at", since);
  const failures = count ?? 1;
  if (failures > LOGIN_LIMIT.maxFailures) {
    // Lost a race with parallel guesses: this one is not checked at all.
    await admin.from("login_failures").delete().eq("id", row.id);
    return { ok: false, reason: "locked", until: await lockAccount(account) };
  }
  return { ok: true, id: row.id, failures };
}

/** Right password: forget this account's failures. */
export async function loginSucceeded(account: string): Promise<void> {
  await clearLogin(account);
}

/** Wrong password: lock after the 5th. Returns attempts left, or the lock end. */
export async function loginFailed(
  account: string,
  attempt: Extract<LoginAttempt, { ok: true }>,
): Promise<{ left: number } | { until: Date }> {
  if (attempt.id < 0) return { left: LOGIN_LIMIT.maxFailures };
  if (attempt.failures >= LOGIN_LIMIT.maxFailures) return { until: await lockAccount(account) };
  return { left: LOGIN_LIMIT.maxFailures - attempt.failures };
}

/** The request never reached the password check (e.g. Supabase rate limit): don't count it. */
export async function loginNotChecked(attempt: Extract<LoginAttempt, { ok: true }>) {
  if (attempt.id < 0) return;
  await createSupabaseAdminClient().from("login_failures").delete().eq("id", attempt.id);
}

async function lockAccount(account: string): Promise<Date> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("login_locks")
    .select("locked_until")
    .eq("account", account)
    .maybeSingle();
  if (existing && Date.parse(existing.locked_until) > Date.now()) {
    return new Date(existing.locked_until);
  }
  const until = new Date(Date.now() + LOGIN_LIMIT.lockMs);
  await admin.from("login_locks").upsert({ account, locked_until: until.toISOString() });
  return until;
}

/** Unlock: committee action, OTP password reset, or a successful sign-in. */
export async function clearLogin(...accounts: string[]): Promise<void> {
  if (!accounts.length) return;
  const admin = createSupabaseAdminClient();
  await Promise.all([
    admin.from("login_failures").delete().in("account", accounts),
    admin.from("login_locks").delete().in("account", accounts),
  ]);
}

/** Active locks for the committee's students page (account → locked until). */
export async function activeLocks(accounts: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(accounts)];
  if (!unique.length) return new Map();
  const { data, error } = await createSupabaseAdminClient()
    .from("login_locks")
    .select("account, locked_until")
    .in("account", unique)
    .gt("locked_until", new Date().toISOString());
  if (error) return new Map();
  return new Map((data ?? []).map((r) => [r.account, r.locked_until]));
}
