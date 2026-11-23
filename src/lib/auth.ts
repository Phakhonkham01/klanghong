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

/** For pages and server actions: require a signed-in, active user (optionally a role). */
export async function requireSession(role?: Role): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (role === "committee" && session.profile.role !== "committee") redirect("/dashboard");
  return session;
}

export function homeFor(role: Role): string {
  return role === "committee" ? "/committee" : "/dashboard";
}
