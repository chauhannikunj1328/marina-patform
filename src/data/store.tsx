import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StoreContext } from "./context";
import { setTimeZone, today } from "@/lib/date";
import { setCurrency } from "@/lib/format";
import { notifyOwner } from "@/lib/notify";
import { DEFAULT_PERMISSIONS, levelFor, type Area, type Level } from "./permissions";
import { createSeed, type Db } from "./seed";
import { Index } from "./selectors";
import type { SystemUser } from "./types";

export type ToastKind = "success" | "info" | "warning" | "error" | "celebrate";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  undo?: () => void;
}

type Log = string | { text: string; to?: string; marinaId?: string };

interface Store {
  db: Db;
  ix: Index;
  /** Apply an immutable update to the database, optionally recording it in the activity log. */
  update: (fn: (db: Db) => Db, log?: Log) => void;
  /** Put the database back to an earlier snapshot (used by Undo). */
  restore: (snapshot: Db, label: string) => void;
  user: SystemUser | null;
  /** Resolves to an error message, or null when signed in. */
  signIn: (email: string, password: string, remember?: boolean) => Promise<string | null>;
  /** Creates an admin account in this browser and signs in. Resolves to an error message, or null. */
  register: (a: { name: string; email: string; company?: string; password: string }) => Promise<string | null>;
  signOut: () => void;
  /** Marinas the signed-in user may see. */
  scope: string[];
  /** Discard all changes and regenerate the sample data. */
  resetData: () => void;
  toasts: Toast[];
  /** Show a message. Pass `undo` with the database as it was before the change to offer an Undo button. */
  toast: (message: string, undo?: Db, kind?: ToastKind) => void;
  /** Activity entries visible to the signed-in user. */
  activity: Db["activity"];
  /** Permission level of the signed-in user for an area of the app. */
  can: (area?: Area) => Level;
}


// Prototype sign-in only: passwords are stored as SHA-256 hashes, never in plain text.
// Replace with a real auth provider before launch.
const PASSWORD_HASHES: Record<string, string> = {
  "admin@marina.com": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
  "manager@marina.com": "866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5",
  "chauhan.nikunj1328@gmail.com": "22b1ef6bfcd16329eb678346e6409561d2f3b46e9010a5226e552a4ddf3b1bba",
};

/** Accounts that must always exist, even in data saved before they were added. */
const BUILT_IN_USERS: SystemUser[] = [
  { id: "u-owner", name: "Nikunj Chauhan", email: "chauhan.nikunj1328@gmail.com", role: "admin", marinaIds: [], lastActive: today(), status: "active" },
];

/** Accounts created with "Create account". Kept separately so they survive the daily data reset. */
interface RegisteredAccount {
  id: string;
  name: string;
  email: string;
  company?: string;
  hash: string;
  createdAt: string;
}
const ACCOUNTS_KEY = "mms.accounts";

function readAccounts(): RegisteredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as RegisteredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(list: RegisteredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the account lasts for this visit only */
  }
}

const toUser = (a: RegisteredAccount): SystemUser => ({ id: a.id, name: a.name, email: a.email, role: "admin", marinaIds: [], lastActive: today(), status: "active" });

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_KEY = "mms.session";
const DATA_KEY = "mms.data.v5";

// Changes are kept in the browser for the current day. Sample data is regenerated
// each day so booking statuses (checked in, upcoming…) stay correct relative to today.
function loadDb(): Db {
  try {
    // Drop data saved by older versions of the prototype.
    for (const k of Object.keys(localStorage)) if (k.startsWith("mms.data.") && k !== DATA_KEY) localStorage.removeItem(k);
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { day: string; db: Db };
      if (saved.day === today()) return normalize(saved.db);
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return normalize(createSeed());
}

/** Derived states that depend on today's date. */
function normalize(db: Db): Db {
  const now = today();
  const missing = [...BUILT_IN_USERS, ...readAccounts().map(toUser)].filter((b) => !db.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase()));
  return {
    ...db,
    // Data saved before permissions existed gets the defaults.
    settings: { ...db.settings, permissions: { ...DEFAULT_PERMISSIONS, ...db.settings.permissions } },
    users: [...db.users, ...missing],
    invoices: db.invoices.map((i) => {
      // Data saved before partial payments existed: rebuild the payment list from paidAt.
      const payments = i.payments ?? (i.status === "paid" && i.paidAt ? [{ date: i.paidAt, amount: i.amount, method: i.method ?? "Card" }] : []);
      return { ...i, payments, status: i.status === "due" && i.due < now ? "overdue" : i.status };
    }),
  };
}

