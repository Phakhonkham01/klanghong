import { describe, expect, it } from "vitest";
import {
  buildStudentWeeks,
  computeStreak,
  defaultPayWeek,
  deriveWeekStatus,
  isInPayOrder,
  openWeeks,
  summarizeOutstanding,
  type PaymentLike,
} from "@/lib/status";

const vte = (local: string) => new Date(`${local}+07:00`);
const NOW = vte("2026-11-25T10:00:00"); // Wednesday; current week = 2026-11-23

let seq = 0;
function pay(week_start: string, status: PaymentLike["status"], extra: Partial<PaymentLike> = {}) {
  seq += 1;
  return {
    week_start,
    status,
    amount: 10_000,
    created_at: `2026-11-01T00:00:${String(seq).padStart(2, "0")}Z`,
    reject_reason: status === "rejected" ? "ຈຳນວນເງິນບໍ່ຖືກ" : null,
    ...extra,
  } satisfies PaymentLike;
}

describe("deriveWeekStatus", () => {
  it("paid when any payment is approved, even after a rejection", () => {
    const r = deriveWeekStatus(
      "2026-11-16",
      [pay("2026-11-16", "rejected"), pay("2026-11-16", "approved")],
      NOW,
    );
    expect(r.status).toBe("paid");
    expect(r.payment?.status).toBe("approved");
  });

  it("pending when a resubmission is waiting", () => {
    const r = deriveWeekStatus(
      "2026-11-16",
      [pay("2026-11-16", "rejected"), pay("2026-11-16", "pending")],
      NOW,
    );
    expect(r.status).toBe("pending");
  });

  it("rejected when the latest payment is rejected, with its reason", () => {
    const r = deriveWeekStatus("2026-11-23", [pay("2026-11-23", "rejected")], NOW);
    expect(r.status).toBe("rejected");
    expect(r.payment?.reject_reason).toBe("ຈຳນວນເງິນບໍ່ຖືກ");
  });

  it("unpaid for the current week with no payments", () => {
    expect(deriveWeekStatus("2026-11-23", [], NOW).status).toBe("unpaid");
  });

  it("overdue for a past week with no payments", () => {
    expect(deriveWeekStatus("2026-11-16", [], NOW).status).toBe("overdue");
  });

  it("current week turns overdue at Monday 00:00 of the next week", () => {
    expect(deriveWeekStatus("2026-11-23", [], vte("2026-11-29T23:59:59")).status).toBe("unpaid");
    expect(deriveWeekStatus("2026-11-23", [], vte("2026-11-30T00:00:00")).status).toBe("overdue");
  });
});

describe("buildStudentWeeks", () => {
  const payments = [
    pay("2026-11-02", "approved"),
    // 2026-11-09: nothing → overdue
    pay("2026-11-16", "rejected"),
    // 2026-11-23 (current): nothing → unpaid
  ];
  const weeks = buildStudentWeeks("2026-11-02", payments, NOW);

  it("covers every week from start to now with derived statuses", () => {
    expect(weeks.map((w) => [w.weekStart, w.status])).toEqual([
      ["2026-11-02", "paid"],
      ["2026-11-09", "overdue"],
      ["2026-11-16", "rejected"],
      ["2026-11-23", "unpaid"],
    ]);
  });

  it("marks only the current week as current", () => {
    expect(weeks.filter((w) => w.isCurrent).map((w) => w.weekStart)).toEqual(["2026-11-23"]);
  });

  it("counts past overdue and past rejected weeks as outstanding, not the current week", () => {
    expect(weeks.filter((w) => w.isOutstanding).map((w) => w.weekStart)).toEqual([
      "2026-11-09",
      "2026-11-16",
    ]);
  });

  it("flags unpaid current week as late only after Friday", () => {
    expect(weeks.at(-1)?.isLate).toBe(false);
    const sat = buildStudentWeeks("2026-11-02", payments, vte("2026-11-28T09:00:00"));
    expect(sat.at(-1)?.isLate).toBe(true);
  });

  it("ignores payments outside the week list", () => {
    const w = buildStudentWeeks("2026-11-23", [pay("2026-11-02", "approved")], NOW);
    expect(w).toHaveLength(1);
    expect(w[0]?.status).toBe("unpaid");
  });

  it("pending and paid weeks are not payable", () => {
    const w = buildStudentWeeks(
      "2026-11-16",
      [pay("2026-11-16", "pending"), pay("2026-11-23", "approved")],
      NOW,
    );
    expect(w.map((e) => e.isPayable)).toEqual([false, false]);
    expect(defaultPayWeek(w)).toBeNull();
  });
});

describe("summarizeOutstanding / defaultPayWeek", () => {
  const weeks = buildStudentWeeks("2026-11-02", [pay("2026-11-02", "approved")], NOW);

  it("sums outstanding weeks at the weekly amount", () => {
    expect(summarizeOutstanding(weeks, 10_000)).toEqual({
      count: 2,
      total: 20_000,
      weeks: ["2026-11-09", "2026-11-16"],
    });
  });

  it("defaults to the oldest payable week", () => {
    expect(defaultPayWeek(weeks)).toBe("2026-11-09");
  });

  it("defaults to the current week when nothing is overdue", () => {
    const w = buildStudentWeeks("2026-11-23", [], NOW);
    expect(defaultPayWeek(w)).toBe("2026-11-23");
    expect(summarizeOutstanding(w, 10_000).count).toBe(0);
  });
});

describe("computeStreak", () => {
  it("counts paid weeks back from the latest, skipping an open current week", () => {
    const w = buildStudentWeeks(
      "2026-11-02",
      [pay("2026-11-02", "approved"), pay("2026-11-09", "approved"), pay("2026-11-16", "approved")],
      NOW,
    );
    expect(computeStreak(w)).toBe(3);
  });

  it("includes the current week once paid and stops at a gap", () => {
    const w = buildStudentWeeks(
      "2026-11-02",
      [pay("2026-11-02", "approved"), pay("2026-11-16", "approved"), pay("2026-11-23", "approved")],
      NOW,
    );
    expect(computeStreak(w)).toBe(2);
  });

  it("is zero when the last past week is not paid", () => {
    expect(computeStreak(buildStudentWeeks("2026-11-16", [], NOW))).toBe(0);
  });
});

describe("openWeeks / isInPayOrder", () => {
  // Start 2026-11-02; week of 11-02 paid, 11-09 pending, 11-16 rejected, 11-23 is this week.
  const payments = [
    pay("2026-11-02", "approved"),
    pay("2026-11-09", "pending"),
    pay("2026-11-16", "rejected"),
    pay("2026-12-07", "pending"), // a week already paid ahead
  ];
  const open = openWeeks("2026-11-02", payments, NOW);

  it("lists owed weeks oldest first, then weeks ahead without a live payment", () => {
    expect(open.map((o) => o.weekStart)).toEqual([
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
      "2026-12-14",
      "2026-12-21",
      "2026-12-28",
      "2027-01-04",
    ]);
    expect(open.filter((o) => o.ahead)).toHaveLength(5);
  });

  it("accepts only the first N open weeks", () => {
    expect(isInPayOrder(["2026-11-16"], open)).toBe(true);
    expect(isInPayOrder(["2026-11-30", "2026-11-16", "2026-11-23"], open)).toBe(true);
    expect(isInPayOrder(["2026-11-23"], open)).toBe(false); // skips the rejected week
    expect(isInPayOrder(["2026-11-16", "2026-11-30"], open)).toBe(false); // skips this week
    expect(isInPayOrder([], open)).toBe(false);
  });
});
