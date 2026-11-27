/**
 * Festival themes for the student pages. Pure data (no business logic): the committee picks one
 * on /committee/theme; the student layout turns it into CSS variables, decorations and a greeting.
 * `null` (no active theme) means the default look defined in globals.css, which is never changed.
 */

export type DecorationKind =
  "fireworks" | "hearts" | "champa" | "candle" | "boat" | "pumpkin" | "stupa" | "xmas";

export interface FestivalTheme {
  id: number;
  key: ThemeKey;
  name: string;
  /** Lao name shown to the committee. */
  nameLo: string;
  description: string;
  /** Short line shown in the student banner. */
  greeting: string;
  /** true: dark page (light text); false: light page. */
  dark: boolean;
  primaryColor: string;
  primaryShade: string;
  /** Text on primary buttons and paid nodes. */
  onPrimary: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  accentColor: string;
  onAccent: string;
  banner: { from: string; to: string; shade: string };
  decorations: { kind: DecorationKind; /** more and larger shapes */ dense: boolean };
  isDefault: false;
}

export const THEME_KEYS = [
  "new-year",
  "valentines-day",
  "pi-mai-lao",
  "khao-phansa",
  "ok-phansa",
  "halloween",
  "that-luang",
  "christmas",
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export const THEMES: readonly FestivalTheme[] = [
  {
    id: 1,
    key: "new-year",
    name: "New Year",
    nameLo: "ປີໃໝ່ສາກົນ",
    description: "ດຳ ແລະ ທອງ ຫຼູຫຼາ, ມີດອກໄມ້ໄຟ",
    greeting: "ສະບາຍດີປີໃໝ່",
    dark: true,
    primaryColor: "#D4AF37",
    primaryShade: "#8F7319",
    onPrimary: "#1A1408",
    secondaryColor: "#F5D77A",
    backgroundColor: "#0E0E10",
    surfaceColor: "#1C1B20",
    textColor: "#F7F0D8",
    mutedTextColor: "#BDB39A",
    borderColor: "#3A3322",
    accentColor: "#2A2516",
    onAccent: "#F5D77A",
    banner: { from: "#3A3016", to: "#0A0A0A", shade: "#000000" },
    decorations: { kind: "fireworks", dense: true },
    isDefault: false,
  },
  {
    id: 2,
    key: "valentines-day",
    name: "Valentine's Day",
    nameLo: "ວັນແຫ່ງຄວາມຮັກ",
    description: "ບົວ ແລະ ແດງ ອ່ອນຫວານ, ມີຫົວໃຈ",
    greeting: "ສຸກສັນວັນແຫ່ງຄວາມຮັກ",
    dark: false,
    primaryColor: "#E0245E",
    primaryShade: "#A3173F",
    onPrimary: "#FFFFFF",
    secondaryColor: "#FF6B9A",
    backgroundColor: "#FFF5F8",
    surfaceColor: "#FFFFFF",
    textColor: "#3A1020",
    mutedTextColor: "#7A4A5A",
    borderColor: "#F6CFDD",
    accentColor: "#FBE3EB",
    onAccent: "#A3173F",
    banner: { from: "#FF7AA5", to: "#E0245E", shade: "#A3173F" },
    decorations: { kind: "hearts", dense: false },
    isDefault: false,
  },
  {
    id: 3,
    key: "pi-mai-lao",
    name: "Pi Mai Lao",
    nameLo: "ບຸນປີໃໝ່ລາວ",
    description: "ຟ້າ ແລະ ຂາວ ສົດຊື່ນ, ມີດອກຈຳປາ ແລະ ຢອດນ້ຳ",
    greeting: "ສະບາຍດີປີໃໝ່ລາວ",
    dark: true,
    primaryColor: "#FFC83D",
    primaryShade: "#C99400",
    onPrimary: "#3A2A00",
    secondaryColor: "#FFFFFF",
    backgroundColor: "#0B5E94",
    surfaceColor: "#136FA8",
    textColor: "#FFFFFF",
    mutedTextColor: "#D6EEFB",
    borderColor: "#2F86BE",
    accentColor: "#1B78B0",
    onAccent: "#FFFFFF",
    banner: { from: "#0E6FA8", to: "#08507A", shade: "#063D5E" },
    decorations: { kind: "champa", dense: true },
    isDefault: false,
  },
  {
    id: 4,
    key: "khao-phansa",
    name: "Khao Phansa",
    nameLo: "ເຂົ້າພັນສາ",
    description: "ທອງ ແລະ ເຫຼືອງ ອົບອຸ່ນ, ມີທຽນ",
    greeting: "ບຸນເຂົ້າພັນສາ",
    dark: true,
    primaryColor: "#F2C230",
    primaryShade: "#A87E05",
    onPrimary: "#2B1F00",
    secondaryColor: "#FFE08A",
    backgroundColor: "#33240A",
    surfaceColor: "#4A3712",
    textColor: "#FFF4D0",
    mutedTextColor: "#E0C880",
    borderColor: "#6B5420",
    accentColor: "#5C4716",
    onAccent: "#FFE08A",
    banner: { from: "#C99700", to: "#7A5800", shade: "#523B00" },
    decorations: { kind: "candle", dense: true },
    isDefault: false,
  },
  {
    id: 5,
    key: "ok-phansa",
    name: "Ok Phansa",
    nameLo: "ອອກພັນສາ",
    description: "ສົ້ມ ແລະ ທອງ ຍາມກາງຄືນ, ມີເຮືອໄຟ",
    greeting: "ບຸນອອກພັນສາ · ໄຫຼເຮືອໄຟ",
    dark: true,
    primaryColor: "#FF8A1F",
    primaryShade: "#B8560A",
    onPrimary: "#FFFFFF",
    secondaryColor: "#FFC94D",
    backgroundColor: "#1B1030",
    surfaceColor: "#2A1C45",
    textColor: "#FFF0DC",
    mutedTextColor: "#D8B994",
    borderColor: "#46336A",
    accentColor: "#3A2A5A",
    onAccent: "#FFC94D",
    banner: { from: "#FF8A1F", to: "#A8420A", shade: "#6E2A05" },
    decorations: { kind: "boat", dense: true },
    isDefault: false,
  },
  {
    id: 6,
    key: "halloween",
    name: "Halloween",
    nameLo: "ຮາໂລວີນ",
    description: "ພື້ນມືດ ແລະ ສີສົ້ມ, ມີໝາກອຶ",
    greeting: "Happy Halloween",
    dark: true,
    primaryColor: "#FF7A1A",
    primaryShade: "#B04E08",
    onPrimary: "#1A0F05",
    secondaryColor: "#A67BE0",
    backgroundColor: "#121014",
    surfaceColor: "#1F1B24",
    textColor: "#FFF1E3",
    mutedTextColor: "#C2AD98",
    borderColor: "#3A3242",
    accentColor: "#2C2236",
    onAccent: "#C9A6F2",
    banner: { from: "#FF7A1A", to: "#7A2E05", shade: "#3E1702" },
    decorations: { kind: "pumpkin", dense: true },
    isDefault: false,
  },
  {
    id: 7,
    key: "that-luang",
    name: "That Luang Festival",
    nameLo: "ບຸນທາດຫຼວງ",
    description: "ທອງ ແລະ ເຫຼືອງ ແບບລາວ ເທິງພື້ນແດງ, ມີພະທາດ",
    greeting: "ບຸນທາດຫຼວງ",
    dark: true,
    primaryColor: "#F2C230",
    primaryShade: "#A87E05",
    onPrimary: "#3A1A00",
    secondaryColor: "#FFD45E",
    backgroundColor: "#7A1416",
    surfaceColor: "#8E2226",
    textColor: "#FFF3D6",
    mutedTextColor: "#F0CF8A",
    borderColor: "#A8452A",
    accentColor: "#9E2C2C",
    onAccent: "#FFD45E",
    banner: { from: "#C99A1E", to: "#8A6A0C", shade: "#5E4806" },
    decorations: { kind: "stupa", dense: true },
    isDefault: false,
  },
  {
    id: 8,
    key: "christmas",
    name: "Christmas",
    nameLo: "ຄຣິສມາດ",
    description: "ແດງ ແລະ ຂຽວ ເທິງພື້ນສະຫວ່າງ, ມີຕົ້ນຄຣິສມາດ ແລະ ຫິມະ",
    greeting: "Merry Christmas · ສຸກສັນວັນຄຣິສມາດ",
    dark: false,
    primaryColor: "#1F8A4C",
    primaryShade: "#145F33",
    onPrimary: "#FFFFFF",
    secondaryColor: "#C62828",
    backgroundColor: "#F7FBF7",
    surfaceColor: "#FFFFFF",
    textColor: "#10271A",
    mutedTextColor: "#45604F",
    borderColor: "#CDE5D6",
    accentColor: "#E1EFE6",
    onAccent: "#145F33",
    banner: { from: "#D63A3A", to: "#9E1B1B", shade: "#6E1212" },
    decorations: { kind: "xmas", dense: false },
    isDefault: false,
  },
];

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === "string" && (THEME_KEYS as readonly string[]).includes(v);
}

