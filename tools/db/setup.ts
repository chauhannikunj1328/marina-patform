// Sets up a database: applies the migrations in supabase/migrations that haven't run yet, then
// (with --seed) loads the sample data. Uses psql, with the connection string in DATABASE_URL
// (Supabase: Project Settings → Database → Connection string → URI, with your database password).
//   DATABASE_URL="postgresql://…" npm run db:setup              migrations only
//   DATABASE_URL="postgresql://…" npm run db:setup -- --seed    and the sample data
// Safe to run again: migrations that already ran are skipped, and sample rows that exist are kept.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUILT_IN_USERS, createSeed } from "../../packages/shared/src/index";
import { seedSql } from "./sql";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the database's connection string (Supabase: Project Settings → Database).");
  process.exit(1);
}
const MIGRATIONS = join(import.meta.dirname, "../../supabase/migrations");
const psql = (args: string[]) => execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

psql(["-c", "set client_min_messages = warning; create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now()); revoke all on public.schema_migrations from anon, authenticated;"]);
const done = new Set(psql(["-At", "-c", "select name from public.schema_migrations"]).split("\n").filter(Boolean));
for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  // The migration and its record in one transaction, so a failure leaves nothing half-done.
  psql(["-1", "-f", join(MIGRATIONS, file), "-c", `insert into public.schema_migrations (name) values ('${file}')`]);
  console.log(`Applied ${file}`);
}

if (process.argv.includes("--seed")) {
  const db = createSeed();
  db.users = [...db.users, ...BUILT_IN_USERS().filter((b) => !db.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase()))];
  const { sql, rows } = seedSql(db);
  const dir = mkdtempSync(join(tmpdir(), "marina-seed-"));
  try {
    writeFileSync(join(dir, "seed.sql"), sql);
    psql(["-f", join(dir, "seed.sql")]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`Loaded the sample data (${rows} rows).`);
}
console.log("Database is up to date.");
