import type { ProfileRow } from "@/types/database";

/**
 * Request header carrying the profile that middleware already verified for this request.
 *
 * Middleware does not run on every path (static-looking URLs such as `/x/y.png` skip it), so a
 * client could send this header itself on such a path. The value is therefore HMAC-signed with a
 * server-only secret and expires after a minute; pages accept only a valid signature and otherwise
 * fall back to asking Supabase.
 */
export const PROFILE_HEADER = "x-klanghong-profile";

const MAX_AGE_MS = 60_000;

function secret(): string | null {
  const s = process.env.PROFILE_HEADER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return s && s.length >= 16 ? s : null;
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;
function hmacKey(s: string): Promise<CryptoKey> {
  if (cachedKey?.secret !== s) {
    cachedKey = {
      secret: s,
      key: crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(`klanghong-profile-header:${s}`),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      ),
    };
  }
  return cachedKey.key;
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Signed `<payload>.<signature>`; null when no secret is configured (pages then use Supabase). */
export async function encodeProfileHeader(profile: ProfileRow): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const payload = toB64url(
    new TextEncoder().encode(JSON.stringify({ exp: Date.now() + MAX_AGE_MS, profile })),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(s), new TextEncoder().encode(payload));
  return `${payload}.${toB64url(new Uint8Array(sig))}`;
}

/** The profile if the signature is valid and fresh; otherwise null. */
export async function decodeProfileHeader(value: string | null): Promise<ProfileRow | null> {
  const s = secret();
  if (!value || !s) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(s),
      fromB64url(value.slice(dot + 1)),
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      exp?: number;
      profile?: ProfileRow;
    };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    const p = parsed.profile;
    return p && typeof p.id === "string" ? p : null;
  } catch {
    return null;
  }
}
