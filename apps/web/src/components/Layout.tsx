import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, FileSignature,
  Anchor, ArrowLeft, ArrowRight, Bell, Eye, Building, CalendarDays, ChartLine, CircleAlert, CircleCheck, EllipsisVertical, FileText, Globe, House, Info, Landmark,
  Keyboard, LogOut, MapPin, Menu, Moon, Sparkles, Receipt, Search, Settings, ShieldCheck, Sun, TriangleAlert, UserCog, Users, Warehouse, Wrench, X,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/data/store";
import { cx } from "@marina/shared";
import { buildNotifications } from "@marina/shared";
import { Avatar, Badge, IconButton, Modal, Tooltip } from "./ui";
import { OfflineBanner } from "./StatusPage";
import { Welcome } from "./Welcome";
import { areaForPath } from "@marina/shared";
import { Logo, Logomark } from "./Logo";
import type { ToastKind } from "@/data/store";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Hidden for users who can only see one marina. */
  multiMarina?: boolean;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Dashboards",
    items: [
      { to: "/", label: "Global Overview", icon: Globe },
      { to: "/county", label: "County Dashboard", icon: Landmark, multiMarina: true },
      { to: "/city", label: "City Dashboard", icon: Building, multiMarina: true },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/marinas", label: "Marinas", icon: Anchor },
      { to: "/berths", label: "Berths", icon: Warehouse },
      { to: "/bookings", label: "Bookings", icon: CalendarDays },
      { to: "/contracts", label: "Contracts", icon: FileSignature },
      { to: "/locations", label: "Locations", icon: MapPin, adminOnly: true },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/staff", label: "Staff", icon: UserCog },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/incidents", label: "Incidents", icon: ShieldAlert },
      { to: "/users", label: "Owners & Users", icon: Users },
      { to: "/billing", label: "Billing & Invoicing", icon: Receipt },
    ],
  },
  {
    group: "Analytics",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/analytics", label: "Analytics", icon: ChartLine },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/access", label: "Access Control", icon: ShieldCheck, adminOnly: true },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function navLabel(it: NavItem, role?: string) {
  if (role === "admin") return it.label;
  if (it.to === "/") return "Overview";
  if (it.to === "/users") return "Boat Owners";
  return it.label;
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("mms.theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("mms.theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOutside();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [onOutside]);
  return ref;
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("mms.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("mms.sidebar", c ? "expanded" : "collapsed");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  return [collapsed, toggle] as const;
}

/** Guide 07 Navigation: warm sidebar, 20 px outline icon + label; active = filled icon, Ink text, 3 px Slate bar. */
function Sidebar({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { user, scope, can } = useStore();
  return (
    <div className="flex h-full flex-col">
      <div className={cx("flex h-20 shrink-0 items-center", collapsed ? "justify-center px-2" : "justify-between gap-2 pr-3 pl-6")}>
        <Link to="/" onClick={onNavigate} className="rounded-md" aria-label="Marina home">
          {collapsed ? <Logomark size={20} /> : <Logo />}
        </Link>
        {onToggle && !collapsed && (
          <IconButton icon={ArrowLeft} label="Collapse sidebar" onClick={onToggle} className="max-lg:hidden" />
        )}
      </div>
      {onToggle && collapsed && (
        <div className="hidden justify-center pb-2 lg:flex">
          <IconButton icon={ArrowRight} label="Expand sidebar" onClick={onToggle} />
        </div>
      )}
      <nav className={cx("flex-1 overflow-y-auto pb-6", collapsed ? "px-3" : "px-4")} aria-label="Main">
        {NAV.map((g) => {
          // A single-marina manager doesn't need county and city roll-ups.
          const items = g.items.filter((i) => (!i.adminOnly || user?.role === "admin") && !(i.multiMarina && scope.length < 2) && can(areaForPath(i.to)) !== "none");
          if (!items.length) return null;
          return (
            <div key={g.group} className="mt-5 first:mt-2">
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-line-strong" aria-hidden />
              ) : (
                <p className="text-label mb-2 px-4 text-ink-3">{g.group}</p>
              )}
              <ul className="space-y-1">
                {items.map((it) => {
                  const label = navLabel(it, user?.role);
                  const link = (
                    <NavLink
                      to={it.to}
                      end={it.to === "/"}
                      onClick={onNavigate}
                      aria-label={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        cx(
                          "group relative flex h-11 items-center gap-3 rounded-full text-[15px] transition-colors duration-[120ms] ease-brand",
                          collapsed ? "justify-center" : "px-4",
                          isActive ? "font-medium text-ink" : "text-ink-2 hover:bg-sidebar-hover hover:text-ink active:bg-sidebar-pressed",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              className={cx("absolute top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary", collapsed ? "-left-3" : "-left-4")}
                              aria-hidden
                            />
                          )}
                          <it.icon className="size-5 shrink-0" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.18 : 0} aria-hidden />
                          {!collapsed && <span className="truncate">{label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                  return <li key={it.to}>{collapsed ? <Tooltip label={label}>{link}</Tooltip> : link}</li>;
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <UserCard collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}

/** Signed-in user at the foot of the sidebar, with the account menu. */
function UserCard({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const navigate = useNavigate();
  if (!user) return null;
  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    onNavigate?.();
  };
  return (
    <div ref={ref} className={cx("relative shrink-0 border-t border-line-strong py-5", collapsed ? "px-3" : "mx-8 px-0")}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className={cx("flex w-full items-center gap-3 rounded-full text-left hover:bg-sidebar-hover cursor-pointer", collapsed ? "justify-center p-1" : "-mx-2 w-[calc(100%+16px)] p-2")}
      >
        <Avatar name={user.name} size={10} online />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold">{user.name}</span>
              <span className="block truncate text-[13px] text-ink-3 capitalize">{user.role === "manager" ? "Marina manager" : user.role}</span>
            </span>
            <EllipsisVertical className="size-5 text-ink-2" aria-hidden />
          </>
        )}
      </button>
      {open && (
        <div className={cx("absolute bottom-full z-40 mb-2 w-60 overflow-hidden rounded-[16px] border border-line bg-raised py-2 shadow-e2 animate-fade", collapsed ? "left-3" : "left-0")}>
          <div className="border-b border-line px-4 pt-1 pb-3">
            <p className="truncate text-[13px] font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer" onClick={() => go("/settings")}>
            <Settings className="size-5" aria-hidden /> Settings
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer" onClick={() => { signOut(); navigate("/login"); }}>
            <LogOut className="size-5" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const { db, ix, scope } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const navigate = useNavigate();
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const inScope = new Set(scope);
    const out: { label: string; sub: string; to: string; kind: string }[] = [];
    for (const m of db.marinas)
      if (inScope.has(m.id) && m.name.toLowerCase().includes(s)) out.push({ kind: "Marina", label: m.name, sub: ix.city(m.cityId)?.name ?? "", to: `/marinas/${m.id}` });
    for (const o of db.owners) {
      if (out.length > 6) break;
      const boats = db.boats.filter((b) => b.ownerId === o.id);
      if (o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s) || boats.some((b) => b.name.toLowerCase().includes(s)))
        out.push({ kind: "Owner", label: o.name, sub: boats.map((b) => b.name).join(", "), to: `/users?owner=${o.id}` });
    }
    for (const st of db.staff) {
      if (inScope.has(st.marinaId) && st.name.toLowerCase().includes(s))
        out.push({ kind: "Staff", label: st.name, sub: `${st.position} · ${ix.marina(st.marinaId)?.name}`, to: `/staff?q=${encodeURIComponent(st.name)}` });
    }
    for (const bk of db.bookings) {
      if (out.length > 12) break;
      const boat = ix.boat(bk.boatId);
      const owner = boat && ix.owner(boat.ownerId);
      const marinaId = ix.berth(bk.berthId)?.marinaId ?? "";
      if (!inScope.has(marinaId)) continue;
      if (bk.code.toLowerCase().includes(s) || boat?.name.toLowerCase().includes(s) || owner?.name.toLowerCase().includes(s))
        out.push({ kind: "Booking", label: `${bk.code} · ${boat?.name}`, sub: owner?.name ?? "", to: `/bookings?q=${encodeURIComponent(bk.code)}` });
    }
    return out.slice(0, 10);
  }, [q, db, ix, scope]);

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-0 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search…"
        aria-label="Search marinas, bookings, owners and staff (press /)"
        className="h-10 w-full border-0 border-b border-line bg-transparent pr-10 pl-8 text-[15px] placeholder:text-ink-3 hover:border-line-hover focus:border-focus focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-0 hidden -translate-y-1/2 rounded-sm border border-line px-1.5 text-xs text-ink-3 sm:block">/</kbd>
      {open && q.trim().length >= 2 && (
        <div className="absolute top-12 left-0 z-40 w-full min-w-72 overflow-hidden rounded-[16px] border border-line bg-raised shadow-e2 animate-fade">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-3">No matches for “{q}”</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-sidebar cursor-pointer"
                    onClick={() => {
                      navigate(r.to);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{r.label}</span>
                      <span className="block truncate text-xs text-ink-3">{r.sub}</span>
                    </span>
                    <span className="text-label text-ink-3">{r.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { db, ix, scope, user, update } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const navigate = useNavigate();
  const items = useMemo(() => buildNotifications(db, ix, scope, user?.role === "admin"), [db, ix, scope, user]);
  const read = new Set(db.readNotifications);
  const unread = items.filter((n) => !read.has(n.id)).length;
  const markRead = (ids: string[]) => update((d) => ({ ...d, readNotifications: [...new Set([...d.readNotifications, ...ids])] }));
  return (
    <div ref={ref} className="relative">
      <Tooltip label="Notifications">
        <button
          aria-label={`Notifications, ${unread} unread`}
          onClick={() => setOpen((o) => !o)}
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer"
        >
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span className="num absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-green px-1 text-[10px] font-semibold text-white">{unread}</span>
          )}
        </button>
      </Tooltip>
      {open && (
        <div className="absolute top-12 right-0 z-40 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[16px] border border-line bg-raised shadow-e2 animate-fade">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-[18px] leading-[26px] font-medium">Notifications</p>
            {unread > 0 && (
              <button className="text-[13px] font-semibold text-green-text hover:underline cursor-pointer" onClick={() => markRead(items.map((n) => n.id))}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <button
                    className="flex w-full gap-3 px-5 py-3.5 text-left hover:bg-sidebar cursor-pointer"
                    onClick={() => {
                      markRead([n.id]);
                      navigate(n.to);
                      setOpen(false);
                    }}
                  >
                    <span className={cx("mt-2 size-2 shrink-0 rounded-full", read.has(n.id) ? "bg-transparent" : "bg-green")} aria-hidden />
                    <span className="min-w-0">
                      <span className={cx("block text-sm", !read.has(n.id) ? "font-semibold text-ink" : "text-ink-2")}>{n.title}</span>
                      <span className="block text-xs text-ink-3">{n.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-5 py-3 text-right">
            <button className="text-[13px] font-medium text-ink-2 hover:text-ink cursor-pointer" onClick={() => { navigate("/settings"); setOpen(false); }}>Notification settings</button>
          </div>
        </div>
      )}
    </div>
  );
}

function useCrumbs() {
  const { pathname } = useLocation();
  const { db, user } = useStore();
  const item = NAV.flatMap((g) => g.items).find((i) => (i.to === "/" ? pathname === "/" : pathname.startsWith(i.to)));
  const crumbs: { label: string; to?: string }[] = [];
  if (item) crumbs.push({ label: navLabel(item, user?.role), to: item.to });
  const marinaMatch = pathname.match(/^\/marinas\/([^/]+)/);
  if (marinaMatch) crumbs.push({ label: db.marinas.find((m) => m.id === marinaMatch[1])?.name ?? "Marina" });
  const placeMatch = pathname.match(/^\/(city|county)\/([^/]+)/);
  if (placeMatch) crumbs.push({ label: (placeMatch[1] === "city" ? db.cities : db.counties).find((c) => c.id === placeMatch[2])?.name ?? "" });
  return crumbs;
}

function Breadcrumb() {
  const crumbs = useCrumbs();
  const { can } = useStore();
  const { pathname } = useLocation();
  const viewOnly = can(areaForPath(pathname)) === "view";
  useEffect(() => {
    document.title = [crumbs[crumbs.length - 1]?.label, "Marina"].filter(Boolean).join(" · ");
  }, [crumbs]);
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm text-ink-3 md:flex">
      <Link to="/" aria-label="Home" className="hover:text-ink">
        <House className="size-5" aria-hidden />
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden>/</span>
          {c.to && i < crumbs.length - 1 ? (
            <Link to={c.to} className="truncate hover:text-ink">{c.label}</Link>
          ) : (
            <span className="truncate font-semibold text-ink" aria-current="page">{c.label}</span>
          )}
        </span>
      ))}
      {viewOnly && <Badge tone="info" icon={Eye}>View only</Badge>}
    </nav>
  );
}

const SHORTCUTS: [string, string][] = [
  ["/", "Search"],
  ["N", "New booking"],
  ["G then D", "Go to overview"],
  ["G then B", "Go to bookings"],
  ["G then I", "Go to billing (invoices)"],
  ["?", "Show this list"],
  ["Esc", "Close a dialog or menu"],
];

/** Keyboard shortcuts for frequent tasks. Ignored while typing in a field. */
function useShortcuts(openHelp: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]") || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (pendingG && Date.now() - pendingG < 1200) {
        pendingG = 0;
        const to = { d: "/", b: "/bookings", i: "/billing" }[k];
        if (to) { e.preventDefault(); navigate(to); }
        return;
      }
      if (k === "g") pendingG = Date.now();
      else if (e.key === "/") { e.preventDefault(); document.getElementById("global-search")?.focus(); }
      else if (k === "n") { e.preventDefault(); navigate("/bookings?new=1"); }
      else if (e.key === "?") { e.preventDefault(); openHelp(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, openHelp]);
}

const TOAST_ICON: Record<ToastKind, { icon: LucideIcon; cls: string }> = {
  success: { icon: CircleCheck, cls: "text-success" },
  info: { icon: Info, cls: "text-secondary" },
  warning: { icon: TriangleAlert, cls: "text-warning" },
  error: { icon: CircleAlert, cls: "text-error" },
  celebrate: { icon: Sparkles, cls: "text-accent-strong" },
};

export default function Layout() {
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useTheme();
  const [collapsed, toggleCollapsed] = useCollapsed();
  const { toasts } = useStore();
  const [help, setHelp] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  useShortcuts(openHelp);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-full bg-bg">
      {/* 05 Breakpoints: tablet = icon sidebar, laptop+ = expanded (user can collapse) */}
      <aside className={cx("hidden shrink-0 bg-sidebar transition-[width] duration-[320ms] ease-brand md:block", collapsed ? "w-[72px]" : "w-[72px] lg:w-[280px]")}>
        <div className="h-full lg:hidden">
          <Sidebar collapsed />
        </div>
        <div className="hidden h-full lg:block">
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="relative h-full w-[280px] max-w-[85vw] bg-sidebar shadow-e3 animate-in">
            <IconButton icon={X} label="Close menu" onClick={() => setDrawer(false)} className="absolute top-6 right-3 z-10" />
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-4 md:px-8">
          <IconButton look="outline" icon={Menu} label="Open menu" onClick={() => setDrawer(true)} className="md:hidden" />
          <Breadcrumb />
          <div className="flex flex-1 justify-end">
            <GlobalSearch />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <IconButton look="outline" icon={Keyboard} label="Keyboard shortcuts (?)" onClick={openHelp} className="max-lg:hidden" />
            <Notifications />
            <IconButton
              look="outline"
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
          </div>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-12 md:px-8 lg:pt-10">
            <Outlet />
          </div>
        </main>
      </div>

      <Welcome />

      <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
        <dl className="divide-y divide-line text-sm">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between py-3">
              <dt className="text-ink-2">{d}</dt>
              <dd><kbd className="num rounded-sm border border-line-strong bg-sidebar px-2 py-0.5 text-xs font-medium">{k}</kbd></dd>
            </div>
          ))}
        </dl>
      </Modal>

      {/* 07 Toasts: bottom right, white card with border and a colored leading icon per state */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2 md:right-6 md:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, cls } = TOAST_ICON[t.kind];
          return (
            <div key={t.id} className={cx("pointer-events-auto flex max-w-md items-center gap-3 rounded-[16px] border border-line bg-raised px-4 py-3 text-sm text-ink shadow-e2 animate-in", t.kind === "celebrate" && "glow-accent border-accent")}>
              <Icon className={cx("size-5 shrink-0", cls)} aria-hidden />
              <span className="min-w-0">{t.message}</span>
              {t.undo && (
                <button onClick={t.undo} className="ml-1 shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold text-green-text hover:bg-success-bg cursor-pointer">
                  Undo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
