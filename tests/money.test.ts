import { describe, expect, it } from "vitest";
import { formatKip, formatKipCompact, parseKip } from "@/lib/money";

describe("formatKip", () => {
  it("formats with thousands separators and the kip sign", () => {
    expect(formatKip(50000)).toBe("50,000 ₭");
    expect(formatKip(0)).toBe("0 ₭");
    expect(formatKip(1234567n)).toBe("1,234,567 ₭");
  });
});

describe("parseKip", () => {
  it("parses formatted input", () => {
    expect(parseKip("50,000")).toBe(50000);
    expect(parseKip(" 10 000 ₭")).toBe(10000);
  });
  it("rejects non-integers", () => {
    expect(parseKip("10.5")).toBeNull();
    expect(parseKip("abc")).toBeNull();
    expect(parseKip("")).toBeNull();
  });
});

describe("formatKipCompact", () => {
  it("shortens thousands and millions", () => {
    expect(formatKipCompact(950)).toBe("950");
    expect(formatKipCompact(10_000)).toBe("10K");
    expect(formatKipCompact(12_500)).toBe("12.5K");
    expect(formatKipCompact(1_250_000)).toBe("1.25M");
  });
});
