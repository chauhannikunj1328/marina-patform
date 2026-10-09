import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changesBetween, COLLECTIONS, createSeed, fromRow, hasChanges, snake, TABLES, toRow, WRITE_ORDER } from "../src";

// ---- The table map matches the migrations --------------------------------------------------------
const MIGRATIONS = join(import.meta.dirname, "../../../supabase/migrations");
const sql = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");

/** Columns of each table, from the create table statements. */
function tablesInSql() {
  const tables = new Map<string, Set<string>>();
  for (const m of sql.matchAll(/create table (\w+) \(([\s\S]*?)\n\);/g)) {
    const cols = m[2].split("\n").map((l) => /^\s+"?(\w+)"?\s+\w/.exec(l)?.[1]).filter((c): c is string => !!c && c !== "check");
    tables.set(m[1], new Set(cols));
  }
  return tables;
}

describe("database tables", () => {
  const tables = tablesInSql();

  it.each(COLLECTIONS)("%s has a table with every column", (collection) => {
    const { table, columns } = TABLES[collection];
    const cols = tables.get(table);
    expect(cols, `no "create table ${table}" in supabase/migrations`).toBeDefined();
    expect(Object.keys(columns).map(snake).filter((c) => !cols!.has(c))).toEqual([]);
    expect([...cols!].filter((c) => !Object.keys(columns).map(snake).includes(c))).toEqual([]);
  });

  it("are all written, in an order with references first", () => {
    expect([...WRITE_ORDER].sort()).toEqual([...COLLECTIONS].sort());
  });

  it("have row-level security turned on", () => {
    for (const collection of COLLECTIONS) expect(sql).toContain(`'${TABLES[collection].table}'`);
  });
});

// ---- Records and rows ----------------------------------------------------------------------------
describe("records and rows", () => {
  it("round-trip every sample record", () => {
    const db = createSeed();
    for (const collection of COLLECTIONS) {
      for (const record of (db[collection] as object[]).slice(0, 50)) {
        // Timestamps come back from Postgres as "+00:00"; fromRow turns them back into ISO strings.
        const row = Object.fromEntries(Object.entries(toRow(collection, record)).map(([k, v]) => [k, typeof v === "string" && /T\d\d:\d\d:\d\d\.\d+Z$/.test(v) ? v.replace("Z", "+00:00") : v]));
        expect(fromRow(collection, row)).toEqual(JSON.parse(JSON.stringify(record)));
      }
    }
  });

  it("clear optional fields that were removed", () => {
    const row = toRow("bookings", { id: "bk-1", code: "BK-1", boatId: "bt-1", berthId: "b-1", start: "2026-01-01", end: "2026-01-02", guests: 1, status: "pending", createdAt: "2026-01-01" });
    expect(row.price).toBeNull();
    expect(row.arrival).toBeNull();
  });
});

// ---- What to save --------------------------------------------------------------------------------
describe("changes between two versions of the data", () => {
  const db = createSeed();

  it("are empty when nothing changed", () => {
    expect(hasChanges(changesBetween(db, { ...db }))).toBe(false);
  });

  it("include an edited record, and only that one", () => {
    const next = { ...db, berths: db.berths.map((b, i) => (i === 0 ? { ...b, dailyRate: b.dailyRate + 1 } : b)) };
    const c = changesBetween(db, next);
    expect(c.upserts).toEqual([{ collection: "berths", rows: [toRow("berths", next.berths[0])] }]);
    expect(c.deletes).toEqual([]);
  });

  it("skip a record copied without changes", () => {
    const next = { ...db, berths: db.berths.map((b, i) => (i === 0 ? { ...b } : b)) };
    expect(hasChanges(changesBetween(db, next))).toBe(false);
  });

  it("include deleted records, children before parents", () => {
    const booking = db.bookings[0];
    const next = { ...db, bookings: db.bookings.slice(1), invoices: db.invoices.filter((i) => i.bookingId !== booking.id) };
    const c = changesBetween(db, next);
    expect(c.deletes.map((d) => d.collection)).toEqual(["invoices", "bookings"]);
    expect(c.deletes[1].ids).toEqual([booking.id]);
  });

  it("never delete activity the app trims from its list", () => {
    const next = { ...db, activity: db.activity.slice(0, 5) };
    expect(changesBetween(db, next).deletes).toEqual([]);
  });

  it("include the settings when they change", () => {
    const next = { ...db, settings: { ...db.settings, invoiceDueDays: 30 } };
    expect(changesBetween(db, next).settings?.invoiceDueDays).toBe(30);
  });
});
