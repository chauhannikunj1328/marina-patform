// Staff app screens: Today, Bookings, Berths, Tasks and Me. Phone-first, large touch targets,
// one primary action per card. Data and permissions are shared with the admin web app.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera, CalendarClock, ChevronRight, CircleCheck, Download, Image as ImageIcon, LogIn, LogOut, Mail, Moon, Phone, Plus, Sailboat, Search, Sun, TriangleAlert, Wrench, X,
} from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { BerthStatus } from "@/data/selectors";
import type { Berth, Booking, BookingStatus, MaintenanceTask, Priority } from "@/data/types";
import { DAYS, SHIFT_HOURS } from "@/data/shifts";
import { addDays, daysBetween, fmtDate, fmtShort, fromISO, relative, today } from "@/lib/date";
import { cx } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { canInstall, isInstalled, isIOS, onInstallChange, promptInstall } from "@/lib/install";
import { Avatar, Badge, Button, EmptyState, Field, Modal, Select, Textarea } from "@/components/ui";
import { BerthBadge, BookingBadge, PriorityBadge, TaskBadge, berthLabel } from "@/components/status";
import { useStaff } from "./StaffLayout";

// ---- shared pieces ---------------------------------------------------------

function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[18px] leading-[26px] font-medium">
          {title}
          {count !== undefined && <span className="num ml-2 rounded-full bg-surface-3 px-2 py-0.5 align-middle text-xs font-semibold text-ink-2">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 rounded-full bg-surface-3 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx("flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer", value === it.value ? "bg-surface text-ink shadow-e1" : "text-ink-3")}
        >
          {it.label}
          {it.count !== undefined && <span className="num text-xs font-medium text-ink-3">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-11 text-[15px] placeholder:text-ink-3 focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus"
      />
    </div>
  );
}

const cardCls = "block w-full rounded-[16px] border border-line bg-surface p-4 text-left transition-colors active:bg-sidebar";

/** Check in / check out with Undo and an activity log entry. */
function useBookingStatus() {
  const { db, ix, update, toast } = useStore();
  return (bk: Booking, status: BookingStatus) => {
    const boat = ix.boat(bk.boatId);
    const before = db;
    const msg = status === "checked-in" ? `${boat?.name} checked in` : `${boat?.name} checked out`;
    update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bk.id ? { ...x, status } : x)) }), { text: `${msg} (${bk.code})`, to: `/bookings?q=${bk.code}`, marinaId: ix.berth(bk.berthId)?.marinaId });
    toast(msg, before);
  };
}

function BookingCard({ bk, onOpen, action }: { bk: Booking; onOpen: () => void; action?: ReactNode }) {
  const { ix } = useStore();
  const boat = ix.boat(bk.boatId);
  return (
    <div className={cx(cardCls, "flex items-center gap-3")}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-3">
          <Sailboat className="size-5 text-ink-2" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{boat?.name}</span>
          <span className="block truncate text-[13px] text-ink-3">
            Berth {ix.berth(bk.berthId)?.code} · {ix.ownerOfBooking(bk)?.name}
          </span>
        </span>
      </button>
      {action ?? <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />}
    </div>
  );
}

function BookingSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, can } = useStore();
  const setStatus = useBookingStatus();
  const b = db.bookings.find((x) => x.id === booking.id) ?? booking;
  const boat = ix.boat(b.boatId);
  const owner = ix.ownerOfBooking(b);
  const berth = ix.berth(b.berthId);
  const now = today();
  const canEdit = can("bookings") !== "view";
  const canCheckIn = canEdit && b.status === "confirmed" && b.start <= now;
  const canCheckOut = canEdit && b.status === "checked-in";
  return (
    <Modal
      open
      onClose={onClose}
      title={boat?.name ?? "Booking"}
      description={`${b.code} · Berth ${berth?.code}`}
      footer={
        canCheckIn ? (
          <Button variant="primary" icon={LogIn} className="h-12 w-full" onClick={() => { setStatus(b, "checked-in"); onClose(); }}>Check in</Button>
        ) : canCheckOut ? (
          <Button variant="primary" icon={LogOut} className="h-12 w-full" onClick={() => { setStatus(b, "completed"); onClose(); }}>Check out</Button>
        ) : (
          <Button className="h-12 w-full" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="mb-4"><BookingBadge status={b.status} /></div>
      <dl className="space-y-3 text-sm">
        <Row label="Boat" value={`${boat?.type} · ${boat?.length} ft`} sub={boat?.registration} />
        <Row label="Dates" value={`${fmtShort(b.start)} – ${fmtShort(b.end)}`} sub={`${daysBetween(b.start, b.end)} nights · ${b.guests} guests`} />
        <Row label="Berth" value={`${berth?.code} · up to ${berth?.maxLength} ft`} sub={`${berth?.type}${berth?.power ? " · power" : ""}${berth?.water ? " · water" : ""}`} />
        <Row label="Boat owner" value={owner?.name ?? ""} sub={owner?.email} />
      </dl>
      {b.status === "pending" && <p className="mt-4 rounded-[12px] bg-st-pending-bg px-3.5 py-2.5 text-[13px] text-st-pending-fg">Waiting for a manager to approve this booking.</p>}
      {owner && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {owner.phone ? (
            <a href={`tel:${owner.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold hover:bg-sidebar">
              <Phone className="size-4" aria-hidden /> Call
            </a>
          ) : (
            <span className="inline-flex h-12 items-center justify-center rounded-full border border-line text-sm text-ink-3">No phone</span>
          )}
          <a href={`mailto:${owner.email}?subject=${encodeURIComponent(`Your stay at ${ix.marinaOfBerth(b.berthId)?.name}`)}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold hover:bg-sidebar">
            <Mail className="size-4" aria-hidden /> Email
          </a>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right">
        <span className="font-medium">{value}</span>
        {sub && <span className="block text-xs text-ink-3">{sub}</span>}
      </dd>
    </div>
  );
}

// ---- Today -----------------------------------------------------------------

export function StaffToday() {
  const { db, ix, user, can } = useStore();
  const { me, marinaId } = useStaff();
  const setStatus = useBookingStatus();
  const [open, setOpen] = useState<Booking | undefined>();
  const now = today();
  const all = ix.bookingsIn([marinaId]);
  const arrivals = all.filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending" || b.status === "checked-in"));
  const departures = all.filter((b) => b.end === now && b.status === "checked-in");
  const late = all.filter((b) => b.end < now && b.status === "checked-in");
  const myTasks = db.tasks.filter((t) => t.assigneeId === me?.id && t.status !== "done");
  const urgent = db.tasks.filter((t) => t.marinaId === marinaId && t.priority === "high" && t.status !== "done");
  const dayIdx = fromISO(now).getDay();
  const working = me && me.status === "active" && !me.daysOff.includes(dayIdx);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canBook = can("bookings") !== "view";
  const m = ix.metrics([marinaId]);

  return (
    <>
      <p className="text-[13px] text-ink-3">{fmtDate(now)}</p>
      <h1 className="mt-0.5 text-[26px] leading-[34px] font-medium">{greeting}, {user?.name.split(" ")[0]}</h1>

      <div className={cx("mt-4 mb-6 rounded-[16px] p-4", working ? "bg-promo text-ink" : "border border-line bg-surface")}>
        {me ? (
          working ? (
            <p className="text-[15px]"><span className="font-semibold">{me.shift} shift</span> · {SHIFT_HOURS[me.shift]}<span className="block text-[13px] text-ink-2">{ix.marina(me.marinaId)?.name} · {me.position}</span></p>
          ) : (
            <p className="text-[15px]"><span className="font-semibold">{me.status === "on-leave" ? "You're on leave" : "Day off today"}</span><span className="block text-[13px] text-ink-3">Enjoy it. Your next shift is on the Me tab.</span></p>
          )
        ) : (
          <p className="text-[13px] text-ink-3">No shift schedule linked to your account.</p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { label: "Arriving", value: arrivals.filter((b) => b.status !== "checked-in").length },
          { label: "Leaving", value: departures.length + late.length },
          { label: "My tasks", value: myTasks.length, to: "/app/tasks" },
        ].map((s) => {
          const body = (
            <>
              <span className="num block text-[28px] leading-9 font-semibold">{s.value}</span>
              <span className="text-xs text-ink-3">{s.label}</span>
            </>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className="rounded-[16px] border border-line bg-surface p-3 text-center active:bg-sidebar">{body}</Link>
          ) : (
            <div key={s.label} className="rounded-[16px] border border-line bg-surface p-3 text-center">{body}</div>
          );
        })}
      </div>

      {late.length > 0 && (
        <Section title="Past departure date" count={late.length}>
          <div className="space-y-2">
            {late.map((b) => (
              <BookingCard key={b.id} bk={b} onOpen={() => setOpen(b)} action={canBook && <Button size="sm" onClick={() => setStatus(b, "completed")}>Check out</Button>} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Arriving today" count={arrivals.length}>
        {arrivals.length === 0 ? (
          <EmptyState icon={LogIn} title="No arrivals today" />
        ) : (
          <div className="space-y-2">
            {arrivals.map((b) => (
              <BookingCard
                key={b.id}
                bk={b}
                onOpen={() => setOpen(b)}
                action={
                  b.status === "checked-in" ? <Badge tone="success" icon={CircleCheck}>In</Badge>
                  : b.status === "pending" ? <Badge tone="pending">Pending</Badge>
                  : canBook && <Button size="sm" variant="primary" onClick={() => setStatus(b, "checked-in")}>Check in</Button>
                }
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Leaving today" count={departures.length}>
        {departures.length === 0 ? (
          <EmptyState icon={LogOut} title="No departures left today" />
        ) : (
          <div className="space-y-2">
            {departures.map((b) => (
              <BookingCard key={b.id} bk={b} onOpen={() => setOpen(b)} action={canBook && <Button size="sm" onClick={() => setStatus(b, "completed")}>Check out</Button>} />
            ))}
          </div>
        )}
      </Section>

      {urgent.length > 0 && (
        <Section title="Urgent repairs" count={urgent.length} action={<Link to="/app/tasks" className="text-[13px] font-semibold text-green-text">All tasks</Link>}>
          <div className="space-y-2">
            {urgent.slice(0, 3).map((t) => (
              <Link key={t.id} to={`/app/tasks?open=${t.id}`} className={cx(cardCls, "flex items-center gap-3")}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-st-maint-bg">
                  <Wrench className="size-5 text-st-maint-fg" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{t.title}</span>
                  <span className="block text-[13px] text-ink-3">{t.berthId ? `Berth ${ix.berth(t.berthId)?.code}` : "Facility"} · due {relative(t.due).toLowerCase()}</span>
                </span>
                <ChevronRight className="size-5 text-ink-3" aria-hidden />
              </Link>
            ))}
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-ink-3">
        {m.occupied} of {m.berths} berths occupied · {m.available} free
      </p>
      {open && <BookingSheet booking={open} onClose={() => setOpen(undefined)} />}
    </>
  );
}

// ---- Bookings --------------------------------------------------------------

export function StaffBookings() {
  const { ix } = useStore();
  const { marinaId } = useStaff();
  const [view, setView] = useState<"today" | "upcoming" | "in">("today");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Booking | undefined>();
  const now = today();
  const all = ix.bookingsIn([marinaId]).filter((b) => b.status !== "cancelled");
  const lists = {
    today: all.filter((b) => (b.start === now || b.end === now) && b.status !== "completed").sort((a, b) => a.start.localeCompare(b.start)),
    upcoming: all.filter((b) => b.start > now && (b.status === "confirmed" || b.status === "pending")).sort((a, b) => a.start.localeCompare(b.start)),
    in: all.filter((b) => b.status === "checked-in").sort((a, b) => a.end.localeCompare(b.end)),
  };
  const s = q.trim().toLowerCase();
  const rows = (s
    ? all.filter((b) => b.code.toLowerCase().includes(s) || ix.boat(b.boatId)?.name.toLowerCase().includes(s) || ix.ownerOfBooking(b)?.name.toLowerCase().includes(s) || ix.berth(b.berthId)?.code.toLowerCase().includes(s))
    : lists[view]
  ).slice(0, 60);

  return (
    <>
      <h1 className="mb-4 text-[26px] leading-[34px] font-medium">Bookings</h1>
      <SearchBox value={q} onChange={setQ} placeholder="Boat, owner, berth or code" />
      {!s && (
        <Segmented
          value={view}
          onChange={setView}
          items={[
            { value: "today", label: "Today", count: lists.today.length },
            { value: "upcoming", label: "Upcoming", count: lists.upcoming.length },
            { value: "in", label: "In marina", count: lists.in.length },
          ]}
        />
      )}
      {rows.length === 0 ? (
        <EmptyState icon={s ? Search : CalendarClock} title={s ? `Nothing matches “${q}”` : "Nothing here"} body={s ? "Try a boat name, owner or berth number." : undefined} />
      ) : (
        <div className="space-y-2">
          {rows.map((b) => (
            <button key={b.id} onClick={() => setOpen(b)} className={cx(cardCls, "cursor-pointer")}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{ix.boat(b.boatId)?.name}</span>
                  <span className="block truncate text-[13px] text-ink-3">Berth {ix.berth(b.berthId)?.code} · {ix.ownerOfBooking(b)?.name}</span>
                </span>
                <BookingBadge status={b.status} />
              </span>
              <span className="num mt-2 block text-[13px] text-ink-2">{fmtShort(b.start)} – {fmtShort(b.end)} · {daysBetween(b.start, b.end)} nights</span>
            </button>
          ))}
        </div>
      )}
      {open && <BookingSheet booking={open} onClose={() => setOpen(undefined)} />}
    </>
  );
}

// ---- Berths ----------------------------------------------------------------

const BERTH_FILL: Record<BerthStatus, string> = {
  occupied: "bg-teal-strong text-on-teal-strong border-transparent",
  reserved: "bg-teal-soft text-on-teal-soft border-transparent",
  available: "bg-surface text-ink border-line-strong",
  maintenance: "bg-st-maint-bg text-st-maint-fg border-dashed border-st-maint-fg",
};

export function StaffBerths() {
  const { db, ix } = useStore();
  const { marinaId } = useStaff();
  const [filter, setFilter] = useState<"all" | BerthStatus>("all");
  const [open, setOpen] = useState<Berth | undefined>();
  const [reportFor, setReportFor] = useState<string | undefined>();
  const berths = db.berths.filter((b) => b.marinaId === marinaId).map((b) => ({ b, st: ix.berthStatus(b) }));
  const counts = (s: BerthStatus) => berths.filter((x) => x.st === s).length;
  const shown = berths.filter((x) => filter === "all" || x.st === filter);
  const docks = new Map<string, typeof shown>();
  shown.forEach((x) => docks.set(x.b.code.split("-")[0], [...(docks.get(x.b.code.split("-")[0]) ?? []), x]));

  return (
    <>
      <h1 className="mb-4 text-[26px] leading-[34px] font-medium">Berths</h1>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {(["available", "occupied", "reserved", "maintenance"] as BerthStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            aria-pressed={filter === s}
            className={cx("rounded-[12px] border p-2 text-center cursor-pointer", filter === s ? "border-primary ring-1 ring-primary" : "border-line bg-surface")}
          >
            <span className="num block text-[20px] font-semibold">{counts(s)}</span>
            <span className="block truncate text-[11px] text-ink-3">{s === "maintenance" ? "Repair" : berthLabel[s]}</span>
          </button>
        ))}
      </div>
      {[...docks.entries()].map(([dock, list]) => (
        <section key={dock} className="mb-5">
          <h2 className="text-label mb-2 text-ink-3">Dock {dock}</h2>
          <div className="grid grid-cols-4 gap-2">
            {list.map(({ b, st }) => (
              <button
                key={b.id}
                onClick={() => setOpen(b)}
                aria-label={`Berth ${b.code}, ${b.maxLength} feet, ${berthLabel[st]}`}
                className={cx("num flex h-16 flex-col items-center justify-center rounded-[12px] border text-[15px] font-semibold active:scale-95 cursor-pointer transition-transform", BERTH_FILL[st])}
              >
                {b.code.split("-")[1]}
                <span className="text-[11px] font-medium opacity-75">{b.maxLength} ft</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {shown.length === 0 && <EmptyState title="No berths with this status" />}
      {open && <BerthSheet berth={open} onClose={() => setOpen(undefined)} onReport={() => { setReportFor(open.id); setOpen(undefined); }} />}
      {reportFor && <ReportProblem berthId={reportFor} onClose={() => setReportFor(undefined)} />}
    </>
  );
}

function BerthSheet({ berth, onClose, onReport }: { berth: Berth; onClose: () => void; onReport: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const b = db.berths.find((x) => x.id === berth.id) ?? berth;
  const status = ix.berthStatus(b);
  const current = ix.currentBooking(b.id);
  const next = ix.nextBooking(b.id);
  const tasks = db.tasks.filter((t) => t.berthId === b.id && t.status !== "done");
  const canEdit = can("berths") !== "view";
  const canReport = can("maintenance") !== "view";
  const toggle = () => {
    if (!b.underMaintenance && current) return toast("A boat is in this berth. Check it out or move it first.", undefined, "warning");
    const before = db;
    update((d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }), { text: `Berth ${b.code} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId });
    toast(b.underMaintenance ? `Berth ${b.code} back in service` : `Berth ${b.code} out of service`, before);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Berth ${b.code}`}
      description={`${b.maxLength} ft · ${b.type}${b.power ? " · power" : ""}${b.water ? " · water" : ""}`}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          {canEdit ? <Button className="h-12" onClick={toggle}>{b.underMaintenance ? "Back in service" : "Out of service"}</Button> : <Button className="h-12" onClick={onClose}>Close</Button>}
          {canReport && <Button variant="primary" icon={TriangleAlert} className="h-12" onClick={onReport}>Report problem</Button>}
        </div>
      }
    >
      <div className="mb-4"><BerthBadge status={status} /></div>
      <dl className="space-y-3 text-sm">
        {current && <Row label="Boat here now" value={ix.boat(current.boatId)?.name ?? ""} sub={`Leaves ${fmtShort(current.end)} · ${ix.ownerOfBooking(current)?.name}`} />}
        <Row label="Next arrival" value={next ? fmtShort(next.start) : "None booked"} sub={next ? `${ix.boat(next.boatId)?.name} · ${relative(next.start).toLowerCase()}` : undefined} />
        <Row label="Open repairs" value={tasks.length ? `${tasks.length}` : "None"} sub={tasks.map((t) => t.title).join(", ") || undefined} />
      </dl>
    </Modal>
  );
}

// ---- Tasks -----------------------------------------------------------------

function ReportProblem({ berthId, onClose }: { berthId?: string; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const { marinaId, me } = useStaff();
  const [f, setF] = useState({ title: "", berthId: berthId ?? "", priority: "medium" as Priority, takeOut: false });
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = () => {
    if (!f.title.trim()) return setError("Say what's wrong.");
    update((d) => {
      const task: MaintenanceTask = {
        id: nextId("t", d.tasks), code: `WO-${String(d.tasks.length + 1).padStart(3, "0")}`, title: f.title.trim(), marinaId, berthId: f.berthId || undefined,
        assigneeId: undefined, priority: f.priority, status: "open", created: today(), due: addDays(today(), f.priority === "high" ? 1 : 7),
        notes: [{ at: today(), by: me?.name ?? "Staff", text: "Reported from the staff app." }], photos,
      };
      const berths = f.takeOut && f.berthId ? d.berths.map((b) => (b.id === f.berthId ? { ...b, underMaintenance: true } : b)) : d.berths;
      return { ...d, tasks: [...d.tasks, task], berths };
    }, { text: `Reported a problem: ${f.title.trim()}`, to: "/maintenance", marinaId });
    toast("Problem reported. Your manager can see it now.");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Report a problem" description="It goes straight to the marina's work orders." footer={<Button variant="primary" className="h-12 w-full" onClick={save}>Send report</Button>}>
      <div className="space-y-4">
        <Field label="What's wrong?" error={error}>{(id) => <Textarea id={id} value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setError(""); }} placeholder="e.g. Power pedestal sparks when plugged in" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Berth">{(id) => <Select id={id} value={f.berthId} onChange={(e) => setF({ ...f, berthId: e.target.value })}><option value="">Not a berth</option>{db.berths.filter((b) => b.marinaId === marinaId).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select>}</Field>
          <Field label="How urgent?">{(id) => <Select id={id} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">Urgent</option></Select>}</Field>
        </div>
        <PhotoPicker photos={photos} onChange={setPhotos} />
        {f.berthId && (
          <label className="flex items-center gap-3 rounded-[12px] border border-line p-3 text-sm">
            <input type="checkbox" checked={f.takeOut} onChange={(e) => setF({ ...f, takeOut: e.target.checked })} className="size-5 accent-[var(--primary)]" />
            Take this berth out of service
          </label>
        )}
      </div>
    </Modal>
  );
}

function PhotoPicker({ photos, onChange, max = 3 }: { photos: string[]; onChange: (p: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useStore();
  const add = async (files: FileList | null) => {
    if (!files) return;
    try {
      const next = [...photos];
      for (const f of [...files].slice(0, max - photos.length)) next.push(await compressImage(f));
      onChange(next);
    } catch {
      toast("Couldn't read that photo. Try another.", undefined, "error");
    }
  };
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium">Photos <span className="font-normal text-ink-3">(optional, up to {max})</span></p>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img src={p} alt={`Photo ${i + 1}`} className="size-20 rounded-[12px] object-cover" />
            <button onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-primary text-on-primary cursor-pointer">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button onClick={() => input.current?.click()} className="flex size-20 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-line-hover text-xs font-medium text-ink-2 hover:bg-sidebar cursor-pointer">
            <Camera className="size-5" aria-hidden /> Add
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function TaskSheet({ task, onClose }: { task: MaintenanceTask; onClose: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const { me } = useStaff();
  const t = db.tasks.find((x) => x.id === task.id) ?? task;
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const canEdit = can("maintenance") !== "view";
  const log = (text: string) => ({ text: `${text} (${t.code})`, to: `/maintenance?open=${t.id}`, marinaId: t.marinaId });
  const setStatus = (status: MaintenanceTask["status"]) => {
    const before = db;
    update(
      (d) => ({
        ...d,
        tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status, assigneeId: x.assigneeId ?? me?.id } : x)),
        // Finishing the last open job on a berth puts it back in service.
        berths: status === "done" ? d.berths.map((b) => (b.id === t.berthId && !d.tasks.some((x) => x.id !== t.id && x.berthId === b.id && x.status !== "done") ? { ...b, underMaintenance: false } : b)) : d.berths,
      }),
      log(status === "done" ? `Finished: ${t.title}` : `Started: ${t.title}`),
    );
    toast(status === "done" ? "Marked as done" : "Started. It's now assigned to you.", before);
  };
  const addUpdate = () => {
    if (!note.trim() && photos.length === 0) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, notes: note.trim() ? [...x.notes, { at: today(), by: me?.name ?? "Staff", text: note.trim() }] : x.notes, photos: [...(x.photos ?? []), ...photos].slice(-6) } : x)),
    }), log("Added an update"));
    setNote("");
    setPhotos([]);
    toast("Update added");
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t.title}
      description={`${t.code} · ${t.berthId ? `Berth ${ix.berth(t.berthId)?.code}` : "Facility"}`}
      footer={
        canEdit && t.status !== "done" ? (
          t.status === "open" ? (
            <Button variant="primary" className="h-12 w-full" onClick={() => setStatus("in-progress")}>Start work</Button>
          ) : (
            <Button variant="primary" icon={CircleCheck} className="h-12 w-full" onClick={() => { setStatus("done"); onClose(); }}>Mark as done</Button>
          )
        ) : (
          <Button className="h-12 w-full" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="mb-4 flex flex-wrap gap-2"><TaskBadge status={t.status} /><PriorityBadge priority={t.priority} /></div>
      <p className="mb-4 text-[13px] text-ink-3">Due {fmtDate(t.due)} · {t.assigneeId ? `Assigned to ${ix.staffMember(t.assigneeId)?.name}` : "Unassigned"}</p>
      {(t.photos?.length ?? 0) > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {t.photos!.map((p, i) => <img key={i} src={p} alt={`Task photo ${i + 1}`} className="size-24 shrink-0 rounded-[12px] object-cover" />)}
        </div>
      )}
      {t.notes.length > 0 && (
        <ol className="mb-4 space-y-3 border-l-2 border-line pl-4">
          {t.notes.map((n, i) => (
            <li key={i} className="text-sm">{n.text}<span className="block text-xs text-ink-3">{n.by} · {fmtShort(n.at)}</span></li>
          ))}
        </ol>
      )}
      {canEdit && (
        <div className="space-y-3 rounded-[16px] border border-line p-3">
          <Textarea aria-label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="min-h-16" />
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <Button size="sm" onClick={addUpdate} disabled={!note.trim() && photos.length === 0}>Add update</Button>
        </div>
      )}
    </Modal>
  );
}

export function StaffTasks() {
  const { db, ix, can } = useStore();
  const { me, marinaId } = useStaff();
  const [view, setView] = useState<"mine" | "open" | "done">("mine");
  const [reporting, setReporting] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const [open, setOpen] = useState<MaintenanceTask | undefined>(() => db.tasks.find((t) => t.id === params.get("open")));
  const atMarina = db.tasks.filter((t) => t.marinaId === marinaId);
  const lists = {
    mine: db.tasks.filter((t) => t.assigneeId === me?.id && t.status !== "done"),
    open: atMarina.filter((t) => t.status !== "done"),
    done: atMarina.filter((t) => t.status === "done").sort((a, b) => b.due.localeCompare(a.due)),
  };
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const rows = view === "done" ? lists.done : [...lists[view]].sort((a, b) => order[a.priority] - order[b.priority] || a.due.localeCompare(b.due));
  const now = today();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-[26px] leading-[34px] font-medium">Tasks</h1>
        {can("maintenance") !== "view" && <Button variant="primary" size="sm" icon={Plus} onClick={() => setReporting(true)}>Report</Button>}
      </div>
      <Segmented
        value={view}
        onChange={setView}
        items={[
          { value: "mine", label: "Mine", count: lists.mine.length },
          { value: "open", label: "Open", count: lists.open.length },
          { value: "done", label: "Done", count: lists.done.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={CircleCheck} title={view === "mine" ? "Nothing assigned to you" : view === "open" ? "No open work orders" : "Nothing finished yet"} body={view === "mine" ? "Open tasks you start are assigned to you." : undefined} />
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <button key={t.id} onClick={() => setOpen(t)} className={cx(cardCls, "cursor-pointer")}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{t.title}</span>
                  <span className="block text-[13px] text-ink-3">
                    {t.berthId ? `Berth ${ix.berth(t.berthId)?.code}` : "Facility"}
                    {t.status !== "done" && ` · due ${relative(t.due).toLowerCase()}`}
                    {(t.photos?.length ?? 0) > 0 && " · "}
                    {(t.photos?.length ?? 0) > 0 && <ImageIcon className="inline size-3.5 align-[-2px]" aria-label="Has photos" />}
                  </span>
                </span>
                <PriorityBadge priority={t.priority} />
              </span>
              <span className="mt-2 flex items-center gap-2">
                <TaskBadge status={t.status} />
                {t.status !== "done" && t.due < now && <span className="text-xs font-semibold text-error-fg">Overdue</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && <TaskSheet task={open} onClose={() => setOpen(undefined)} />}
      {reporting && <ReportProblem onClose={() => setReporting(false)} />}
    </>
  );
}

// ---- Me --------------------------------------------------------------------

export function StaffMe() {
  const { ix, user, signOut } = useStore();
  const { me, marinaIds } = useStaff();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [installable, setInstallable] = useState(canInstall());
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);
  const switchTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mms.theme", next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  };
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user?.name ?? ""} size={12} online />
        <div className="min-w-0">
          <h1 className="truncate text-[22px] leading-[30px] font-medium">{user?.name}</h1>
          <p className="truncate text-[13px] text-ink-3">{me?.position ?? "Staff"} · {user?.email}</p>
        </div>
      </div>

      {me && (
        <Section title="My week">
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d, i) => {
              const off = me.status !== "active" || me.daysOff.includes(i);
              const isToday = d === today();
              return (
                <div key={d} className={cx("rounded-[12px] border py-2 text-center", isToday ? "border-primary" : "border-line", off ? "bg-surface" : "bg-teal-strong text-on-teal-strong")}>
                  <span className={cx("block text-[11px]", off ? "text-ink-3" : "opacity-80")}>{DAYS[i]}</span>
                  <span className="num block text-[15px] font-semibold">{Number(d.slice(8))}</span>
                  <span className={cx("block text-[10px]", off ? "text-ink-3" : "")}>{off ? (me.status === "on-leave" ? "Leave" : "Off") : me.shift}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[13px] text-ink-3">{me.shift} shift · {SHIFT_HOURS[me.shift]}</p>
        </Section>
      )}

      <Section title="My marinas">
        <ul className="divide-y divide-line rounded-[16px] border border-line bg-surface">
          {marinaIds.map((id) => (
            <li key={id} className="px-4 py-3 text-[15px]">{ix.marina(id)?.name}<span className="block text-[13px] text-ink-3">{ix.marina(id)?.address}, {ix.city(ix.marina(id)?.cityId ?? "")?.name}</span></li>
          ))}
        </ul>
      </Section>

      <Section title="App">
        <div className="divide-y divide-line rounded-[16px] border border-line bg-surface">
          <button onClick={switchTheme} className="flex h-14 w-full items-center justify-between px-4 text-[15px] cursor-pointer">
            <span className="flex items-center gap-3">{theme === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />} {theme === "dark" ? "Light mode" : "Dark mode"}</span>
            <ChevronRight className="size-5 text-ink-3" aria-hidden />
          </button>
          {!isInstalled() && (installable || isIOS()) && (
            <div className="px-4 py-3">
              {installable ? (
                <button onClick={() => promptInstall()} className="flex h-8 w-full items-center gap-3 text-[15px] cursor-pointer">
                  <Download className="size-5" aria-hidden /> Install Marina on this phone
                </button>
              ) : (
                <p className="text-[13px] text-ink-2"><span className="font-semibold text-ink">Install on iPhone:</span> tap Share, then “Add to Home Screen”.</p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Button className="h-12 w-full" icon={LogOut} onClick={() => { signOut(); navigate("/login"); }}>Sign out</Button>
    </>
  );
}
