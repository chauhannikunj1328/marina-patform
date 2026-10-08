// The website's data: its own copy of the sample data (like the other apps until there's a real
// backend), the signed-in boat owner, and short confirmation messages.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createSeed, DEMO_OWNER_EMAIL, delocalizeDb, Index, localizeDb, OWNER_PASSWORD_HASHES, setCurrency, marinaTimeZones, setMarinaTimeZones, setTimeZone, today, withDemoOwner, withMarinaPoints, withOwner,
  type Boat, type BoatOwner, type Db,
} from "@marina/shared";
import { useLang } from "@/lib/lang";

const DATA_KEY = "marina.site.data.v3";
const ACCOUNTS_KEY = "marina.site.accounts";
const SESSION_KEY = "marina.site.session";

/** An owner who signed up here: their record, boats and password hash, kept across data resets. */
interface Account { email: string; hash: string; owner: BoatOwner; boats: Boat[] }

interface Toast { id: number; text: string }

interface Store {
  /** The data as shown: in Arabic, Gulf marinas, cities and regions carry their Arabic names. */
  db: Db;
  ix: Index;
  owner?: BoatOwner;
  update: (fn: (d: Db) => Db) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  register: (r: { name: string; email: string; phone: string; password: string }) => Promise<string | null>;
  signOut: () => void;
  /** Owners who signed up here can change their password; the demo account can't. */
  canChangePassword: boolean;
  changePassword: (current: string, next: string) => Promise<string | null>;
  toast: (text: string) => void;
  toasts: Toast[];
}

const Ctx = createContext<Store | null>(null);

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: changes last for this visit */
  }
}

/** Owners who signed up here come back after the daily reset of the sample data. */
function withAccounts(d: Db, accounts: Account[]): Db {
  const owners = accounts.filter((a) => !d.owners.some((o) => o.id === a.owner.id)).map((a) => a.owner);
  const boats = accounts.flatMap((a) => a.boats).filter((b) => !d.boats.some((x) => x.id === b.id));
  return owners.length || boats.length ? { ...d, owners: [...d.owners, ...owners], boats: [...d.boats, ...boats] } : d;
}

let sample: Db["marinas"] | undefined;
// The demo owner signs in as a sample owner with a contract, invoices and a tidy booking history.
const normalize = (d: Db) => withAccounts(withDemoOwner(withMarinaPoints(d, (sample ??= createSeed().marinas)), DEMO_OWNER_EMAIL, today()), read<Account[]>(ACCOUNTS_KEY, []));

// The sample data is rebuilt each day so stays stay current; changes made today are kept.
function loadDb(): Db {
  // Data saved by earlier versions of the site is dropped.
  try { localStorage.removeItem("marina.site.data.v1"); localStorage.removeItem("marina.site.data.v2"); } catch { /* storage unavailable */ }
  const saved = read<{ day: string; db: Db } | null>(DATA_KEY, null);
  return normalize(saved?.day === today() ? saved.db : createSeed());
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(loadDb);
  const [ownerId, setOwnerId] = useState<string | undefined>(() => read<string | undefined>(SESSION_KEY, undefined));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { lang } = useLang();
  // Pages read the data with place names in the current language; changes go to the stored data.
  const view = useMemo(() => localizeDb(db, lang), [db, lang]);
  const ix = useMemo(() => new Index(view), [view]);
  const owner = ownerId ? db.owners.find((o) => o.id === ownerId) : undefined;

  // Synchronous so the very first render already uses the right currency and time zone.
  setCurrency(db.settings.currency);
  setTimeZone(db.settings.timezone);
  // Each marina's own time zone, for times at that marina.
  setMarinaTimeZones(useMemo(() => marinaTimeZones(db), [db]));

  useEffect(() => {
    write(DATA_KEY, { day: today(), db });
    // Keep signed-up owners' details and boats with their account.
    const accounts = read<Account[]>(ACCOUNTS_KEY, []);
    if (accounts.length) write(ACCOUNTS_KEY, accounts.map((a) => ({ ...a, owner: db.owners.find((o) => o.id === a.owner.id) ?? a.owner, boats: db.boats.filter((b) => b.ownerId === a.owner.id) })));
  }, [db]);

  const update = useCallback((fn: (d: Db) => Db) => setDb((d) => delocalizeDb(fn(d), d)), []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000);
  }, []);

  const startSession = (id: string) => {
    write(SESSION_KEY, id);
    setOwnerId(id);
  };

  const signIn = async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    const hash = await sha256(password);
    const account = read<Account[]>(ACCOUNTS_KEY, []).find((a) => a.email === e);
    const known = account ? account.hash === hash : OWNER_PASSWORD_HASHES[e] === hash;
    const match = known && db.owners.find((o) => o.email.toLowerCase() === e);
    if (!match) return "That email and password don't match. Try again.";
    startSession(match.id);
    return null;
  };

  const register = async (r: { name: string; email: string; phone: string; password: string }) => {
    const email = r.email.trim().toLowerCase();
    if (OWNER_PASSWORD_HASHES[email] || read<Account[]>(ACCOUNTS_KEY, []).some((a) => a.email === email)) return "There's already an account with this email. Sign in instead.";
    const { db: next, owner: created } = withOwner(db, { name: r.name.trim(), email, phone: r.phone.trim() }, today());
    write(ACCOUNTS_KEY, [...read<Account[]>(ACCOUNTS_KEY, []), { email, hash: await sha256(r.password), owner: created, boats: [] }]);
    setDb(next);
    startSession(created.id);
    return null;
  };

  const canChangePassword = !!owner && read<Account[]>(ACCOUNTS_KEY, []).some((a) => a.owner.id === owner.id);

  const changePassword = async (current: string, next: string) => {
    const accounts = read<Account[]>(ACCOUNTS_KEY, []);
    const account = accounts.find((a) => a.owner.id === owner?.id);
    if (!account) return "The demo account's password can't be changed.";
    if (account.hash !== (await sha256(current))) return "Your current password isn't right.";
    const hash = await sha256(next);
    write(ACCOUNTS_KEY, accounts.map((a) => (a === account ? { ...a, hash } : a)));
    return null;
  };

  const signOut = () => {
    write(SESSION_KEY, undefined);
    setOwnerId(undefined);
  };

  return <Ctx.Provider value={{ db: view, ix, owner, update, signIn, register, signOut, canChangePassword, changePassword, toast, toasts }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
