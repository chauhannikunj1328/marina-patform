// Writes the apps' sample data as SQL inserts for the database (supabase/seed.sql by default), so
// the backend starts with the same marinas, berths, bookings and accounts as the demo.
//   npm run db:seed                       writes supabase/seed.sql
//   npm run db:seed -- --out other.sql    somewhere else
// Dates in the sample data are relative to today, like the demo's, so make it again for a fresh start.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUILT_IN_USERS, createSeed } from "../../packages/shared/src/index";
import { seedSql } from "./sql";

const ROOT = join(import.meta.dirname, "../..");
const i = process.argv.indexOf("--out");
const out = i > 0 ? process.argv[i + 1] : join(ROOT, "supabase/seed.sql");

const db = createSeed();
// The built-in admin accounts the apps always add (see BUILT_IN_USERS).
db.users = [...db.users, ...BUILT_IN_USERS().filter((b) => !db.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase()))];
const { sql, rows, tables } = seedSql(db);
writeFileSync(out, sql);
console.log(`${rows} rows in ${tables} tables, plus settings → ${out}`);
