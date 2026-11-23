/**
 * Interactive: paste the new Supabase project's URL and keys; writes them into .env.local.
 * Input is hidden, values are never printed. Checks that all three belong to the same project
 * and that the KlangHong tables exist there.
 *   pnpm setup:env
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const FILE = ".env.local";

// One readline for all prompts (several interfaces would steal each other's buffered input).
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
});
let masking = false;
const out = rl as unknown as { _writeToOutput: (s: string) => void };
const write = out._writeToOutput?.bind(rl);
out._writeToOutput = (s: string) => {
  if (!masking || s.includes("\n") || s.includes("\r"))
    return write ? write(s) : process.stdout.write(s);
  process.stdout.write("•");
};

// The async iterator buffers lines, so pasted or piped input is never lost between prompts.
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, hidden: boolean): Promise<string> {
  process.stdout.write(question);
  masking = hidden;
  const { value } = await lines.next();
  masking = false;
  if (hidden && process.stdin.isTTY) process.stdout.write("\n");
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function jwt(token: string): { role?: string; ref?: string } {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
  } catch {
    return {};
  }
}

function setVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(src) ? src.replace(re, line) : `${src.replace(/\n?$/, "\n")}${line}\n`;
}

console.log("Supabase → Project Settings → API (ຂອງໂປຣເຈັກໃໝ່ klanghong)\n");

const url = (await ask("1) Project URL (https://….supabase.co): ", false)).replace(/\/$/, "");
const anon = await ask("2) anon public key (eyJ…): ", true);
const service = await ask("3) service_role key (eyJ…): ", true);
rl.close();

const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1];
const a = jwt(anon);
const s = jwt(service);
const problems = [
  !ref && "Project URL ບໍ່ຖືກຮູບແບບ",
  a.role !== "anon" && "key ທີ 2 ບໍ່ແມ່ນ anon key",
  s.role !== "service_role" && "key ທີ 3 ບໍ່ແມ່ນ service_role key",
  ref && a.ref && a.ref !== ref && "anon key ບໍ່ແມ່ນຂອງໂປຣເຈັກນີ້",
  ref && s.ref && s.ref !== ref && "service_role key ບໍ່ແມ່ນຂອງໂປຣເຈັກນີ້",
].filter(Boolean);

if (problems.length) {
  console.error(`\n✗ ${problems.join("\n✗ ")}\nບໍ່ໄດ້ບັນທຶກຫຍັງ. ລອງໃໝ່: pnpm setup:env`);
  process.exit(1);
}

const client = createClient(url, service, { auth: { persistSession: false } });
const probe = await client.from("settings").select("weekly_amount").limit(1);
if (probe.error) {
  console.error(
    `\n✗ ບໍ່ພົບຕາຕະລາງ settings ໃນໂປຣເຈັກນີ້ (${probe.error.code}).` +
      "\n  ແລ່ນ SQL ໃນ SQL Editor ຂອງໂປຣເຈັກນີ້ກ່ອນ ແລ້ວລອງໃໝ່. ບໍ່ໄດ້ບັນທຶກຫຍັງ.",
  );
  process.exit(1);
}

if (existsSync(FILE)) copyFileSync(FILE, `${FILE}.bak`);
let env = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
env = setVar(env, "NEXT_PUBLIC_SUPABASE_URL", url);
env = setVar(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
env = setVar(env, "SUPABASE_SERVICE_ROLE_KEY", service);
writeFileSync(FILE, env, { mode: 0o600 });

console.log(
  `\n✓ ບັນທຶກໃສ່ ${FILE} ແລ້ວ (ໂປຣເຈັກ ${ref!.slice(0, 4)}…, ພົບຕາຕະລາງແລ້ວ). ໄຟລ໌ເກົ່າຢູ່ ${FILE}.bak`,
);
