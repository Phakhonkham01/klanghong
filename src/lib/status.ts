import {
  currentWeekStart,
  isPastDeadline,
  listWeeks,
  upcomingWeeks,
  weekStartOf,
  type IsoDate,
} from "@/lib/week";

export type PaymentStatus = "pending" | "approved" | "rejected";
export type WeekStatus = "paid" | "pending" | "rejected" | "unpaid" | "overdue";

/** Minimal payment shape needed for status derivation (matches DB columns). */
export interface PaymentLike {
  week_start: IsoDate;
  status: PaymentStatus;
  amount: number;
  created_at: string;
  reject_reason?: string | null;
  /** How it was paid (transfer slip or cash to the committee), when known. */
  source?: "transfer" | "cash";
}

export interface WeekEntry<P extends PaymentLike = PaymentLike> {
  weekStart: IsoDate;
  status: WeekStatus;
  isCurrent: boolean;
  /** Friday window closed and the week is still not paid/pending. */
  isLate: boolean;
  /** Still owes money for this week (overdue, or a past week whose latest slip was rejected). */
  isOutstanding: boolean;
  /** Can be selected on the pay page. */
  isPayable: boolean;
  /** The payment that decided the status (approved > pending > latest rejected). */
  payment: P | null;
}

function latest<P extends PaymentLike>(list: P[]): P | null {
  let best: P | null = null;
  for (const p of list) if (!best || p.created_at > best.created_at) best = p;
  return best;
}

/**
 * Status of a single week from the payments for that week.
 * - paid: any approved payment
 * - pending: any pending payment
 * - rejected: latest payment rejected (student must resubmit)
 * - overdue: past week, nothing approved/pending
 * - unpaid: current week, nothing yet
 */
export function deriveWeekStatus<P extends PaymentLike>(
  weekStart: IsoDate,
  paymentsForWeek: P[],
  now: Date = new Date(),
): { status: WeekStatus; payment: P | null } {
  const approved = paymentsForWeek.filter((p) => p.status === "approved");
  if (approved.length) return { status: "paid", payment: latest(approved) };

  const pending = paymentsForWeek.filter((p) => p.status === "pending");
  if (pending.length) return { status: "pending", payment: latest(pending) };

  const last = latest(paymentsForWeek);
  if (last?.status === "rejected") return { status: "rejected", payment: last };

  const status = weekStart < currentWeekStart(now) ? "overdue" : "unpaid";
  return { status, payment: null };
}

/** One entry per week from `startDate` to the current week, oldest first. */
export function buildStudentWeeks<P extends PaymentLike>(
  startDate: IsoDate,
  payments: P[],
  now: Date = new Date(),
): WeekEntry<P>[] {
  const current = currentWeekStart(now);
  const byWeek = new Map<IsoDate, P[]>();
  for (const p of payments) {
    const list = byWeek.get(p.week_start);
    if (list) list.push(p);
    else byWeek.set(p.week_start, [p]);
  }

  return listWeeks(startDate, now).map((weekStart) => {
    const { status, payment } = deriveWeekStatus(weekStart, byWeek.get(weekStart) ?? [], now);
    const isCurrent = weekStart === current;
    const isPayable = status === "unpaid" || status === "overdue" || status === "rejected";
    return {
      weekStart,
      status,
      isCurrent,
      isLate: isPayable && isPastDeadline(weekStart, now),
      isOutstanding: isPayable && !isCurrent,
      isPayable,
      payment,
    };
  });
}

export interface OutstandingSummary {
  count: number;
  total: number;
  weeks: IsoDate[];
}

/** Past weeks still owed, priced at the current weekly amount. */
export function summarizeOutstanding(
  entries: WeekEntry[],
  weeklyAmount: number,
): OutstandingSummary {
  const weeks = entries.filter((e) => e.isOutstanding).map((e) => e.weekStart);
  return { count: weeks.length, total: weeks.length * weeklyAmount, weeks };
}

/** Default week on the pay page: oldest payable week (overdue/rejected first), else null. */
export type OpenWeek = {
  weekStart: IsoDate;
  status: WeekStatus;
  isCurrent: boolean;
  /** An upcoming week paid in advance. */
  ahead?: boolean;
};

/**
 * Weeks a student can still pay, in the order they must be paid: owed weeks oldest first
 * (overdue, rejected, this week), then upcoming weeks with no live payment yet. A payment must
 * cover the first N of these, so nobody skips a week.
 */
export function openWeeks<P extends PaymentLike>(
  startDate: IsoDate,
  payments: P[],
  now: Date = new Date(),
): OpenWeek[] {
  const owed: OpenWeek[] = buildStudentWeeks(startDate, payments, now)
    .filter((e) => e.isPayable)
    .map((e) => ({ weekStart: e.weekStart, status: e.status, isCurrent: e.isCurrent }));
  const taken = new Set(payments.filter((p) => p.status !== "rejected").map((p) => p.week_start));
  const ahead: OpenWeek[] = upcomingWeeks(undefined, now)
    .filter((w) => w >= weekStartOf(startDate) && !taken.has(w))
    .map((w) => ({ weekStart: w, status: "unpaid", isCurrent: false, ahead: true }));
  return [...owed, ...ahead];
}

/** True when `weeks` (any order) are exactly the first weeks of `open`. */
export function isInPayOrder(weeks: IsoDate[], open: OpenWeek[]): boolean {
  const sorted = [...new Set(weeks)].sort();
  return sorted.length > 0 && sorted.every((w, i) => open[i]?.weekStart === w);
}

export function defaultPayWeek(entries: WeekEntry[]): IsoDate | null {
  return entries.find((e) => e.isPayable)?.weekStart ?? null;
}

/**
 * Consecutive paid weeks counting back from the latest week. The current week
 * only extends the streak once it is paid; while it is still open it neither
 * adds to nor breaks the streak.
 */
export function computeStreak(entries: WeekEntry[]): number {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (e.status === "paid") streak++;
    else if (e.isCurrent) continue;
    else break;
  }
  return streak;
}
