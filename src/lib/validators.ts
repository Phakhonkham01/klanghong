/** Input rules shared by forms, server actions and scripts. */

export const STUDENT_CODE_RE = /^[A-Z0-9]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

/** Uppercase, strip spaces; returns null when it is not a valid student code. */
export function normalizeStudentCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.replace(/\s+/g, "").toUpperCase();
  return STUDENT_CODE_RE.test(code) ? code : null;
}

/**
 * Supabase Auth needs an email; students sign in with their code, so each code
 * maps to a fixed internal address that never receives mail.
 */
export function codeToEmail(code: string): string {
  return `${code.toLowerCase()}@klanghong.local`;
}

export type PasswordProblem = "too_short" | "too_long" | "mismatch" | null;

export function checkNewPassword(password: string, confirm: string): PasswordProblem {
  if (password.length < PASSWORD_MIN) return "too_short";
  if (password.length > PASSWORD_MAX) return "too_long";
  if (password !== confirm) return "mismatch";
  return null;
}

/** Only allow same-site relative paths as post-login redirects. */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\") || next.startsWith("/login")) return null;
  return next;
}
