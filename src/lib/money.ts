const kipFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Formats an integer Kip amount as `50,000 ₭`. Accepts number or bigint (DB bigint). */
export function formatKip(amount: number | bigint): string {
  const value = typeof amount === "bigint" ? amount : Math.round(amount);
  return `${kipFormatter.format(value)} ₭`;
}

/** Parses user input like "50,000" or "50 000 ₭" into an integer; returns null if invalid. */
export function parseKip(input: string): number | null {
  const digits = input.replace(/[\s,₭]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/** Compact Kip for tight spaces: `950`, `12.5K`, `1.25M` (no currency sign). */
export function formatKipCompact(amount: number): string {
  const abs = Math.abs(amount);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (abs >= 1_000_000) return `${trim(amount / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(amount / 1_000)}K`;
  return String(Math.round(amount));
}

/** Full Kip amount with the Lao word after it: `10,000 ກີບ`. */
export function formatKipLao(amount: number | bigint): string {
  const value = typeof amount === "bigint" ? amount : Math.round(amount);
  return `${kipFormatter.format(value)} ກີບ`;
}
