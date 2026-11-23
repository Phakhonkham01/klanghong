import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("neutralizes formula injection", () => {
    expect(csvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvField("-5")).toBe("'-5");
  });

  it("keeps Lao text and numbers as-is", () => {
    expect(
      toCsv([
        ["ລະຫັດ", "ຊື່"],
        ["IT001", 10000],
      ]),
    ).toBe("ລະຫັດ,ຊື່\r\nIT001,10000");
  });
});
