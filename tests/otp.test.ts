import { beforeAll, describe, expect, it } from "vitest";
import {
  OTP,
  generateOtp,
  hashOtp,
  otpMatches,
  quotaWindowStart,
  vientianeMonthStart,
  vientianeNextMonthStart,
} from "@/lib/otp";
import {
  formatLocalDigits,
  formatPhone,
  localPhoneDigits,
  normalizePhone,
  phoneToEmail,
} from "@/lib/phone";

beforeAll(() => {
  process.env.OTP_SECRET = "test-secret";
});

describe("normalizePhone", () => {
  it("accepts common Lao formats", () => {
    expect(normalizePhone("020 5555 1234")).toBe("2055551234");
    expect(normalizePhone("+856 20 5555 1234")).toBe("2055551234");
    expect(normalizePhone("8562055551234")).toBe("2055551234");
    expect(normalizePhone("2055551234")).toBe("2055551234");
    expect(normalizePhone("020-5555-1234")).toBe("2055551234");
  });

  it("rejects non-mobile or wrong-length numbers", () => {
    expect(normalizePhone("021 555 123")).toBeNull();
    expect(normalizePhone("20555512")).toBeNull();
    expect(normalizePhone("205555123456")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("formats for display and maps to an internal email", () => {
    expect(formatPhone("2055551234")).toBe("020 5555 1234");
    expect(phoneToEmail("2055551234")).toBe("p2055551234@phone.klanghong.local");
  });
});

describe("otp codes", () => {
  it("generates fixed-length numeric codes", () => {
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("matches only the right phone + code", () => {
    const h = hashOtp("2055551234", "123456");
    expect(otpMatches("2055551234", "123456", h)).toBe(true);
    expect(otpMatches("2055551234", "123457", h)).toBe(false);
    expect(otpMatches("2055559999", "123456", h)).toBe(false);
    expect(otpMatches("2055551234", "123456", "abc")).toBe(false);
  });
});

describe("monthly quota window (Asia/Vientiane)", () => {
  it("month starts at 00:00 Vientiane on the 1st", () => {
    // 1 Dec 2026 00:30 Vientiane = 30 Nov 17:30 UTC → already December.
    expect(vientianeMonthStart(new Date("2026-11-30T17:30:00Z")).toISOString()).toBe(
      "2026-11-30T17:00:00.000Z",
    );
    // 30 Nov 23:59 Vientiane → still November.
    expect(vientianeMonthStart(new Date("2026-11-30T16:59:00Z")).toISOString()).toBe(
      "2026-10-31T17:00:00.000Z",
    );
    expect(vientianeNextMonthStart(new Date("2026-12-15T00:00:00Z")).toISOString()).toBe(
      "2026-12-31T17:00:00.000Z",
    );
  });

  it("a committee reset later in the month restarts the count", () => {
    const now = new Date("2026-11-20T05:00:00Z");
    const reset = new Date("2026-11-18T03:00:00Z");
    expect(quotaWindowStart(now, reset)).toEqual(reset);
    expect(quotaWindowStart(now, new Date("2026-10-05T00:00:00Z"))).toEqual(
      vientianeMonthStart(now),
    );
    expect(OTP.monthlyLimit).toBe(3);
  });
});

describe("localPhoneDigits (020 prefix input)", () => {
  it("keeps typed digits, including a leading 2", () => {
    expect(localPhoneDigits("5555")).toBe("5555");
    expect(localPhoneDigits("2345 6789")).toBe("23456789");
  });

  it("reduces pasted full numbers to the 8 local digits", () => {
    expect(localPhoneDigits("020 5555 1234")).toBe("55551234");
    expect(localPhoneDigits("+856 20 5555 1234")).toBe("55551234");
    expect(localPhoneDigits("2055551234")).toBe("55551234");
    expect(localPhoneDigits("02022223333")).toBe("22223333");
  });

  it("round-trips with normalizePhone and formats for display", () => {
    expect(normalizePhone(`020${localPhoneDigits("5555 1234")}`)).toBe("2055551234");
    expect(formatLocalDigits("55551234")).toBe("5555 1234");
    expect(formatLocalDigits("555")).toBe("555");
  });
});
