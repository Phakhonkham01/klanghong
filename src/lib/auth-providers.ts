import "server-only";

/**
 * Whether Google sign-in is switched on in Supabase (public /auth/v1/settings).
 * Cached for 5 minutes so the login page does not hit Auth on every request.
 */
export async function isGoogleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { external?: { google?: boolean } };
    return json.external?.google === true;
  } catch {
    return false;
  }
}
