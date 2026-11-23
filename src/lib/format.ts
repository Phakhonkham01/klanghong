import { lo } from "@/lib/i18n/lo";
import { isoWeekday, weekRange, type IsoDate } from "@/lib/week";

function parts(iso: IsoDate) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

/** `24 ພະຈິກ 2026` */
export function formatDateLo(iso: IsoDate, withYear = true): string {
  const { year, month, day } = parts(iso);
  const base = `${day} ${lo.date.months[month - 1]}`;
  return withYear ? `${base} ${year}` : base;
}

/** Short weekday name, e.g. `ຈັນ`. */
export function weekdayLo(iso: IsoDate): string {
  return lo.date.weekdaysShort[isoWeekday(iso) - 1]!;
}

/**
 * Payment window of a week (Mon–Fri):
 * `ຈັນ 24 – ສຸກ 28 ພະຈິກ`, or `ຈັນ 29 ທັນວາ – ສຸກ 2 ມັງກອນ` across months.
 */
export function formatWeekRange(weekStart: IsoDate): string {
  const { start, deadline } = weekRange(weekStart);
  const s = parts(start);
  const e = parts(deadline);
  const left = `${weekdayLo(start)} ${s.month === e.month ? s.day : formatDateLo(start, false)}`;
  return `${left} – ${weekdayLo(deadline)} ${formatDateLo(deadline, false)}`;
}
