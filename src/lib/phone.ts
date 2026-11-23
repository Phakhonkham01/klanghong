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
