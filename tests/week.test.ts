import { describe, expect, it } from "vitest";
import {
  addDays,
  checkPayableWeek,
  currentWeekStart,
  daysUntilDeadline,
  isIsoDate,
  isMonday,
  isPastDeadline,
  listWeeks,
  todayInTz,
  weekRange,
  weekStartOf,
} from "@/lib/week";
import { formatDateTimeLo, formatMonthLo, formatWeekRange } from "@/lib/format";

/** Instant for a Vientiane wall-clock time (UTC+7, no DST). */
const vte = (local: string) => new Date(`${local}+07:00`);

describe("timezone handling (tests run with TZ=UTC)", () => {
  it("process timezone is UTC, like Vercel", () => {
    expect(new Date("2026-01-01T00:00:00Z").getTimezoneOffset()).toBe(0);
  });

  it("Sunday 18:30 UTC is already Monday 01:30 in Vientiane → new week", () => {
    const now = new Date("2026-11-29T18:30:00Z");
    expect(todayInTz(now)).toBe("2026-11-30");
    expect(currentWeekStart(now)).toBe("2026-11-30");
  });

  it("Sunday 16:59 UTC is still Sunday 23:59 in Vientiane → same week", () => {
    const now = new Date("2026-11-29T16:59:59Z");
    expect(todayInTz(now)).toBe("2026-11-29");
    expect(currentWeekStart(now)).toBe("2026-11-23");
  });
});

describe("week boundaries", () => {
  it("Monday 00:00 starts a new week", () => {
    expect(currentWeekStart(vte("2026-11-30T00:00:00"))).toBe("2026-11-30");
  });

  it("Sunday 23:59:59 still belongs to the previous week", () => {
    expect(currentWeekStart(vte("2026-11-29T23:59:59"))).toBe("2026-11-23");
  });

  it("weekStartOf normalizes any day to its Monday", () => {
    expect(weekStartOf("2026-11-23")).toBe("2026-11-23");
    expect(weekStartOf("2026-11-26")).toBe("2026-11-23");
    expect(weekStartOf("2026-11-29")).toBe("2026-11-23");
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28"); // across year end
  });

  it("weekRange gives Monday, Friday deadline and Sunday", () => {
    expect(weekRange("2026-11-23")).toEqual({
      start: "2026-11-23",
      deadline: "2026-11-27",
      end: "2026-11-29",
    });
  });
});

describe("listWeeks", () => {
  it("lists from start_date to the current week inclusive", () => {
    expect(listWeeks("2026-11-02", vte("2026-11-25T10:00:00"))).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ]);
  });

  it("normalizes a start_date that is not a Monday", () => {
    expect(listWeeks("2026-11-05", vte("2026-11-17T10:00:00"))).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
    ]);
  });

  it("returns only the current week when start_date is this week", () => {
    expect(listWeeks("2026-11-24", vte("2026-11-24T08:00:00"))).toEqual(["2026-11-23"]);
  });

  it("is empty when start_date is in the future", () => {
    expect(listWeeks("2026-12-07", vte("2026-11-24T08:00:00"))).toEqual([]);
  });

  it("gains a week exactly at Monday 00:00 Vientiane", () => {
    expect(listWeeks("2026-11-23", vte("2026-11-29T23:59:59"))).toHaveLength(1);
    expect(listWeeks("2026-11-23", vte("2026-11-30T00:00:00"))).toHaveLength(2);
  });
});

describe("checkPayableWeek", () => {
  const now = vte("2026-11-25T10:00:00");
  const start = "2026-11-02";

  it("accepts current and past weeks", () => {
    expect(checkPayableWeek("2026-11-23", start, now)).toEqual({ ok: true });
    expect(checkPayableWeek("2026-11-02", start, now)).toEqual({ ok: true });
  });

  it("rejects future weeks", () => {
    expect(checkPayableWeek("2026-11-30", start, now)).toEqual({
      ok: false,
      reason: "future_week",
    });
  });

  it("rejects non-Monday, invalid and pre-start dates", () => {
    expect(checkPayableWeek("2026-11-24", start, now)).toMatchObject({ reason: "not_monday" });
    expect(checkPayableWeek("2026-02-30", start, now)).toMatchObject({ reason: "invalid_date" });
    expect(checkPayableWeek("nope", start, now)).toMatchObject({ reason: "invalid_date" });
    expect(checkPayableWeek("2026-10-26", start, now)).toMatchObject({ reason: "before_start" });
  });

  it("accepts the Monday of a non-Monday start_date", () => {
    expect(checkPayableWeek("2026-11-02", "2026-11-05", now)).toEqual({ ok: true });
  });
});

describe("deadline helpers", () => {
  it("Friday 23:59:59 is still inside the window; Saturday 00:00 is past it", () => {
    expect(isPastDeadline("2026-11-23", vte("2026-11-27T23:59:59"))).toBe(false);
    expect(isPastDeadline("2026-11-23", vte("2026-11-28T00:00:00"))).toBe(true);
  });

  it("daysUntilDeadline counts down to Friday", () => {
    expect(daysUntilDeadline(vte("2026-11-23T09:00:00"))).toBe(4);
    expect(daysUntilDeadline(vte("2026-11-27T09:00:00"))).toBe(0);
    expect(daysUntilDeadline(vte("2026-11-28T09:00:00"))).toBe(-1);
    expect(daysUntilDeadline(vte("2026-11-29T23:00:00"))).toBe(-2);
  });
});

describe("date utilities", () => {
  it("isIsoDate validates real calendar dates", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
  });

  it("isMonday and addDays", () => {
    expect(isMonday("2026-11-23")).toBe(true);
    expect(isMonday("2026-11-24")).toBe(false);
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("formatWeekRange", () => {
  it("formats a week inside one month", () => {
    expect(formatWeekRange("2026-11-23")).toBe("ຈັນ 23 – ສຸກ 27 ພະຈິກ");
  });

  it("formats a week across months", () => {
    expect(formatWeekRange("2026-11-30")).toBe("ຈັນ 30 ພະຈິກ – ສຸກ 4 ທັນວາ");
  });
});

describe("formatDateTimeLo / formatMonthLo", () => {
  it("shows instants in Vientiane time, crossing midnight from UTC", () => {
    expect(formatDateTimeLo("2026-11-23T02:15:00Z")).toBe("23 ພະຈິກ 2026 · 09:15");
    expect(formatDateTimeLo("2026-11-29T18:30:00Z")).toBe("30 ພະຈິກ 2026 · 01:30");
  });

  it("formats a month label", () => {
    expect(formatMonthLo("2026-12-07")).toBe("ທັນວາ 2026");
  });
});
