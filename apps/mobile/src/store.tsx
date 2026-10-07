// App state for the Marina mobile app (staff, managers and admins). Uses the same data model, sample data, permissions and
// sign-in accounts as the web app (via @marina/shared); data is saved on this device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import * as Crypto from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import {
  BUILT_IN_USERS, createSeed, DEFAULT_PERMISSIONS, Index, levelFor, nextId, PASSWORD_HASHES, sendOwnerEmail, SIGN_IN_ERROR, setCurrency, setTimeZone, today,
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
  /** Marina currently shown in the app, or ALL (managers and admins only). */
  marinaId: string;
  /** The marinas the screens show: the chosen one, or every marina in scope for ALL. */
  ids: string[];
  setMarinaId: (id: string) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  update: (fn: (db: Db) => Db, log?: { text: string; marinaId?: string; to?: string }) => void;
  can: (area?: Area) => Level;
  toasts: Toast[];
  /** Pass the database as it was before a change to offer Undo. */
  toast: (message: string, undo?: Db, kind?: ToastKind) => void;
  /** False when the phone has no connection. Everything keeps working; changes are saved on the phone. */
  online: boolean;
  /** Changes made while offline, waiting to be sent once there's a server to send them to. */
  outbox: { at: string; text: string }[];
  changePassword: (current: string, next: string) => Promise<string | null>;
  /** Shift reminders on this phone (staff). */
  reminders: boolean;
  setReminders: (on: boolean) => void;
  /** Ask for Face ID / fingerprint before showing the app. */
  biometric: boolean;
  setBiometric: (on: boolean) => void;
  /** True while the app is waiting for Face ID / fingerprint. */
  locked: boolean;
  unlock: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Marina switcher value meaning "every marina I can see". */
export const ALL = "all";

const DATA_KEY = "marina.data.v1";
const SESSION_KEY = "marina.session";
const MARINA_KEY = "marina.staff.marina";
const PASSWORDS_KEY = "marina.passwords";
const OUTBOX_KEY = "marina.outbox";
const REMINDERS_KEY = "marina.reminders";
const BIOMETRIC_KEY = "marina.biometric";
/** Lock again after the app has been in the background this long. */
const RELOCK_MS = 60_000;

const sha256 = (v: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, v);

