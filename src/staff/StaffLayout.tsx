// Staff app shell: phone-first layout with a bottom tab bar (guide 05: mobile 0–767 px).
// On larger screens it stays a centred phone-width column on the brand canvas.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, CircleAlert, CircleCheck, ClipboardList, House, Info, Sparkles, TriangleAlert, UserRound, Warehouse, type LucideIcon } from "lucide-react";
import { useStore } from "@/data/store";
import type { Area } from "@/data/permissions";
import type { Staff } from "@/data/types";
import { cx } from "@/lib/format";
import { Logomark } from "@/components/Logo";
import { Select } from "@/components/ui";
import { OfflineBanner } from "@/components/StatusPage";

interface StaffCtx {
  /** The staff record linked to the signed-in user (matched by email). */
  me?: Staff;
  /** Marinas this person can work at. */
  marinaIds: string[];
  /** The marina currently shown. */
  marinaId: string;
  setMarinaId: (id: string) => void;
}

const Ctx = createContext<StaffCtx | null>(null);
export const useStaff = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStaff must be used inside the staff app");
  return c;
};

const TABS: { to: string; label: string; icon: LucideIcon; area?: Area }[] = [
  { to: "/app", label: "Today", icon: House },
  { to: "/app/bookings", label: "Bookings", icon: CalendarDays, area: "bookings" },
  { to: "/app/berths", label: "Berths", icon: Warehouse, area: "berths" },
  { to: "/app/tasks", label: "Tasks", icon: ClipboardList, area: "maintenance" },
  { to: "/app/me", label: "Me", icon: UserRound },
];

const MARINA_KEY = "mms.staff.marina";

const TOAST_ICON = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleAlert, celebrate: Sparkles } as const;

export default function StaffLayout() {
  const { db, ix, user, scope, can, toasts } = useStore();
  const me = useMemo(() => db.staff.find((s) => s.email.toLowerCase() === user?.email.toLowerCase()), [db.staff, user]);
  const marinaIds = scope;
  const [marinaId, setMarinaIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(MARINA_KEY);
      if (saved && marinaIds.includes(saved)) return saved;
    } catch {
      /* storage unavailable */
    }
    return me && marinaIds.includes(me.marinaId) ? me.marinaId : marinaIds[0];
  });
  const setMarinaId = (id: string) => {
    setMarinaIdState(id);
    try {
      localStorage.setItem(MARINA_KEY, id);
    } catch {
      /* storage unavailable */
    }
  };
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    const tab = TABS.find((t) => (t.to === "/app" ? pathname === "/app" : pathname.startsWith(t.to)));
    document.title = `${tab?.label ?? "Staff"} · Marina`;
  }, [pathname]);

  const tabs = TABS.filter((t) => !t.area || can(t.area) !== "none");

  return (
    <Ctx.Provider value={{ me, marinaIds, marinaId, setMarinaId }}>
      <div className="flex h-full justify-center md:bg-canvas md:py-6">
        <div className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-bg md:rounded-[20px] md:shadow-e3">
          <OfflineBanner />
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 pt-[env(safe-area-inset-top)]">
            <Logomark size={20} />
            <div className="min-w-0 flex-1">
              {marinaIds.length > 1 ? (
                <Select look="plain" aria-label="Marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="-ml-2 max-w-full truncate !text-[15px]">
                  {marinaIds.map((id) => (
                    <option key={id} value={id}>{ix.marina(id)?.name}</option>
                  ))}
                </Select>
              ) : (
                <p className="truncate text-[15px] font-semibold">{ix.marina(marinaId)?.name}</p>
              )}
            </div>
          </header>

          <main ref={mainRef} className="flex-1 overflow-y-auto px-4 pt-5 pb-6">
            <Outlet />
          </main>

          {/* Bottom tab bar: 5 items max, 44 px+ targets, filled icon on the active tab */}
          <nav aria-label="Staff app" className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
            <ul className="flex">
              {tabs.map((t) => (
                <li key={t.to} className="flex-1">
                  <NavLink
                    to={t.to}
                    end={t.to === "/app"}
                    className={({ isActive }) =>
                      cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", isActive ? "text-ink" : "text-ink-3 hover:text-ink")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-sidebar")}>
                          <t.icon className="size-5" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.18 : 0} aria-hidden />
                        </span>
                        {t.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Toasts sit above the tab bar */}
          <div className="pointer-events-none absolute inset-x-3 bottom-20 z-[60] flex flex-col gap-2" aria-live="polite">
            {toasts.map((t) => {
              const Icon = TOAST_ICON[t.kind];
              return (
                <div key={t.id} className={cx("pointer-events-auto flex items-center gap-3 rounded-[16px] border border-line bg-raised px-4 py-3 text-sm shadow-e2 animate-in", t.kind === "celebrate" && "glow-accent border-accent")}>
                  <Icon className={cx("size-5 shrink-0", t.kind === "warning" ? "text-warning" : t.kind === "error" ? "text-error" : t.kind === "celebrate" ? "text-accent-strong" : "text-success")} aria-hidden />
                  <span className="min-w-0 flex-1">{t.message}</span>
                  {t.undo && (
                    <button onClick={t.undo} className="shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold text-green-text hover:bg-success-bg cursor-pointer">
                      Undo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
