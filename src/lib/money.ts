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
