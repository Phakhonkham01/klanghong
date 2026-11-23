import { describe, expect, it } from "vitest";
import { formatKip, parseKip } from "@/lib/money";

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
