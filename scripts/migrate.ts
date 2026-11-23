/**
 * Apply SQL migrations in supabase/migrations to the database in SUPABASE_DB_URL.
 *   pnpm db:migrate            apply pending migrations
 *   pnpm db:migrate --status   list applied/pending, change nothing
 * Each file runs in its own transaction and is recorded in ops.migrations.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is empty. Fill it in .env.local (session pooler URL).");
  process.exit(1);
}

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();
const statusOnly = process.argv.includes("--status");

const sql = postgres(dbUrl, { ssl: "require", max: 1, onnotice: () => {} });

try {
  await sql`create schema if not exists ops`;
  await sql`create table if not exists ops.migrations (
    name text primary key, sha256 text not null, applied_at timestamptz not null default now())`;
  await sql`revoke all on schema ops from public`;

  const applied = new Map(
    (await sql<{ name: string; sha256: string }[]>`select name, sha256 from ops.migrations`).map(
      (r) => [r.name, r.sha256],
    ),
  );

  for (const file of files) {
    const body = readFileSync(join(dir, file), "utf8");
    const hash = createHash("sha256").update(body).digest("hex");
    const prev = applied.get(file);
    if (prev === hash) {
      console.log(`✓ ${file} (applied)`);
      continue;
    }
    if (statusOnly) {
      console.log(`${prev ? "~" : "·"} ${file} (${prev ? "changed since applied" : "pending"})`);
      continue;
    }
    // Migrations are idempotent, so a changed file is safe to re-run.
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into ops.migrations (name, sha256) values (${file}, ${hash})
               on conflict (name) do update set sha256 = excluded.sha256, applied_at = now()`;
    });
    console.log(`${prev ? "↻" : "+"} ${file} applied`);
  }
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
