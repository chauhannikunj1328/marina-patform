// App state for the Marina Berths customer app (boat owners). Same data model, sample data and
// owner accounts as the website's owner portal (via @marina/shared); data is saved on this phone
// until there's a real backend.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import {
  createSeed, delocalizeDb, DEMO_OWNER_EMAIL, Index, localizeDb, OWNER_PASSWORD_HASHES, sendOwnerEmail, setCurrency, marinaTimeZones, setMarinaTimeZones, setTimeZone, today, withDemoOwner, withMarinaPoints, withOwner,
  type Boat, type BoatOwner, type Db,
} from "@marina/shared";
import { load, remove, save } from "./lib/storage";
import { useLang } from "./lib/i18n";

export type ToastKind = "success" | "warning" | "error";
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  undo?: () => void;
}

/** An owner who signed up in the app: their record, boats and password hash, kept across data resets. */
interface Account { email: string; hash: string; owner: BoatOwner; boats: Boat[] }

interface Store {
  ready: boolean;
  db: Db;
  ix: Index;
  /** The signed-in boat owner, if any. Visitors can look around and search without an account. */
  owner?: BoatOwner;
  update: (fn: (d: Db) => Db) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  register: (r: { name: string; email: string; phone: string; password: string }) => Promise<string | null>;
  signOut: () => void;
  /** Owners who signed up here can change their password; the demo account can't. */
  canChangePassword: boolean;
  changePassword: (current: string, next: string) => Promise<string | null>;
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  /** False when the phone has no connection. */
  online: boolean;
}

const Ctx = createContext<Store | null>(null);

const DATA_KEY = "marina.customer.data.v2";
const ACCOUNTS_KEY = "marina.customer.accounts";
const SESSION_KEY = "marina.customer.session";

const sha256 = (v: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, v);

/** Owners who signed up here come back after the daily reset of the sample data. */
function withAccounts(d: Db, accounts: Account[]): Db {
  const owners = accounts.filter((a) => !d.owners.some((o) => o.id === a.owner.id)).map((a) => a.owner);
  const boats = accounts.flatMap((a) => a.boats).filter((b) => !d.boats.some((x) => x.id === b.id));
  return owners.length || boats.length ? { ...d, owners: [...d.owners, ...owners], boats: [...d.boats, ...boats] } : d;
}

let sample: Db["marinas"] | undefined;
// The demo owner signs in as a sample owner with a contract, invoices and a tidy booking history.
const normalize = (d: Db, accounts: Account[]) => withAccounts(withDemoOwner(withMarinaPoints(d, (sample ??= createSeed().marinas)), DEMO_OWNER_EMAIL, today()), accounts);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<Db>(() => normalize(createSeed(), []));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(true);
  const loaded = useRef(false);

  // Load saved data (only today's: sample data is rebuilt daily so dates stay current).
  useEffect(() => {
    (async () => {
      const saved = await load<{ day: string; db: Db }>(DATA_KEY);
      const accts = (await load<Account[]>(ACCOUNTS_KEY)) ?? [];
      setAccounts(accts);
      setDb(normalize(saved?.day === today() ? saved.db : createSeed(), accts));
      setOwnerId((await load<string>(SESSION_KEY)) ?? undefined);
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // Save the data, and keep signed-up owners' details and boats with their account.
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      void save(DATA_KEY, { day: today(), db });
      setAccounts((list) => {
        if (!list.length) return list;
        const next = list.map((a) => ({ ...a, owner: db.owners.find((o) => o.id === a.owner.id) ?? a.owner, boats: db.boats.filter((b) => b.ownerId === a.owner.id) }));
        void save(ACCOUNTS_KEY, next);
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [db]);

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);

  setTimeZone(db.settings.timezone);
  // Each marina's own time zone, for times at that marina.
  setMarinaTimeZones(useMemo(() => marinaTimeZones(db), [db]));
  setCurrency(db.settings.currency);
  const { lang } = useLang();
  // Screens read the data with place names in the current language; changes go to the stored data.
  const view = useMemo(() => localizeDb(db, lang), [db, lang]);
  const ix = useMemo(() => new Index(view), [view]);
  const owner = ownerId ? db.owners.find((o) => o.id === ownerId) : undefined;

  const update = useCallback((fn: (d: Db) => Db) => setDb((d) => delocalizeDb(fn(d), d)), []);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3500);
  }, []);

  const startSession = (id: string, o: { name: string; email: string }, event: "Registered" | "Signed in") => {
    setOwnerId(id);
    void save(SESSION_KEY, id);
    if (!__DEV__) void sendOwnerEmail({ event, name: o.name, email: o.email, role: "boat owner", app: "Customer app", site: Platform.OS === "web" ? "Customer app (web preview)" : "Customer app", device: `${Platform.OS} ${Platform.Version ?? ""}` });
  };

  const signIn = async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    const hash = await sha256(password);
    const account = accounts.find((a) => a.email === e);
    const known = account ? account.hash === hash : OWNER_PASSWORD_HASHES[e] === hash;
    const match = known && db.owners.find((o) => o.email.toLowerCase() === e);
    if (!match) return "That email and password don't match. Try again.";
    startSession(match.id, match, "Signed in");
    return null;
  };

  const register = async (r: { name: string; email: string; phone: string; password: string }) => {
    const email = r.email.trim().toLowerCase();
    if (OWNER_PASSWORD_HASHES[email] || accounts.some((a) => a.email === email)) return "There's already an account with this email. Sign in instead.";
    const { db: next, owner: created } = withOwner(db, { name: r.name.trim(), email, phone: r.phone.trim() }, today());
    const list = [...accounts, { email, hash: await sha256(r.password), owner: created, boats: [] }];
    setAccounts(list);
    await save(ACCOUNTS_KEY, list);
    setDb(next);
    startSession(created.id, created, "Registered");
    return null;
  };

  const canChangePassword = !!owner && accounts.some((a) => a.owner.id === owner.id);

  const changePassword = async (current: string, next: string) => {
    const account = accounts.find((a) => a.owner.id === owner?.id);
    if (!account) return "The demo account's password can't be changed.";
    if (account.hash !== (await sha256(current))) return "Your current password isn't right.";
    const hash = await sha256(next);
    const list = accounts.map((a) => (a === account ? { ...a, hash } : a));
    setAccounts(list);
    await save(ACCOUNTS_KEY, list);
    return null;
  };

  const signOut = () => {
    setOwnerId(undefined);
    void remove(SESSION_KEY);
  };

  return (
    <Ctx.Provider value={{ ready, db: view, ix, owner, update, signIn, register, signOut, canChangePassword, changePassword, toasts, toast, online }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
