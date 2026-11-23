import { NextResponse, type NextRequest } from "next/server";
import { homeFor } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validators";

/**
 * OAuth (Google) return URL for both sign-in and "link Google" from the profile page.
 * Only Google accounts already linked to a student profile may sign in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const linking = searchParams.get("link") === "1";
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));
  const fail = (reason: string) =>
    go(linking ? `/profile?google=${reason}` : `/login?error=${reason}`);

  const oauthError = `${searchParams.get("error_code") ?? ""} ${searchParams.get("error_description") ?? ""}`;
  if (searchParams.get("error")) {
    if (/already|identity_already_exists/i.test(oauthError)) return fail("google_in_use");
    if (/manual linking|provider is not enabled|disabled/i.test(oauthError)) {
      return fail("google_disabled");
    }
    return fail("google_failed");
  }

  const code = searchParams.get("code");
  if (!code) return fail("google_failed");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("google_failed");
  const user = data.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    // A Google account nobody linked: Supabase just created an empty auth user for it.
    // Remove it (only Google identities, no profile) so strangers leave nothing behind.
    const identities = user.identities ?? [];
    if (identities.length > 0 && identities.every((i) => i.provider === "google")) {
      await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
    }
    return fail("google_not_linked");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return fail("inactive");
  }

  if (linking) return go("/profile?google=linked");
  if (profile.must_change_password) return go("/change-password");

  const next = safeNextPath(searchParams.get("next"));
  const allowed = next && !(next.startsWith("/committee") && profile.role !== "committee");
  return go(allowed ? next : homeFor(profile.role));
}