function normalize(db: Db): Db {
  const missing = BUILT_IN_USERS().filter((b) => !db.users.some((u) => u.email.toLowerCase() === b.email));
  return {
    ...db,
    users: [...db.users, ...missing],
    // Data saved before these existed.
    timeEntries: db.timeEntries ?? [],
    requests: db.requests ?? [],
    chat: db.chat ?? [],
    handovers: db.handovers ?? [],
    patrols: db.patrols ?? [],
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
  const [online, setOnline] = useState(true);
  const [outbox, setOutbox] = useState<{ at: string; text: string }[]>([]);
  /** Passwords changed on this phone (hashes only), until there's a real account server. */
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [reminders, setRemindersState] = useState(false);
  const [biometric, setBiometricState] = useState(false);
  const [locked, setLocked] = useState(false);
  const loaded = useRef(false);
  const onlineRef = useRef(true);

  // Load saved data (only today's: sample data is regenerated daily so dates stay current).
  useEffect(() => {
    (async () => {
      const saved = await load<{ day: string; db: Db }>(DATA_KEY);
      if (saved?.day === today()) setDb(normalize(saved.db));
      setUserId(await load<string>(SESSION_KEY));
      setMarinaIdState((await load<string>(MARINA_KEY)) ?? "");
      setPasswords((await load<Record<string, string>>(PASSWORDS_KEY)) ?? {});
      setOutbox((await load<{ at: string; text: string }[]>(OUTBOX_KEY)) ?? []);
      setRemindersState((await load<boolean>(REMINDERS_KEY)) ?? false);
      const bio = (await load<boolean>(BIOMETRIC_KEY)) ?? false;
      setBiometricState(bio);
      setLocked(bio);
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => void save(DATA_KEY, { day: today(), db }), 400);
    return () => clearTimeout(t);
  }, [db]);

  const outboxRef = useRef(outbox);
  useEffect(() => {
    outboxRef.current = outbox;
    if (loaded.current) void save(OUTBOX_KEY, outbox);
  }, [outbox]);

  setTimeZone(db.settings.timezone);
  setCurrency(db.settings.currency);
  const ix = useMemo(() => new Index(db), [db]);
  const user = db.users.find((u) => u.id === userId) ?? null;
  const scope = useMemo(() => (!user ? [] : user.marinaIds.length ? user.marinaIds : db.marinas.map((m) => m.id)), [user, db.marinas]);
  const me = user && db.staff.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
  // Staff work at one marina at a time. Managers and admins with several marinas start on All marinas.
  const office = user?.role === "admin" || user?.role === "manager";
  const currentMarina =
    scope.includes(marinaId) ? marinaId
    : office && scope.length > 1 && (marinaId === ALL || !marinaId) ? ALL
    : me && scope.includes(me.marinaId) ? me.marinaId
    : scope[0] ?? "";
  const ids = useMemo(() => (currentMarina === ALL ? scope : [currentMarina]), [currentMarina, scope]);

  const setMarinaId = useCallback((id: string) => {
    setMarinaIdState(id);
    void save(MARINA_KEY, id);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, undo?: Db, kind: ToastKind = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, kind, undo: undo && (() => { setDb(undo); dismiss(id); }) }]);
      setTimeout(() => dismiss(id), undo ? 6000 : 3000);
    },
    [dismiss],
  );

  // Connection status. When the connection comes back, the outbox is where queued changes
  // would be sent to the server; with no server yet they are already saved on the phone.
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const now = state.isConnected !== false && state.isInternetReachable !== false;
        const queued = outboxRef.current.length;
        if (now && !onlineRef.current) {
          toast(queued ? `Back online. ${queued} ${queued === 1 ? "change" : "changes"} made offline ${queued === 1 ? "is" : "are"} saved.` : "Back online");
          setOutbox([]);
        }
        onlineRef.current = now;
        setOnline(now);
      }),
    [toast],
  );

  const update = useCallback(
    (fn: (db: Db) => Db, log?: { text: string; marinaId?: string; to?: string }) => {
      if (log && !onlineRef.current) setOutbox((q) => [...q, { at: new Date().toISOString(), text: log.text }]);
      setDb((d) => {
        const next = fn(d);
        if (!log) return next;
        const entry = { id: nextId("a", next.activity), at: new Date().toISOString(), by: user?.name ?? "Staff", ...log };
        return { ...next, activity: [entry, ...next.activity].slice(0, 200) };
      });
    },
    [user?.name],
  );

  const signIn = async (email: string, password: string) => {
    const key = email.trim().toLowerCase();
    const u = db.users.find((x) => x.email.toLowerCase() === key);
    const expected = passwords[key] ?? PASSWORD_HASHES[key];
    const hash = await sha256(password);
    if (!u || !expected || expected !== hash) return SIGN_IN_ERROR;
    if (u.status !== "active") return "This account isn't active yet.";
    setUserId(u.id);
    setLocked(false);
    void save(SESSION_KEY, u.id);
    if (!__DEV__) {
      void sendOwnerEmail({ event: "Signed in", name: u.name, email: u.email, role: u.role, app: "Mobile app", site: Platform.OS === "web" ? "Mobile app (web preview)" : "Mobile app", device: `${Platform.OS} ${Platform.Version ?? ""}` });
    }
    return null;
  };

  const changePassword = async (current: string, next: string) => {
    if (!user) return "Sign in first.";
    const key = user.email.toLowerCase();
    if ((await sha256(current)) !== (passwords[key] ?? PASSWORD_HASHES[key])) return "Your current password isn't right.";
    const all = { ...passwords, [key]: await sha256(next) };
    setPasswords(all);
    await save(PASSWORDS_KEY, all);
    return null;
  };

  const setReminders = useCallback((on: boolean) => {
    setRemindersState(on);
    void save(REMINDERS_KEY, on);
  }, []);

  const setBiometric = useCallback((on: boolean) => {
    setBiometricState(on);
    void save(BIOMETRIC_KEY, on);
  }, []);
  const unlock = useCallback(() => setLocked(false), []);

  // Lock again when the app comes back after a minute in the background.
  useEffect(() => {
    if (!biometric) return;
    let hiddenAt = 0;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") hiddenAt = Date.now();
      if (state === "active" && hiddenAt && Date.now() - hiddenAt > RELOCK_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [biometric]);

  const signOut = () => {
    setUserId(null);
    void remove(SESSION_KEY);
  };

  const can = useCallback((area?: Area) => levelFor(db.settings.permissions, user?.role, area), [db.settings.permissions, user?.role]);

  return (
    <Ctx.Provider value={{ ready, db, ix, user, scope, marinaId: currentMarina, ids, setMarinaId, signIn, signOut, update, can, toasts, toast, online, outbox, changePassword, reminders, setReminders, biometric, setBiometric, locked: locked && biometric && !!user, unlock }}>
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
