// The Supabase backend: sign-in, loading the data and saving changes. Used when VITE_SUPABASE_URL
// and VITE_SUPABASE_ANON_KEY are set; otherwise the app runs as the demo, on sample data in this
// browser. The Supabase library is downloaded only when the backend is on.
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLLECTIONS, createSeed, fromRow, SETTINGS_TABLE, TABLES, type Changes, type Db } from "@marina/shared";

const URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the app talks to the database instead of running on sample data. */
export const BACKEND = Boolean(URL && KEY);

let client: Promise<SupabaseClient> | undefined;
function supabase(): Promise<SupabaseClient> {
  client ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(URL!, KEY!));
  return client;
}

/** The email of the person signed in on this device, if their session is still valid. */
export async function sessionEmail(): Promise<string | null> {
  const { data } = await (await supabase()).auth.getSession();
  return data.session?.user.email ?? null;
}

/** Resolves to an error (in English) or null. */
export async function signInRemote(email: string, password: string): Promise<string | null> {
  const { error } = await (await supabase()).auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOutRemote() {
  await (await supabase()).auth.signOut();
}

/** The signed-in person's account (any role can read their own). */
export async function ownAccount(email: string) {
  const { data, error } = await (await supabase()).from(TABLES.users.table).select("*").ilike("email", email).maybeSingle();
  if (error) throw error;
  return data ? fromRow<Db["users"][number]>("users", data) : null;
}

const PAGE = 1000; // the most rows Supabase returns per request

/** Every row of a table, a page at a time. */
async function allRows(db: SupabaseClient, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select("*").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Everything the signed-in person may see. Row-level security decides what that is. */
export async function fetchDb(): Promise<Db> {
  const db = await supabase();
  const [tables, settings] = await Promise.all([
    Promise.all(COLLECTIONS.map(async (c) => [c, (await allRows(db, TABLES[c].table)).map((r) => fromRow(c, r))] as const)),
    db.from(SETTINGS_TABLE).select("data").maybeSingle(),
  ]);
  if (settings.error) throw settings.error;
  const data = Object.fromEntries(tables) as unknown as Omit<Db, "settings" | "readNotifications">;
  return { ...data, settings: (settings.data?.data as Db["settings"] | undefined) ?? createSeed().settings, readNotifications: [] };
}

/** An empty database, shown until the data has loaded. */
export function emptyDb(): Db {
  return { ...(Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Omit<Db, "settings" | "readNotifications">), settings: createSeed().settings, readNotifications: [] };
}

/** Writes changes: new and changed rows (references first), then deletes, then settings. */
export async function saveChanges(changes: Changes) {
  const db = await supabase();
  for (const { collection, rows } of changes.upserts) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from(TABLES[collection].table).upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  }
  // In batches: the ids go in the request's address, which has a length limit.
  for (const { collection, ids } of changes.deletes) {
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await db.from(TABLES[collection].table).delete().in("id", ids.slice(i, i + 100));
      if (error) throw error;
    }
  }
  if (changes.settings) {
    const { error } = await db.from(SETTINGS_TABLE).upsert({ id: 1, data: changes.settings });
    if (error) throw error;
  }
}
