// The database (Supabase / Postgres) behind the apps: which table holds each collection of the Db,
// its columns, and how records turn into rows and back. The tables are created by
// supabase/migrations; a test checks this file and the migrations agree.
//
// Rows use snake_case columns; records keep the app's camelCase fields. Nested data (invoice
// payments, work order notes, check-in records) is stored as jsonb, as the app shapes it.
import type { Db } from "./seed";

/** How a column is stored. `ts` is a timestamp (read back as an ISO string ending in Z). */
export type ColumnKind = "text" | "num" | "int" | "bool" | "date" | "ts" | "json" | "text[]" | "int[]";

/** Collections of the Db that live in their own table (everything but settings and per-user read state). */
export type Collection = Exclude<keyof Db, "settings" | "readNotifications">;

export const TABLES: Record<Collection, { table: string; columns: Record<string, ColumnKind> }> = {
  counties: { table: "counties", columns: { id: "text", name: "text", state: "text", country: "text", nameAr: "text" } },
  cities: { table: "cities", columns: { id: "text", name: "text", countyId: "text", lat: "num", lng: "num", nameAr: "text" } },
  marinas: {
    table: "marinas",
    columns: { id: "text", name: "text", cityId: "text", phone: "text", email: "text", address: "text", lat: "num", lng: "num", status: "text", amenities: "text[]", nameAr: "text", addressAr: "text" },
  },
  berths: {
    table: "berths",
    columns: { id: "text", marinaId: "text", code: "text", maxLength: "num", type: "text", dailyRate: "num", monthlyRate: "num", power: "bool", water: "bool", underMaintenance: "bool" },
  },
  owners: { table: "boat_owners", columns: { id: "text", name: "text", email: "text", phone: "text", since: "date" } },
  boats: { table: "boats", columns: { id: "text", ownerId: "text", name: "text", type: "text", length: "num", registration: "text" } },
  bookings: {
    table: "bookings",
    columns: { id: "text", code: "text", boatId: "text", berthId: "text", start: "date", end: "date", guests: "int", status: "text", createdAt: "text", price: "num", prep: "json", arrival: "json" },
  },
  staff: {
    table: "staff",
    columns: { id: "text", name: "text", email: "text", phone: "text", position: "text", department: "text", marinaId: "text", status: "text", shift: "text", daysOff: "int[]", hired: "date", hourlyRate: "num" },
  },
  tasks: {
    table: "maintenance_tasks",
    columns: { id: "text", code: "text", title: "text", marinaId: "text", berthId: "text", assigneeId: "text", priority: "text", status: "text", created: "text", due: "date", notes: "json", photos: "text[]", doneAt: "text", planId: "text", parts: "json" },
  },
  invoices: {
    table: "invoices",
    columns: { id: "text", number: "text", bookingId: "text", issued: "date", due: "date", amount: "num", status: "text", paidAt: "text", method: "text", reminders: "text[]", payments: "json", lines: "json" },
  },
  users: { table: "app_users", columns: { id: "text", name: "text", email: "text", role: "text", marinaIds: "text[]", lastActive: "text", status: "text" } },
  activity: { table: "activity_log", columns: { id: "text", at: "ts", by: "text", text: "text", to: "text", marinaId: "text", changes: "json" } },
  messages: { table: "messages", columns: { id: "text", at: "text", to: "text", subject: "text", kind: "text", ref: "text" } },
  timeEntries: { table: "time_entries", columns: { id: "text", staffId: "text", marinaId: "text", start: "ts", end: "ts" } },
  requests: {
    table: "staff_requests",
    columns: { id: "text", staffId: "text", kind: "text", start: "date", end: "date", swapWithId: "text", reason: "text", status: "text", createdAt: "ts", decidedBy: "text", decidedAt: "ts" },
  },
  chat: { table: "chat_messages", columns: { id: "text", staffId: "text", fromStaff: "bool", by: "text", text: "text", at: "ts", read: "bool", broadcast: "bool" } },
  handovers: { table: "handovers", columns: { id: "text", marinaId: "text", text: "text", by: "text", shift: "text", at: "ts" } },
  patrols: { table: "patrols", columns: { id: "text", marinaId: "text", staffId: "text", by: "text", startedAt: "ts", endedAt: "ts", checks: "json" } },
  waitlist: {
    table: "waitlist_entries",
    columns: {
      id: "text", marinaId: "text", name: "text", email: "text", phone: "text", boatName: "text", boatLength: "num", start: "date", end: "date", note: "text", status: "text", createdAt: "text",
      offeredBerthId: "text", bookingId: "text",
    },
  },
  contracts: {
    table: "contracts",
    columns: {
      id: "text", code: "text", ownerId: "text", boatId: "text", berthId: "text", marinaId: "text", term: "text", start: "date", end: "date", monthlyFee: "num", autoRenew: "bool", status: "text",
      bookingId: "text", createdAt: "text", renewedFromId: "text", signed: "json",
    },
  },
  meterReadings: { table: "meter_readings", columns: { id: "text", berthId: "text", kind: "text", value: "num", at: "ts", by: "text", charged: "num", bookingId: "text" } },
  timesheetApprovals: { table: "timesheet_approvals", columns: { id: "text", staffId: "text", weekStart: "date", minutes: "int", approvedBy: "text", at: "ts" } },
  maintenancePlans: {
    table: "maintenance_plans",
    columns: { id: "text", marinaId: "text", title: "text", berthId: "text", every: "text", nextDue: "date", priority: "text", assigneeId: "text", active: "bool" },
  },
  inventory: { table: "inventory_items", columns: { id: "text", marinaId: "text", name: "text", unit: "text", qty: "num", reorderAt: "num", unitCost: "num" } },
  incidents: {
    table: "incidents",
    columns: {
      id: "text", code: "text", marinaId: "text", kind: "text", serious: "bool", at: "ts", berthId: "text", description: "text", people: "text", photos: "text[]", reportedBy: "text",
      reportedAt: "ts", status: "text", notes: "json", outcome: "text",
    },
  },
};

