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

export interface DemoPayment extends PaymentLike {
  id: string;
  source: "transfer" | "cash";
  reviewed_at: string | null;
  reviewer: string | null;
  reference: string | null;
  note: string | null;
}

/** Payments relative to "now": mostly paid, one rejected, then overdue + current open. */
export function demoPayments(now: Date = new Date()): DemoPayment[] {
  const weeks = listWeeks(demoSettings.startDate, now);
  const past = weeks.slice(0, -1);
  return past.flatMap((week_start, i): DemoPayment[] => {
    const base = {
      id: `demo-${week_start}`,
      week_start,
      amount: demoSettings.weeklyAmount,
      created_at: `${week_start}T02:15:00Z`,
      reviewed_at: `${week_start}T11:40:00Z`,
      reviewer: "ນາງ ມະນີວອນ",
      reference: i === 0 ? null : `FT${week_start.replace(/-/g, "")}0${i}`,
      note: null,
      source: i === 0 ? ("cash" as const) : ("transfer" as const),
    };
    if (i < past.length - 2)
      return [{ ...base, status: "approved", note: i === 0 ? "ຮັບເງິນສົດ" : null }];
    if (i === past.length - 2)
      return [{ ...base, status: "rejected", reject_reason: "ສະລິບບໍ່ຊັດເຈນ" }];
    return [];
  });
}
