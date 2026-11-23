import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_HEADER, decodeProfileHeader } from "@/lib/profile-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow, Role } from "@/types/database";

export type Session = { userId: string; profile: ProfileRow };

/**
 * Current signed-in user and profile, or null.
 * Fast path: the profile middleware verified for this request (no extra round trips).
 * Fallback (e.g. a route the middleware matcher skips): ask Supabase directly.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const fromMiddleware = decodeProfileHeader((await headers()).get(PROFILE_HEADER));
  if (fromMiddleware) {
    return fromMiddleware.is_active ? { userId: fromMiddleware.id, profile: fromMiddleware } : null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !profile.is_active) return null;
  return { userId: user.id, profile };
});

/**
 * For pages and server actions: require a signed-in, active, approved user (optionally a role).
 * `allowOnboarding` is for the name-setup and waiting-for-approval screens only.
 */
export async function requireSession(
  role?: Role,
  opts: { allowOnboarding?: boolean } = {},
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!opts.allowOnboarding) {
    if (session.profile.must_set_name) redirect("/welcome");
    if (session.profile.approval !== "approved") redirect("/pending");
  }
  if (role === "committee" && session.profile.role !== "committee") redirect("/dashboard");
  return session;
}

/** Display identifier: student code if set, else the phone number. */
export function profileLabel(p: Pick<ProfileRow, "student_code" | "phone">): string {
  if (p.student_code) return p.student_code;
  const d = p.phone ?? "";
  return d.length === 10 ? `0${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : d;
}

export function homeFor(role: Role): string {
  return role === "committee" ? "/committee" : "/dashboard";
}
