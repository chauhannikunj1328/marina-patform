import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StoreContext } from "./context";
import { today } from "@/lib/date";
import { setCurrency } from "@/lib/format";
import { createSeed, type Db } from "./seed";
import { Index } from "./selectors";
import type { SystemUser } from "./types";

export type ToastKind = "success" | "info" | "warning" | "error";

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
  signIn: (email: string, password: string) => string | null;
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
}


// Demo accounts for the prototype only. Replace with a real auth provider.
const DEMO_PASSWORDS: Record<string, string> = {
  "admin@marina.com": "admin123",
  "manager@marina.com": "manager123",
};

const SESSION_KEY = "mms.session";
const DATA_KEY = "mms.data.v3";

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
  return { ...db, invoices: db.invoices.map((i) => (i.status === "due" && i.due < now ? { ...i, status: "overdue" } : i)) };
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
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

  const activity = useMemo(
    () => (user?.role === "admin" ? db.activity : db.activity.filter((a) => a.marinaId && scope.includes(a.marinaId))),
    [db.activity, user, scope],
  );

  const signIn = (email: string, password: string) => {
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || DEMO_PASSWORDS[u.email] !== password) return "That email and password don't match. Try again.";
    if (u.status !== "active") return "This account isn't active yet.";
    setUserId(u.id);
    try {
      sessionStorage.setItem(SESSION_KEY, u.id);
    } catch {
      /* storage unavailable */
    }
    return null;
  };

  const signOut = () => {
    setUserId(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <StoreContext.Provider value={{ db, ix, update, restore, user, signIn, signOut, scope, resetData, toasts, toast, activity }}>{children}</StoreContext.Provider>
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
