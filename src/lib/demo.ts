/**
 * Demo data used by the UI until Supabase is connected (Phase 2/3).
 * Everything here is replaced by real queries later; keep it out of business logic.
 */
import type { PaymentLike } from "@/lib/status";
import { listWeeks } from "@/lib/week";

export const demoSettings = {
  weeklyAmount: 10_000,
  startDate: "2026-10-05",
  bankName: "BCEL One",
  accountName: "ຄັງຫ້ອງ IT ປີ 3",
  accountNo: "0101 2000 1234 5678",
  qrUrl: null as string | null,
};

export const demoStudent = { name: "ສົມພອນ", code: "IT2026001" };

export const demoFundTotal = 1_250_000;

/** Payments relative to "now": mostly paid, one rejected, then overdue + current open. */
export function demoPayments(now: Date = new Date()): PaymentLike[] {
  const weeks = listWeeks(demoSettings.startDate, now);
  const past = weeks.slice(0, -1);
  return past.flatMap((week_start, i): PaymentLike[] => {
    const created_at = `${week_start}T09:00:00Z`;
    const base = { week_start, amount: demoSettings.weeklyAmount, created_at };
    if (i < past.length - 2) return [{ ...base, status: "approved" }];
    if (i === past.length - 2)
      return [{ ...base, status: "rejected", reject_reason: "ສະລິບບໍ່ຊັດເຈນ" }];
    return [];
  });
}
