import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { OTP } from "./otp-policy";

export { OTP };

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP.length)).padStart(OTP.length, "0");
}

function secret(): string {
  const s = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("OTP_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set");
  return s;
}

/** Keyed hash so a leaked otp_requests table does not reveal codes. */
export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
}

export function otpMatches(phone: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(phone, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Start of the current calendar month in Asia/Vientiane (UTC+7, no DST), as an instant. */
export function vientianeMonthStart(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 7 * 3600_000);
}

/** Start of the next month in Vientiane (when the monthly quota resets). */
export function vientianeNextMonthStart(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 7 * 3600_000);
}

/** The month window starts at the later of the month start and a committee reset. */
export function quotaWindowStart(now: Date, resetAt: Date | null): Date {
  const month = vientianeMonthStart(now);
  return resetAt && resetAt > month ? resetAt : month;
}

export function otpMessage(code: string): string {
  return `KlangHong OTP: ${code} (${OTP.ttlMinutes} min). Do not share.`;
}
