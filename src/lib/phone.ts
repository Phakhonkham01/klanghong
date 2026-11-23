/** Lao mobile numbers. Stored and sent to the SMS API as 10 digits: 20XXXXXXXX. */

export const PHONE_RE = /^20\d{8}$/;

/** Accepts "020 5555 1234", "+856 20 5555 1234", "8562055551234", "2055551234". */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("856")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return PHONE_RE.test(digits) ? digits : null;
}

/** "2055551234" → "020 5555 1234" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone || !PHONE_RE.test(phone)) return phone ?? "";
  return `0${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`;
}

/** Internal Supabase Auth email for a phone account (never receives mail). */
export function phoneToEmail(phone: string): string {
  return `p${phone}@phone.klanghong.local`;
}

/**
 * The 8 digits after the fixed "020" prefix, from whatever was typed or pasted.
 * A pasted full number ("020 5555 1234", "+856 20 5555 1234", "2055551234") is reduced
 * to its last part; typed digits are kept as-is (local numbers can themselves start with 2).
 */
export function localPhoneDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length > 8) {
    if (d.startsWith("856")) d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.startsWith("20") && d.length > 8) d = d.slice(2);
  }
  return d.slice(0, 8);
}

/** "55551234" → "5555 1234" for display while typing. */
export function formatLocalDigits(d: string): string {
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}
