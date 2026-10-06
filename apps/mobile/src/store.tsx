// App state for Marina Staff. Uses the same data model, sample data, permissions and
// sign-in accounts as the web app (via @marina/shared); data is saved on this device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import {
  BUILT_IN_USERS, createSeed, DEFAULT_PERMISSIONS, Index, levelFor, nextId, PASSWORD_HASHES, sendOwnerEmail, SIGN_IN_ERROR, setTimeZone, today,
  type Area, type Db, type Level, type SystemUser,
} from "@marina/shared";
import { load, remove, save } from "./lib/storage";

export type ToastKind = "success" | "warning" | "error";
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  undo?: () => void;
}

interface Store {
  ready: boolean;
  db: Db;
  ix: Index;
  user: SystemUser | null;
  /** Marinas this person can work at. */
  scope: string[];
  /** Marina currently shown in the app. */
  marinaId: string;
  setMarinaId: (id: string) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  update: (fn: (db: Db) => Db, log?: { text: string; marinaId?: string; to?: string }) => void;
  can: (area?: Area) => Level;
  toasts: Toast[];
  /** Pass the database as it was before a change to offer Undo. */
  toast: (message: string, undo?: Db, kind?: ToastKind) => void;
}

const Ctx = createContext<Store | null>(null);

const DATA_KEY = "marina.data.v1";
const SESSION_KEY = "marina.session";
const MARINA_KEY = "marina.staff.marina";

function normalize(db: Db): Db {
  const missing = BUILT_IN_USERS().filter((b) => !db.users.some((u) => u.email.toLowerCase() === b.email));
  return {
    ...db,
    users: [...db.users, ...missing],
    settings: { ...db.settings, permissions: { ...DEFAULT_PERMISSIONS, ...db.settings.permissions } },
    invoices: db.invoices.map((i) => ({ ...i, payments: i.payments ?? [], status: i.status === "due" && i.due < today() ? "overdue" : i.status })),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<Db>(() => normalize(createSeed()));
  const [userId, setUserId] = useState<string | null>(null);
  const [marinaId, setMarinaIdState] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const loaded = useRef(false);

  // Load saved data (only today's: sample data is regenerated daily so dates stay current).
  useEffect(() => {
    (async () => {
      const saved = await load<{ day: string; db: Db }>(DATA_KEY);
      if (saved?.day === today()) setDb(normalize(saved.db));
      setUserId(await load<string>(SESSION_KEY));
      setMarinaIdState((await load<string>(MARINA_KEY)) ?? "");
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => void save(DATA_KEY, { day: today(), db }), 400);
    return () => clearTimeout(t);
  }, [db]);

  setTimeZone(db.settings.timezone);
  const ix = useMemo(() => new Index(db), [db]);
  const user = db.users.find((u) => u.id === userId) ?? null;
  const scope = useMemo(() => (!user ? [] : user.marinaIds.length ? user.marinaIds : db.marinas.map((m) => m.id)), [user, db.marinas]);
  const me = user && db.staff.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
  const currentMarina = scope.includes(marinaId) ? marinaId : me && scope.includes(me.marinaId) ? me.marinaId : scope[0] ?? "";

  const setMarinaId = (id: string) => {
    setMarinaIdState(id);
    void save(MARINA_KEY, id);
  };

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, undo?: Db, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, kind, undo: undo && (() => { setDb(undo); dismiss(id); }) }]);
      setTimeout(() => dismiss(id), undo ? 6000 : 3000);
    },
    [dismiss],
  );

  const update = useCallback(
    (fn: (db: Db) => Db, log?: { text: string; marinaId?: string; to?: string }) =>
      setDb((d) => {
        const next = fn(d);
        if (!log) return next;
        const entry = { id: nextId("a", next.activity), at: new Date().toISOString(), by: user?.name ?? "Staff", ...log };
        return { ...next, activity: [entry, ...next.activity].slice(0, 200) };
      }),
    [user?.name],
  );

  const signIn = async (email: string, password: string) => {
    const key = email.trim().toLowerCase();
    const u = db.users.find((x) => x.email.toLowerCase() === key);
    const expected = PASSWORD_HASHES[key];
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
    if (!u || !expected || expected !== hash) return SIGN_IN_ERROR;
    if (u.status !== "active") return "This account isn't active yet.";
    setUserId(u.id);
    void save(SESSION_KEY, u.id);
    if (!__DEV__) {
      void sendOwnerEmail({ event: "Signed in", name: u.name, email: u.email, role: u.role, app: "Staff mobile app", site: Platform.OS === "web" ? "Staff app (web)" : "Staff app", device: `${Platform.OS} ${Platform.Version ?? ""}` });
    }
    return null;
  };

  const signOut = () => {
    setUserId(null);
    void remove(SESSION_KEY);
  };

  const can = useCallback((area?: Area) => levelFor(db.settings.permissions, user?.role, area), [db.settings.permissions, user?.role]);

  return (
    <Ctx.Provider value={{ ready, db, ix, user, scope, marinaId: currentMarina, setMarinaId, signIn, signOut, update, can, toasts, toast }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** The staff record linked to the signed-in user (matched by email). */
export function useMe() {
  const { db, user } = useStore();
  return useMemo(() => db.staff.find((s) => s.email.toLowerCase() === user?.email.toLowerCase()), [db.staff, user]);
}
