import { describe, expect, it } from "vitest";
import {
  checkNewPassword,
  stripPasswordChars,
  codeToEmail,
  normalizeStudentCode,
  safeNextPath,
} from "@/lib/validators";

describe("normalizeStudentCode", () => {
  it("uppercases and strips spaces", () => {
    expect(normalizeStudentCode(" it2026 001 ")).toBe("IT2026001");
  });

  it("rejects invalid codes", () => {
    expect(normalizeStudentCode("ab")).toBeNull();
    expect(normalizeStudentCode("IT-001")).toBeNull();
    expect(normalizeStudentCode("A".repeat(21))).toBeNull();
    expect(normalizeStudentCode(undefined)).toBeNull();
  });
});

describe("codeToEmail", () => {
  it("maps a code to a stable internal address", () => {
    expect(codeToEmail("IT2026001")).toBe("it2026001@klanghong.local");
  });
});

describe("checkNewPassword", () => {
  it("enforces length and confirmation", () => {
    expect(checkNewPassword("short", "short")).toBe("too_short");
    expect(checkNewPassword("x".repeat(73), "x".repeat(73))).toBe("too_long");
    expect(checkNewPassword("longenough", "different1")).toBe("mismatch");
    expect(checkNewPassword("longenough", "longenough")).toBeNull();
    expect(checkNewPassword("Abc!123_x~", "Abc!123_x~")).toBeNull();
  });

  it("allows only English letters, digits and symbols", () => {
    expect(checkNewPassword("ລະຫັດຜ່ານ1234", "ລະຫັດຜ່ານ1234")).toBe("invalid_chars");
    expect(checkNewPassword("รหัสผ่าน1234", "รหัสผ่าน1234")).toBe("invalid_chars");
    expect(checkNewPassword("has space 12", "has space 12")).toBe("invalid_chars");
    expect(stripPasswordChars("ab ລາວ12ไทย!")).toBe("ab12!");
  });
});

describe("safeNextPath", () => {
  it("allows only same-site relative paths", () => {
    expect(safeNextPath("/pay?week=2026-11-23")).toBe("/pay?week=2026-11-23");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
