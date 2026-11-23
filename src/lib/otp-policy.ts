/** Shared by server and client (no Node imports here). */
/** OTP policy (kept in one place so the UI and tests agree). */
export const OTP = {
  length: 6,
  ttlMinutes: 5,
  maxAttempts: 5,
  monthlyLimit: 3,
  resendSeconds: 60,
  /** Abuse guards: anyone can register, so cap SMS by IP and overall. */
  perIpPerHour: 5,
  globalPerDay: Number(process.env.OTP_GLOBAL_DAILY_LIMIT ?? 100),
} as const;
