/**
 * Week engine. Every "today / this week" decision in the app goes through here.
 *
 * - A week is identified by its Monday date (`week_start`, ISO `YYYY-MM-DD`).
 * - All calendar logic uses Asia/Vientiane, never the server's local timezone
 *   (Vercel runs in UTC).
 * - There is no weekly reset job: statuses are derived from dates + payments.
 *
 * Internally, ISO dates are handled as UTC-midnight `Date`s purely for day
 * arithmetic; they never represent an instant in time.
 */

export const APP_TIMEZONE = "Asia/Vientiane";

/** Calendar date string `YYYY-MM-DD`. */
export type IsoDate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const tzDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** True if `value` is a real calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return toIso(d) === value;
}

function fromIso(iso: IsoDate): Date {
  if (!isIsoDate(iso)) throw new RangeError(`Invalid ISO date: ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function toIso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

/** Calendar date in Asia/Vientiane for the given instant. */
export function todayInTz(now: Date = new Date()): IsoDate {
  const parts = tzDateFormatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIso(new Date(fromIso(iso).getTime() + days * DAY_MS));
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / DAY_MS);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: IsoDate): number {
  const day = fromIso(iso).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isMonday(iso: IsoDate): boolean {
  return isIsoDate(iso) && isoWeekday(iso) === 1;
}

/** Monday of the week containing `iso`. */
export function weekStartOf(iso: IsoDate): IsoDate {
  return addDays(iso, 1 - isoWeekday(iso));
}

/** Monday of the current week in Asia/Vientiane. */
export function currentWeekStart(now: Date = new Date()): IsoDate {
  return weekStartOf(todayInTz(now));
}

export interface WeekRange {
  /** Monday */
  start: IsoDate;
  /** Friday: last day of the payment window */
  deadline: IsoDate;
  /** Sunday */
  end: IsoDate;
}

export function weekRange(weekStart: IsoDate): WeekRange {
  const start = weekStartOf(weekStart);
  return { start, deadline: addDays(start, 4), end: addDays(start, 6) };
}

/**
 * All week starts from `startDate` (normalized to its Monday) up to and
 * including the current week, oldest first. Empty if `startDate` is in the future.
 */
export function listWeeks(startDate: IsoDate, now: Date = new Date()): IsoDate[] {
  const first = weekStartOf(startDate);
  const current = currentWeekStart(now);
  const weeks: IsoDate[] = [];
  for (let w = first; w <= current; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

export function isCurrentWeek(weekStart: IsoDate, now: Date = new Date()): boolean {
  return weekStart === currentWeekStart(now);
}

export function isPastWeek(weekStart: IsoDate, now: Date = new Date()): boolean {
  return weekStart < currentWeekStart(now);
}

export function isFutureWeek(weekStart: IsoDate, now: Date = new Date()): boolean {
  return weekStart > currentWeekStart(now);
}

/** One slip covers at most this many weeks. */
export const MAX_WEEKS_PER_SLIP = 7;
/** Weeks that may be paid ahead of the current one (DB trigger allows the same). */
export const PREPAY_WEEKS_AHEAD = MAX_WEEKS_PER_SLIP - 1;

/** The next `n` Mondays after the current week. */
export function upcomingWeeks(n: number = PREPAY_WEEKS_AHEAD, now: Date = new Date()): IsoDate[] {
  const current = currentWeekStart(now);
  return Array.from({ length: n }, (_, i) => addDays(current, 7 * (i + 1)));
}

export type PayableCheck =
  | { ok: true }
  | { ok: false; reason: "invalid_date" | "not_monday" | "before_start" | "future_week" };

/** Server-side guard for which `week_start` a student may submit a payment for. */
export function checkPayableWeek(
  weekStart: string,
  startDate: IsoDate,
  now: Date = new Date(),
): PayableCheck {
  if (!isIsoDate(weekStart)) return { ok: false, reason: "invalid_date" };
  if (!isMonday(weekStart)) return { ok: false, reason: "not_monday" };
  if (weekStart < weekStartOf(startDate)) return { ok: false, reason: "before_start" };
  if (weekStart > addDays(currentWeekStart(now), 7 * PREPAY_WEEKS_AHEAD)) {
    return { ok: false, reason: "future_week" };
  }
  return { ok: true };
}

/** True once the Friday payment window of `weekStart` has closed (Vientiane time). */
export function isPastDeadline(weekStart: IsoDate, now: Date = new Date()): boolean {
  return todayInTz(now) > weekRange(weekStart).deadline;
}

/**
 * Days left until Friday of the current week: 4 on Monday, 0 on Friday,
 * negative on Saturday/Sunday (window closed).
 */
export function daysUntilDeadline(now: Date = new Date()): number {
  const today = todayInTz(now);
  return diffDays(today, weekRange(weekStartOf(today)).deadline);
}