export const COLLECTIONS = Object.keys(TABLES) as Collection[];

/**
 * Order to write tables in so references exist first (marinas before berths, bookings before
 * invoices). Deletes go in the reverse order.
 */
export const WRITE_ORDER: Collection[] = [
  "counties", "cities", "marinas", "berths", "owners", "boats", "bookings", "invoices", "contracts", "staff", "users",
  "tasks", "maintenancePlans", "inventory", "incidents", "waitlist", "meterReadings", "timeEntries", "requests", "chat",
  "handovers", "patrols", "timesheetApprovals", "messages", "activity",
];

/** The settings live in one row of the settings table, as jsonb. */
export const SETTINGS_TABLE = "settings";

export const snake = (field: string) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

type Row = Record<string, unknown>;

/** A record as a row for its table. Missing optional fields become null, so an update clears them. */
export function toRow(collection: Collection, record: object): Row {
  const r = record as Record<string, unknown>;
  const row: Row = {};
  for (const field of Object.keys(TABLES[collection].columns)) row[snake(field)] = r[field] ?? null;
  return row;
}

/** A row from the database as the app's record. Null columns are left out, as optional fields are. */
export function fromRow<T>(collection: Collection, row: Row): T {
  const record: Record<string, unknown> = {};
  for (const [field, kind] of Object.entries(TABLES[collection].columns)) {
    const v = row[snake(field)];
    if (v === null || v === undefined) continue;
    if (kind === "ts") record[field] = new Date(v as string).toISOString();
    else if (kind === "num" || kind === "int") record[field] = Number(v);
    else record[field] = v;
  }
  return record as T;
}

/** What changed between two versions of the data: rows to write and ids to delete, by table. */
export interface Changes {
  upserts: { collection: Collection; rows: Row[] }[];
  deletes: { collection: Collection; ids: string[] }[];
  settings?: Db["settings"];
}

/**
 * Compares two versions of the data. The app changes records immutably, so a record that's the
 * same object as before hasn't changed and is skipped without comparing its contents.
 * The activity log only grows: entries the app trims from its list stay in the database.
 */
export function changesBetween(prev: Db, next: Db): Changes {
  const changes: Changes = { upserts: [], deletes: [] };
  for (const collection of WRITE_ORDER) {
    const before = prev[collection] as { id: string }[];
    const after = next[collection] as { id: string }[];
    if (before === after) continue;
    const old = new Map(before.map((x) => [x.id, x]));
    const rows: Row[] = [];
    for (const x of after) {
      const was = old.get(x.id);
      if (was !== x && (!was || JSON.stringify(toRow(collection, was)) !== JSON.stringify(toRow(collection, x)))) rows.push(toRow(collection, x));
      old.delete(x.id);
    }
    if (rows.length) changes.upserts.push({ collection, rows });
    if (old.size && collection !== "activity") changes.deletes.push({ collection, ids: [...old.keys()] });
  }
  changes.deletes.reverse();
  if (prev.settings !== next.settings && JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) changes.settings = next.settings;
  return changes;
}

export const hasChanges = (c: Changes) => c.upserts.length > 0 || c.deletes.length > 0 || c.settings !== undefined;
