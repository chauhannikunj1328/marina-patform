// SQL inserts for a copy of the app's data (used by seed.ts and the round-trip check).
import { SETTINGS_TABLE, TABLES, toRow, WRITE_ORDER, type ColumnKind, type Db } from "../../packages/shared/src/index";

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function literal(v: unknown, kind: ColumnKind): string {
  if (v === null || v === undefined) return "null";
  switch (kind) {
    case "num":
    case "int":
      return String(v);
    case "bool":
      return v ? "true" : "false";
    case "json":
      return `${quote(JSON.stringify(v))}::jsonb`;
    case "text[]":
      return `${quote(`{${(v as string[]).map((s) => `"${s.replace(/["\\]/g, "\\$&")}"`).join(",")}}`)}::text[]`;
    case "int[]":
      return `${quote(`{${(v as number[]).join(",")}}`)}::integer[]`;
    default:
      return quote(String(v));
  }
}

/** Columns that are SQL keywords, quoted in statements. */
const KEYWORDS = new Set(["end", "to", "by", "text", "at"]);
const ident = (c: string) => (KEYWORDS.has(c) ? `"${c}"` : c);

/** The whole Db as one transaction of inserts (existing rows are left alone). */
export function seedSql(db: Db): { sql: string; rows: number; tables: number } {
  const lines = [
    "-- Sample data for the Marina database, made by tools/db/seed.ts. Don't edit; make it again.",
    `-- Made ${new Date().toISOString()}.`,
    "begin;",
    "",
    `insert into ${SETTINGS_TABLE} (id, data) values (1, ${literal(db.settings, "json")}) on conflict (id) do update set data = excluded.data;`,
  ];
  let rows = 0;
  let tables = 0;
  for (const collection of WRITE_ORDER) {
    const { table, columns } = TABLES[collection];
    const records = db[collection] as object[];
    if (!records.length) continue;
    const kinds = Object.values(columns);
    const names = Object.keys(toRow(collection, records[0])).map(ident).join(", ");
    for (let start = 0; start < records.length; start += 500) {
      const values = records.slice(start, start + 500).map((r) => `(${Object.values(toRow(collection, r)).map((v, n) => literal(v, kinds[n])).join(", ")})`);
      lines.push("", `insert into ${table} (${names}) values`, values.join(",\n"), "on conflict (id) do nothing;");
    }
    rows += records.length;
    tables += 1;
  }
  lines.push("", "commit;", "");
  return { sql: lines.join("\n"), rows, tables };
}