export function themeByKey(key: string | null | undefined): FestivalTheme | null {
  return THEMES.find((t) => t.key === key) ?? null;
}

/**
 * CSS variables that re-skin the app's design tokens (globals.css) for one theme. Applied on the
 * student layout's wrapper, so only student pages change. Tokens that other tokens derive from
 * (--primary, --grass, --ring) are set too, because those were resolved at :root.
 */
export function themeVars(t: FestivalTheme): Record<string, string> {
  return {
    "--background": t.backgroundColor,
    "--foreground": t.textColor,
    "--card": t.surfaceColor,
    "--card-foreground": t.textColor,
    "--popover": t.surfaceColor,
    "--popover-foreground": t.textColor,
    "--tile": t.surfaceColor,
    "--tile-shade": t.borderColor,
    "--muted": t.accentColor,
    "--muted-foreground": t.mutedTextColor,
    "--secondary": t.accentColor,
    "--secondary-foreground": t.textColor,
    "--border": t.borderColor,
    "--input": t.borderColor,
    "--brand": t.primaryColor,
    "--brand-shade": t.primaryShade,
    "--primary": t.primaryColor,
    "--primary-foreground": t.onPrimary,
    "--grass": t.primaryColor,
    "--grass-shade": t.primaryShade,
    "--ring": t.primaryColor,
    "--accent": t.accentColor,
    "--accent-foreground": t.onAccent,
    "--sky": t.banner.from,
    "--sky-shade": t.banner.shade,
    "--gold": t.secondaryColor,
  };
}
