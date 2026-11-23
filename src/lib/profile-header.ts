import type { ProfileRow } from "@/types/database";

/**
 * Request header carrying the profile that middleware already verified for this request.
 * Middleware deletes any incoming copy before setting it, so pages can trust it.
 */
export const PROFILE_HEADER = "x-klanghong-profile";

/** Header values must be ASCII; names are Lao, so the JSON is base64url-encoded. */
export function encodeProfileHeader(profile: ProfileRow): string {
  const bytes = new TextEncoder().encode(JSON.stringify(profile));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProfileHeader(value: string | null): ProfileRow | null {
  if (!value) return null;
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as ProfileRow;
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}
