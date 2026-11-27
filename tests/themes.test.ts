import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEMES, THEME_KEYS, isThemeKey, themeByKey, themeVars } from "@/lib/themes";

/** WCAG relative luminance contrast between two #RRGGBB colors. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe("festival themes", () => {
  it("has the 8 themes, unique ids and keys", () => {
    expect(THEMES).toHaveLength(8);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(8);
    expect(THEMES.map((t) => t.key)).toEqual([...THEME_KEYS]);
    expect(THEMES.every((t) => t.isDefault === false)).toBe(true);
  });

  it("matches the keys the database accepts (migration 0010)", () => {
    const sql = readFileSync("supabase/migrations/0010_festival_theme.sql", "utf8");
    for (const k of THEME_KEYS) expect(sql).toContain(`'${k}'`);
  });

  it("uses plain #RRGGBB colors", () => {
    const hex = /^#[0-9A-F]{6}$/i;
    for (const t of THEMES) {
      for (const v of Object.values(themeVars(t))) expect(v, t.key).toMatch(hex);
    }
  });

  it("keeps text readable (WCAG AA)", () => {
    for (const t of THEMES) {
      expect(contrast(t.textColor, t.backgroundColor), `${t.key} text/bg`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(t.textColor, t.surfaceColor), `${t.key} text/card`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(t.mutedTextColor, t.backgroundColor),
        `${t.key} muted/bg`,
      ).toBeGreaterThanOrEqual(3);
      expect(contrast(t.onAccent, t.accentColor), `${t.key} accent`).toBeGreaterThanOrEqual(3);
    }
  });

  it("looks keys up safely", () => {
    expect(isThemeKey("halloween")).toBe(true);
    expect(isThemeKey("nope")).toBe(false);
    expect(isThemeKey(null)).toBe(false);
    expect(themeByKey(null)).toBeNull();
    expect(themeByKey("christmas")?.name).toBe("Christmas");
  });
});
