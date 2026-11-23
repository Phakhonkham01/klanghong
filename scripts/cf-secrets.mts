/**
 * Runtime environment for the Cloudflare Worker, taken from .env.local. Values are never printed.
 *   pnpm cf:secrets --local   → writes .dev.vars for `pnpm cf:preview` (local only, git-ignored)
 *   pnpm cf:secrets           → uploads them as encrypted Worker secrets (`wrangler secret bulk`)
 *
 * NEXT_PUBLIC_* values are compiled into the build, so they must also be in .env.local (or the
 * build environment) when running `pnpm cf:build` / `pnpm cf:deploy`.
 * ADMIN_* and SUPABASE_DB_URL are local-only and never uploaded.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WENOVA_API_TOKEN",
  "WENOVA_SMS_HEADER",
  "WENOVA_USE_PACKAGE",
  "OTP_SECRET",
  "OTP_GLOBAL_DAILY_LIMIT",
  "APP_TIMEZONE",
];
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function parseEnv(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out.set(m[1]!, m[2]!.trim().replace(/^["']|["']$/g, ""));
  }
  return out;
}

const env = parseEnv(readFileSync(".env.local", "utf8"));
const values = Object.fromEntries(KEYS.filter((k) => env.get(k)).map((k) => [k, env.get(k)!]));
const missing = REQUIRED.filter((k) => !values[k]);
if (missing.length) {
  console.error(`✗ Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}
if (!values.WENOVA_API_TOKEN)
  console.warn("! WENOVA_API_TOKEN is empty: OTP SMS will not be sent.");

if (process.argv.includes("--local")) {
  writeFileSync(
    ".dev.vars",
    Object.entries(values)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(`✓ Wrote .dev.vars (${Object.keys(values).length} vars) for local preview.`);
} else {
  const r = spawnSync("pnpm", ["exec", "wrangler", "secret", "bulk"], {
    input: JSON.stringify(values),
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`✓ Uploaded ${Object.keys(values).length} secrets to the Worker.`);
}