/** "Remember me" keeps the session in localStorage; otherwise it ends when the tab closes. */
function readSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(loadDb);
  const [userId, setUserId] = useState<string | null>(readSession);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const ix = useMemo(() => new Index(db), [db]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify({ day: today(), db }));
      } catch {
        /* storage full or unavailable: changes stay in memory only */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [db]);

  const resetData = useCallback(() => setDb(createSeed()), []);
  const user = db.users.find((u) => u.id === userId) ?? null;
  const scope = useMemo(
    () => (!user ? [] : user.marinaIds.length ? user.marinaIds : db.marinas.map((m) => m.id)),
    [user, db.marinas],
  );

  const userName = user?.name ?? "System";
  const update = useCallback(
    (fn: (db: Db) => Db, log?: Log) =>
      setDb((d) => {
        const next = fn(d);
        if (!log) return next;
        const entry: { text: string; to?: string; marinaId?: string } = typeof log === "string" ? { text: log } : log;
        // A manager with one marina can only change that marina.
        if (!entry.marinaId && scope.length === 1) entry.marinaId = scope[0];
        return { ...next, activity: [{ id: nextId("a", next.activity), at: new Date().toISOString(), by: userName, ...entry }, ...next.activity].slice(0, 200) };
      }),
    [userName, scope],
  );

  // Synchronous so the very first render already uses the right currency.
  setCurrency(db.settings.currency);
  setTimeZone(db.settings.timezone);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const restore = useCallback(
    (snapshot: Db, label: string) =>
      setDb({ ...snapshot, activity: [{ id: `a-undo-${Date.now()}`, at: new Date().toISOString(), by: userName, text: `Undid: ${label}` }, ...snapshot.activity] }),
    [userName],
  );

  const toast = useCallback(
    (message: string, undo?: Db, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [
        ...t,
        {
          id,
          message,
          kind,
          undo: undo && (() => {
            restore(undo, message);
            dismiss(id);
          }),
        },
      ]);
      setTimeout(() => dismiss(id), undo ? 7000 : 3500);
    },
    [restore, dismiss],
  );

  const can = useCallback((area?: Area) => levelFor(db.settings.permissions, user?.role, area), [db.settings.permissions, user?.role]);

  const activity = useMemo(
    () => (user?.role === "admin" ? db.activity : db.activity.filter((a) => a.marinaId && scope.includes(a.marinaId))),
    [db.activity, user, scope],
  );

  const startSession = (id: string, remember = false) => {
    setUserId(id);
    try {
      sessionStorage.setItem(SESSION_KEY, id);
      if (remember) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  const signIn = async (email: string, password: string, remember = false) => {
    const key = email.trim().toLowerCase();
    const u = db.users.find((x) => x.email.toLowerCase() === key);
    const account = readAccounts().find((a) => a.email.toLowerCase() === key);
    const expected = PASSWORD_HASHES[key] ?? account?.hash;
    if (!u || !expected || expected !== (await sha256(password))) return "That email and password don't match. Try again.";
    if (u.status !== "active") return "This account isn't active yet.";
    startSession(u.id, remember);
    notifyOwner({ event: "Signed in", name: u.name, email: u.email, role: u.role, company: account?.company });
    return null;
  };

  const register = async ({ name, email, company, password }: { name: string; email: string; company?: string; password: string }) => {
    const key = email.trim().toLowerCase();
    if (PASSWORD_HASHES[key] || db.users.some((x) => x.email.toLowerCase() === key) || readAccounts().some((a) => a.email.toLowerCase() === key))
      return "An account with this email already exists. Sign in instead.";
    const account: RegisteredAccount = { id: `u-reg-${Date.now()}`, name: name.trim(), email: email.trim(), company: company?.trim() || undefined, hash: await sha256(password), createdAt: new Date().toISOString() };
    writeAccounts([...readAccounts(), account]);
    const user = toUser(account);
    setDb((d) => ({
      ...d,
      users: [...d.users, user],
      activity: [{ id: `a-reg-${Date.now()}`, at: account.createdAt, by: user.name, text: `${user.name} created an account` }, ...d.activity],
    }));
    startSession(user.id);
    notifyOwner({ event: "Registered", name: user.name, email: user.email, role: user.role, company: account.company });
    return null;
  };

  const signOut = () => {
    setUserId(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <StoreContext.Provider value={{ db, ix, update, restore, user, signIn, register, signOut, can, scope, resetData, toasts, toast, activity }}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const s = useContext(StoreContext) as Store | null;
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export function nextId(prefix: string, list: { id: string }[]): string {
  const max = list.reduce((m, x) => Math.max(m, Number(x.id.split("-").pop()) || 0), 0);
  return `${prefix}-${max + 1}`;
}
