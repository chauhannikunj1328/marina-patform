// Before/after details for the audit log: what a change did to each record, worked out by
// comparing the data before and after it. Records that weren't touched keep the same object,
// so only changed ones are compared field by field.
import type { Db } from "./seed";

export interface FieldChange {
  /** e.g. "Booking BK-0249" */
  record: string;
  kind: "added" | "removed" | "changed";
  field?: string;
  before?: string;
  after?: string;
}

const COLLECTIONS: Partial<Record<keyof Db, string>> = {
  marinas: "Marina", berths: "Berth", owners: "Boat owner", boats: "Boat", bookings: "Booking", staff: "Staff", tasks: "Work order",
  invoices: "Invoice", users: "User", requests: "Request", contracts: "Contract", waitlist: "Waitlist", counties: "County", cities: "City",
};
/** Fields that change constantly or hold large data, left out of the detail. */
const SKIP = new Set(["photos", "notes", "payments", "lines", "prep", "arrival", "checks", "reminders"]);

const show = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length > 6 ? `${v.length} items` : v.map(show).join(", ");
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v).slice(0, 80);
};
const name = (label: string, x: Record<string, unknown>) => `${label} ${String(x.code ?? x.number ?? x.name ?? x.title ?? x.id)}`;

export function diffDb(before: Db, after: Db, limit = 20): FieldChange[] {
  const out: FieldChange[] = [];
  for (const [key, label] of Object.entries(COLLECTIONS) as [keyof Db, string][]) {
    const a = before[key] as unknown as { id: string }[] | undefined;
    const b = after[key] as unknown as { id: string }[] | undefined;
    if (!a || !b || a === b) continue;
    const old = new Map(a.map((x) => [x.id, x]));
    const now = new Map(b.map((x) => [x.id, x]));
    for (const [id, x] of now) {
      const prev = old.get(id);
      if (!prev) out.push({ record: name(label, x as never), kind: "added" });
      else if (prev !== x)
        for (const f of new Set([...Object.keys(prev), ...Object.keys(x)])) {
          if (SKIP.has(f)) continue;
          const p = (prev as Record<string, unknown>)[f], n = (x as Record<string, unknown>)[f];
          if (JSON.stringify(p) !== JSON.stringify(n)) out.push({ record: name(label, x as never), kind: "changed", field: f, before: show(p), after: show(n) });
        }
      if (out.length >= limit) return out;
    }
    for (const [id, x] of old) if (!now.has(id)) out.push({ record: name(label, x as never), kind: "removed" });
  }
  if (before.settings !== after.settings)
    for (const f of new Set([...Object.keys(before.settings), ...Object.keys(after.settings)]) as Set<keyof Db["settings"]>)
      if (JSON.stringify(before.settings[f]) !== JSON.stringify(after.settings[f])) out.push({ record: "Settings", kind: "changed", field: f, before: show(before.settings[f]), after: show(after.settings[f]) });
  return out.slice(0, limit);
}
