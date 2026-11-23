import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow, Role } from "@/types/database";

export type Session = { userId: string; profile: ProfileRow };

/** Current signed-in user and profile (verified with the Auth server), or null. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !profile.is_active) return null;
  return { userId: user.id, profile };
}

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
