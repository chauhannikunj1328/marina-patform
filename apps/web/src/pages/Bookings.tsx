import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, Clock, DollarSign, Download, Eye, LogIn, LogOut, Mail, Pencil, Sailboat, TriangleAlert } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { Booking, BookingStatus, BoatType } from "@marina/shared";
import { linesTotal, bookingAmount, priceNote } from "@marina/shared";
import { withInvoice, withMessage } from "@marina/shared";
import { addDays, daysBetween, fmtDate, fmtShort, fromISO, relative, toISO, today } from "@marina/shared";
import { money } from "@marina/shared";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, StatCard, Table, Tabs, Toolbar, useDirty, useSort, type SortState } from "@/components/ui";
import { BookingBadge, bookingLabel, InvoiceBadge } from "@/components/status";

type Tab = "list" | "today" | "calendar" | "conflicts";

export function Bookings() {
  const { db, ix, scope, update, toast, can } = useStore();
  const canEdit = can("bookings") !== "view";
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("view") === "today" ? "today" : params.get("view") === "conflicts" ? "conflicts" : "list");
  const [bulkApprove, setBulkApprove] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<"all" | BookingStatus>((params.get("status") as BookingStatus) ?? "all");
  const [marinaId, setMarinaId] = useState(params.get("marina") ?? "all");
  const [when, setWhen] = useState<"current" | "past" | "all">("current");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Booking | undefined>();
  const creating = params.get("new") === "1";
  const now = today();
  const ids = marinaId === "all" ? scope : [marinaId];

  const all = useMemo(() => ix.bookingsIn(ids), [ix, ids]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((b) => status === "all" || b.status === status)
      .filter((b) => (when === "all" ? true : when === "current" ? b.end >= now : b.end < now))
      .filter((b) => {
        if (!s) return true;
        const boat = ix.boat(b.boatId);
        const owner = boat && ix.owner(boat.ownerId);
        return b.code.toLowerCase().includes(s) || boat?.name.toLowerCase().includes(s) || owner?.name.toLowerCase().includes(s) || ix.berth(b.berthId)?.code.toLowerCase().includes(s);
      })
      .sort((a, b) => (when === "past" ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)));
  }, [all, status, when, q, ix, now]);

  const { sorted, sort } = useSort(rows, {
    code: (b) => b.code,
    owner: (b) => ix.ownerOfBooking(b)?.name ?? "",
    marina: (b) => `${ix.marinaOfBerth(b.berthId)?.name} ${ix.berth(b.berthId)?.code}`,
    dates: (b) => b.start,
    status: (b) => bookingLabel[b.status],
    amount: (b) => ix.amount(b),
  });
  const pg = paginate(sorted, page);
  const m = ix.metrics(ids);
  const pickStatus = (s: BookingStatus) => { setTab("list"); setStatus(status === s ? "all" : s); setWhen("current"); setPage(1); };
  const filters = (q ? 1 : 0) + (status !== "all" ? 1 : 0) + (marinaId !== "all" ? 1 : 0) + (when !== "current" ? 1 : 0);
  const clearFilters = () => { setQ(""); setStatus("all"); setMarinaId("all"); setWhen("current"); setPage(1); };
  const pendingVisible = rows.filter((b) => b.status === "pending");
  const approveAll = () => {
    const before = db;
    update((d) => pendingVisible.reduce((acc, b) => withInvoice({ ...acc, bookings: acc.bookings.map((x) => (x.id === b.id ? { ...x, status: "confirmed" as const } : x)) }, b.id, ix.amount(b)), d), `Approved ${pendingVisible.length} pending bookings`);
    toast(`${pendingVisible.length} bookings approved and invoiced`, before);
  };
  const bookedValue = all.filter((b) => b.status === "confirmed" || b.status === "checked-in" || b.status === "pending").filter((b) => b.end > now).reduce((s, b) => s + ix.amount(b), 0);
  const conflicts = ix.conflicts().filter(([a]) => ids.includes(ix.berth(a.berthId)?.marinaId ?? ""));
  const outOfService = ix.serviceConflicts().filter((b) => ids.includes(ix.berth(b.berthId)?.marinaId ?? ""));

  const exportRows = () =>
    downloadCsv(
      "bookings.csv",
      ["Booking", "Boat owner", "Boat", "Marina", "Berth", "Arrival", "Departure", "Nights", "Status", "Amount"],
      rows.map((b) => {
        const boat = ix.boat(b.boatId);
        return [b.code, ix.owner(boat?.ownerId ?? "")?.name ?? "", boat?.name ?? "", ix.marinaOfBerth(b.berthId)?.name ?? "", ix.berth(b.berthId)?.code ?? "", b.start, b.end, daysBetween(b.start, b.end), bookingLabel[b.status], b.status === "cancelled" ? 0 : ix.amount(b)];
      }),
    );

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Reservations, arrivals and departures"
        actions={
          <>
            <Button icon={Download} onClick={exportRows}>Export CSV</Button>
            {canEdit && <Button variant="primary" icon={CalendarPlus} onClick={() => setParams((p) => { p.set("new", "1"); return p; })}>New booking</Button>}
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="Checked in now" icon={Sailboat} value={m.checkedIn} active={tab === "list" && status === "checked-in"} onClick={() => pickStatus("checked-in")} />
        <StatCard label="Upcoming" icon={CalendarCheck} value={m.upcoming} sub="confirmed and pending" active={tab === "list" && status === "confirmed"} onClick={() => pickStatus("confirmed")} />
        <StatCard label="Awaiting approval" icon={Clock} value={m.pending} active={tab === "list" && status === "pending"} onClick={() => pickStatus("pending")} />
        <StatCard label="Booked value" icon={DollarSign} value={money(bookedValue)} sub="current and upcoming, excludes cancelled" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "list", label: "All bookings" },
          { value: "today", label: "Today", count: m.arrivalsToday + m.departuresToday },
          { value: "calendar", label: "Calendar" },
          { value: "conflicts", label: "Conflicts", count: conflicts.length + outOfService.length },
        ]}
      />
      <Card>
        <Toolbar active={tab === "list" ? filters : marinaId !== "all" ? 1 : 0} onClear={clearFilters}>
          {tab === "list" && <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search booking, boat, owner or berth" />}
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => { setMarinaId(e.target.value); setPage(1); }} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((x) => scope.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
          {tab === "list" && (
            <>
              <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="sm:w-40">
                <option value="all">All statuses</option>
                {(Object.keys(bookingLabel) as BookingStatus[]).map((s) => <option key={s} value={s}>{bookingLabel[s]}</option>)}
              </Select>
              <Select aria-label="Filter by date" value={when} onChange={(e) => { setWhen(e.target.value as typeof when); setPage(1); }} className="sm:w-52">
                <option value="current">Current & upcoming</option>
                <option value="past">Past</option>
                <option value="all">Any date</option>
              </Select>
            </>
          )}
        </Toolbar>
        {tab === "list" && (
          <>
            {pendingVisible.length > 1 && status === "pending" && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-[13px]">
                <span>{pendingVisible.length} bookings are waiting for approval.</span>
                <Button size="sm" variant="primary" icon={CircleCheck} onClick={() => setBulkApprove(true)}>Approve all {pendingVisible.length}</Button>
              </div>
            )}
            <BookingTable rows={pg.rows} onOpen={setOpen} empty={rows.length === 0} sort={sort} />
            <Pagination page={pg.page} pages={pg.pages} total={rows.length} onPage={setPage} />
          </>
        )}
        {tab === "today" && <TodayView all={all} onOpen={setOpen} />}
        {tab === "calendar" && <CalendarView all={all} onOpen={setOpen} />}
        {tab === "conflicts" && outOfService.length > 0 && (
          <>
            <CardHeader title="Booked on a berth that's out of service" description="Move these bookings to another berth, or return the berth to service." icon={TriangleAlert} />
            <Table head={["Booking", "Boat", "Berth", "Dates", ""]}>
              {outOfService.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.code}</td>
                  <td>{ix.boat(b.boatId)?.name}</td>
                  <td>{ix.berth(b.berthId)?.code} · {ix.marinaOfBerth(b.berthId)?.name}</td>
                  <td className="whitespace-nowrap">{fmtShort(b.start)} – {fmtShort(b.end)}</td>
                  <td><Button size="sm" onClick={() => setOpen(b)}>Move booking</Button></td>
                </tr>
              ))}
            </Table>
          </>
        )}
        {tab === "conflicts" && outOfService.length > 0 && conflicts.length > 0 && <CardHeader title="Double bookings" />}
        {tab === "conflicts" &&
          (conflicts.length ? (
            <Table head={["Berth", "Booking A", "Booking B", "Overlap", ""]}>
              {conflicts.map(([a, b]) => (
                <tr key={a.id + b.id}>
                  <td className="font-medium">{ix.berth(a.berthId)?.code} · {ix.marinaOfBerth(a.berthId)?.name}</td>
                  <td>{a.code} <span className="text-xs text-ink-3">{fmtShort(a.start)}–{fmtShort(a.end)}</span></td>
                  <td>{b.code} <span className="text-xs text-ink-3">{fmtShort(b.start)}–{fmtShort(b.end)}</span></td>
                  <td>{daysBetween(b.start, a.end < b.end ? a.end : b.end)} nights</td>
                  <td><Button size="sm" onClick={() => setOpen(b)}>Resolve</Button></td>
                </tr>
              ))}
            </Table>
          ) : (
            outOfService.length === 0 && <EmptyState icon={CircleCheck} title="No conflicts" body="No double bookings, and no bookings on berths that are out of service. New bookings are checked automatically." />
          ))}
      </Card>
      <ConfirmDialog
        open={bulkApprove}
        onClose={() => setBulkApprove(false)}
        title={`Approve ${pendingVisible.length} bookings?`}
        body="Each booking is confirmed and an invoice is created. You can undo this right after."
        confirmLabel={`Approve ${pendingVisible.length}`}
        onConfirm={approveAll}
      />
      {creating && canEdit && <BookingForm onClose={() => setParams((p) => { p.delete("new"); p.delete("berth"); return p; })} defaultMarina={marinaId !== "all" ? marinaId : undefined} defaultBerth={params.get("berth") ?? undefined} />}
      {open && <BookingDetail booking={ix.booking(open.id) ?? open} onClose={() => setOpen(undefined)} />}
    </>
  );
}

function BookingTable({ rows, onOpen, empty, sort }: { rows: Booking[]; onOpen: (b: Booking) => void; empty?: boolean; sort?: SortState }) {
  const { ix } = useStore();
  return (
    <Table
      sort={sort}
      empty={empty}
      head={[{ label: "Booking", sortKey: "code" }, "Boat", { label: "Marina & berth", sortKey: "marina" }, { label: "Dates", sortKey: "dates" }, { label: "Status", sortKey: "status" }, { label: "Amount", sortKey: "amount" }, ""]}
    >
      {rows.map((b) => {
        const boat = ix.boat(b.boatId);
        const owner = boat && ix.owner(boat.ownerId);
        return (
          <tr key={b.id} className="cursor-pointer hover:bg-row-hover" onClick={() => onOpen(b)}>
            <td><span className="font-medium">{b.code}</span><span className="block text-xs text-ink-3">{owner?.name}</span></td>
            <td>{boat?.name}<span className="block text-xs text-ink-3">{boat?.type} · {boat?.length} ft</span></td>
            <td>{ix.marinaOfBerth(b.berthId)?.name}<span className="block text-xs text-ink-3">Berth {ix.berth(b.berthId)?.code}</span></td>
            <td className="whitespace-nowrap">{fmtShort(b.start)} – {fmtShort(b.end)}<span className="block text-xs text-ink-3">{daysBetween(b.start, b.end)} nights</span></td>
            <td><BookingBadge status={b.status} /></td>
            <td className={`font-medium num ${b.status === "cancelled" ? "text-ink-3 line-through" : ""}`}>{money(ix.amount(b))}</td>
            <td><IconButton icon={Eye} label={`Open ${b.code}`} onClick={(e) => { e.stopPropagation(); onOpen(b); }} /></td>
          </tr>
        );
      })}
    </Table>
  );
}

function TodayView({ all, onOpen }: { all: Booking[]; onOpen: (b: Booking) => void }) {
  const now = today();
  const arrivals = all.filter((b) => b.start === now && b.status !== "cancelled");
  const departures = all.filter((b) => b.end === now && b.status !== "cancelled");
  return (
    <div className="grid grid-cols-1 divide-y divide-line xl:grid-cols-2 xl:divide-x xl:divide-y-0">
      <div>
        <CardHeader title={`Arrivals · ${arrivals.length}`} icon={LogIn} />
        {arrivals.length ? <BookingTable rows={arrivals} onOpen={onOpen} /> : <EmptyState title="No arrivals today" />}
      </div>
      <div>
        <CardHeader title={`Departures · ${departures.length}`} icon={LogOut} />
        {departures.length ? <BookingTable rows={departures} onOpen={onOpen} /> : <EmptyState title="No departures today" />}
      </div>
    </div>
  );
}

function CalendarView({ all, onOpen }: { all: Booking[]; onOpen: (b: Booking) => void }) {
  const { ix } = useStore();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [day, setDay] = useState(today());
  const first = fromISO(`${month}-01`);
  const startPad = first.getDay();
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const active = all.filter((b) => b.status !== "cancelled");
  const cells = Array.from({ length: Math.ceil((startPad + days) / 7) * 7 }, (_, i) => {
    const n = i - startPad + 1;
    return n >= 1 && n <= days ? `${month}-${String(n).padStart(2, "0")}` : null;
  });
  const shift = (d: number) => setMonth(toISO(new Date(first.getFullYear(), first.getMonth() + d, 1)).slice(0, 7));
  const onDay = active.filter((b) => b.start <= day && b.end > day);
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px]">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <div className="flex gap-1">
            <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shift(-1)} />
            <Button size="sm" onClick={() => { setMonth(today().slice(0, 7)); setDay(today()); }}>Today</Button>
            <IconButton icon={ChevronRight} label="Next month" onClick={() => shift(1)} />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const arr = active.filter((b) => b.start === c).length;
            const dep = active.filter((b) => b.end === c).length;
            const occ = active.filter((b) => b.start <= c && b.end > c).length;
            const sel = c === day;
            return (
              <button
                key={c}
                onClick={() => setDay(c)}
                aria-pressed={sel}
                aria-label={`${fmtDate(c)}: ${arr} arrivals, ${dep} departures, ${occ} boats in`}
                className={`flex min-h-16 flex-col items-start rounded-md border p-1.5 text-left cursor-pointer ${sel ? "border-ink bg-surface-2" : "border-line hover:bg-row-hover"} ${c === today() ? "ring-1 ring-ink-3" : ""}`}
              >
                <span className={`text-xs font-semibold ${sel ? "text-ink" : "text-ink-2"}`}>{Number(c.slice(8))}</span>
                <span className="mt-auto hidden w-full text-[10px] leading-tight text-ink-3 sm:block">
                  {arr > 0 && <span className="block">↓ {arr} in</span>}
                  {dep > 0 && <span className="block">↑ {dep} out</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-line xl:border-t-0 xl:border-l">
        <CardHeader title={fmtDate(day)} description={`${onDay.length} boats at the marina`} />
        <ul className="max-h-[480px] overflow-y-auto">
          {onDay.length === 0 && <EmptyState title="No boats on this day" />}
          {onDay.map((b) => (
            <li key={b.id}>
              <button onClick={() => onOpen(b)} className="flex w-full items-center justify-between gap-2 border-b border-line px-5 py-2.5 text-left hover:bg-row-hover cursor-pointer">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{ix.boat(b.boatId)?.name}</span>
                  <span className="block text-xs text-ink-3">{ix.berth(b.berthId)?.code} · {ix.marinaOfBerth(b.berthId)?.name}</span>
                </span>
                <BookingBadge status={b.status} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BookingDetail({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const canEdit = can("bookings") !== "view";
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const boat = ix.boat(b.boatId);
  const owner = boat && ix.owner(boat.ownerId);
  const berth = ix.berth(b.berthId);
  const invoice = db.invoices.find((i) => i.bookingId === b.id && i.status !== "void") ?? db.invoices.find((i) => i.bookingId === b.id);
  const now = today();
  const sent = db.messages.filter((m) => m.ref === b.id);

  const setStatus = (status: BookingStatus, msg: string) => {
    const before = db;
    update((d) => {
      let next = { ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status } : x)) };
      if (status === "confirmed") next = withInvoice(next, b.id, ix.amount(b));
      if (status === "cancelled") next = { ...next, invoices: next.invoices.map((i) => (i.bookingId === b.id && i.status !== "paid" ? { ...i, status: "void" } : i)) };
      return next;
    }, { text: `${msg} (${boat?.name})`, to: `/bookings?q=${b.code}`, marinaId: berth?.marinaId });
    toast(msg, before);
  };

  if (editing) return <EditBooking booking={b} onDone={() => setEditing(false)} />;

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Booking ${b.code}`}
      description={`Created ${fmtDate(b.createdAt)}`}
      footer={
        !canEdit ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
        <>
          {(b.status === "pending" || b.status === "confirmed") && <Button onClick={() => setConfirmCancel(true)}>Cancel booking</Button>}
          {(b.status === "pending" || b.status === "confirmed" || b.status === "checked-in") && <Button icon={Pencil} onClick={() => setEditing(true)}>Change dates or berth</Button>}
          {b.status === "pending" && <Button variant="primary" icon={CircleCheck} onClick={() => setStatus("confirmed", `${b.code} approved and invoiced`)}>Approve</Button>}
          {b.status === "confirmed" && b.start <= now && <Button variant="primary" icon={LogIn} onClick={() => setStatus("checked-in", `${boat?.name} checked in`)}>Check in</Button>}
          {b.status === "checked-in" && <Button variant="primary" icon={LogOut} onClick={() => setStatus("completed", `${boat?.name} checked out`)}>Check out</Button>}
          {(b.status === "completed" || b.status === "cancelled") && <Button onClick={onClose}>Close</Button>}
        </>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BookingBadge status={b.status} />
        {b.status === "confirmed" && b.start > now && <span className="text-[13px] text-ink-3">Arrives {relative(b.start).toLowerCase()}</span>}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-2">
        <Detail label="Boat owner" value={owner?.name} sub={[owner?.email, owner?.phone].filter(Boolean).join(" · ")} />
        <Detail label="Boat" value={`${boat?.name}`} sub={`${boat?.type} · ${boat?.length} ft · ${boat?.registration}`} />
        <Detail label="Marina" value={ix.marinaOfBerth(b.berthId)?.name} sub={`Berth ${berth?.code} · up to ${berth?.maxLength} ft`} />
        <Detail label="Dates" value={`${fmtDate(b.start)} – ${fmtDate(b.end)}`} sub={`${daysBetween(b.start, b.end)} nights · ${b.guests} guests`} />
        <Detail label="Amount" value={money(ix.amount(b))} sub={priceNote(b.start, b.end, db.settings.monthlyFromNights)} />
        <div>
          <dt className="text-xs text-ink-3">Invoice</dt>
          {invoice ? (
            <>
              <dd className="mt-0.5"><button className="font-semibold text-green-text hover:underline cursor-pointer" onClick={() => navigate(`/billing?open=${invoice.id}`)}>{invoice.number}</button></dd>
              <dd className="mt-1"><InvoiceBadge status={invoice.status} /></dd>
            </>
          ) : (
            <dd className="mt-0.5 font-medium">Not invoiced yet<span className="block text-xs font-normal text-ink-3">{b.status === "pending" ? "Created when the booking is approved" : ""}</span></dd>
          )}
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-3">{sent.length ? `Last email: ${sent[0].subject}, ${relative(sent[0].at.slice(0, 10)).toLowerCase()}` : "No emails sent for this booking yet."}</p>
        {owner && b.status !== "cancelled" && (
          <Button
            size="sm"
            icon={Mail}
            onClick={() => {
              update((d) => withMessage(d, { to: owner.email, subject: `Booking ${b.code} details`, kind: "confirmation", ref: b.id }), { text: `Emailed booking details for ${b.code} to ${owner.name}`, marinaId: berth?.marinaId });
              toast(`Booking details emailed to ${owner.email}`);
            }}
          >
            Email details to owner
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={`Cancel ${b.code}?`}
        body={`The berth becomes available again and any unpaid invoice is voided. ${owner?.name} is not notified automatically.`}
        confirmLabel="Cancel booking"
        onConfirm={() => setStatus("cancelled", `${b.code} cancelled`)}
      />
    </Modal>
  );
}

function EditBooking({ booking: b, onDone }: { booking: Booking; onDone: () => void }) {
  const { db, ix, update, toast } = useStore();
  const now = today();
  const started = b.start <= now;
  const [f, setF] = useState({ start: b.start, end: b.end, berthId: b.berthId, guests: String(b.guests) });
  const dirty = useDirty(f);
  const [error, setError] = useState("");
  const boat = ix.boat(b.boatId);
  const marinaId = ix.berth(b.berthId)?.marinaId;
  const nights = daysBetween(f.start, f.end);
  const options = db.berths
    .filter((x) => x.marinaId === marinaId && !x.underMaintenance && x.maxLength >= (boat?.length ?? 0))
    .filter((x) => nights > 0 && ix.isFree(x.id, f.start, f.end, b.id))
    .sort((x, y) => x.code.localeCompare(y.code));
  const berth = ix.berth(f.berthId);
  const amount = berth && nights > 0 ? bookingAmount(f.start, f.end, berth, db.settings.monthlyFromNights) : 0;
  const invoice = db.invoices.find((i) => i.bookingId === b.id && i.status !== "void");

  const save = () => {
    if (nights < 1) return setError("Departure must be after arrival.");
    if (!started && f.start < now) return setError("Arrival can't be in the past.");
    if (!options.some((x) => x.id === f.berthId)) return setError("The chosen berth isn't free for these dates. Pick another berth.");
    const before = db;
    update((d) => {
      const bookings = d.bookings.map((x) => (x.id === b.id ? { ...x, start: f.start, end: f.end, berthId: f.berthId, guests: Number(f.guests) || x.guests } : x));
      // Unpaid invoices follow the new price; paid ones are left as issued.
      const invoices = d.invoices.map((i) => (i.bookingId === b.id && (i.status === "due" || i.status === "overdue") ? { ...i, amount: amount + linesTotal(i) } : i));
      return { ...d, bookings, invoices };
    }, { text: `Changed ${b.code}: ${fmtShort(f.start)}–${fmtShort(f.end)}, berth ${berth?.code}`, to: `/bookings?q=${b.code}`, marinaId });
    toast(`${b.code} updated`, before);
    onDone();
  };

  return (
    <Modal
      open
      dirty={dirty}
      onClose={onDone}
      title={`Change ${b.code}`}
      description={`${boat?.name} · ${boat?.length} ft · ${ix.marina(marinaId ?? "")?.name}`}
      footer={<><Button onClick={onDone}>Back</Button><Button variant="primary" onClick={save}>Save changes</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Arrival" hint={started ? "Already arrived" : undefined}>{(id) => <Input id={id} type="date" value={f.start} disabled={started} onChange={(e) => { setF({ ...f, start: e.target.value }); setError(""); }} />}</Field>
        <Field label="Departure">{(id) => <Input id={id} type="date" min={addDays(f.start, 1)} value={f.end} onChange={(e) => { setF({ ...f, end: e.target.value }); setError(""); }} />}</Field>
        <Field label="Berth" hint={`${options.length} free berths fit this boat`}>
          {(id) => (
            <Select id={id} value={f.berthId} onChange={(e) => { setF({ ...f, berthId: e.target.value }); setError(""); }}>
              {!options.some((x) => x.id === f.berthId) && <option value={f.berthId}>{ix.berth(f.berthId)?.code} (not free for these dates)</option>}
              {options.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.maxLength} ft · {money(x.dailyRate)}/day</option>)}
            </Select>
          )}
        </Field>
        <Field label="Guests">{(id) => <Input id={id} type="number" min={1} value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} />}</Field>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-md bg-surface-2 px-4 py-3 text-[13px]">
        <span>New total <span className="block text-xs text-ink-3">{nights > 0 ? priceNote(f.start, f.end, db.settings.monthlyFromNights) : "—"}</span></span>
        <span className="text-lg font-semibold num">{money(amount)}</span>
      </div>
      {invoice?.status === "paid" && <p className="mt-2 text-xs text-ink-3">The invoice is already paid. Adjust any difference in Billing.</p>}
      {error && <p role="alert" className="mt-3 text-[13px] font-medium">⚠ {error}</p>}
    </Modal>
  );
}

function Detail({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
      {sub && <dd className="text-xs text-ink-3">{sub}</dd>}
    </div>
  );
}

function BookingForm({ onClose, defaultMarina, defaultBerth }: { onClose: () => void; defaultMarina?: string; defaultBerth?: string }) {
  const { db, ix, scope, update, toast, user } = useStore();
  const now = today();
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">("existing");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [f, setF] = useState({
    ownerId: "",
    boatId: "",
    newOwner: "",
    newEmail: "",
    newBoat: "",
    newType: "Sailboat" as BoatType,
    newLength: "32",
    marinaId: defaultMarina && scope.includes(defaultMarina) ? defaultMarina : scope[0],
    start: addDays(now, 1),
    end: addDays(now, 4),
    berthId: "",
    guests: "2",
    status: "confirmed" as "pending" | "confirmed",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v, ...(k === "marinaId" || k === "start" || k === "end" || k === "boatId" || k === "newLength" ? { berthId: "" } : {}) }));

  const owners = useMemo(() => {
    const s = ownerQuery.trim().toLowerCase();
    return db.owners.filter((o) => !s || o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s)).slice(0, 50);
  }, [db.owners, ownerQuery]);
  const ownerBoats = db.boats.filter((b) => b.ownerId === f.ownerId);
  const boatLength = ownerMode === "new" ? Number(f.newLength) : ix.boat(f.boatId)?.length ?? 0;
  const nights = daysBetween(f.start, f.end);
  const free = useMemo(
    () => (nights > 0 && boatLength > 0 ? db.berths.filter((b) => b.marinaId === f.marinaId && !b.underMaintenance && b.maxLength >= boatLength && ix.isFree(b.id, f.start, f.end)).sort((a, b) => a.maxLength - b.maxLength || a.code.localeCompare(b.code)) : []),
    [db.berths, f.marinaId, f.start, f.end, boatLength, nights, ix],
  );
  // A berth chosen from the berth page is preselected as soon as it fits the boat and dates.
  const berthId = f.berthId || (defaultBerth && free.some((b) => b.id === defaultBerth) ? defaultBerth : "");
  const berth = ix.berth(berthId);
  const price = berth && nights > 0 ? bookingAmount(f.start, f.end, berth, db.settings.monthlyFromNights) : 0;

  const save = () => {
    const e: Record<string, string> = {};
    if (ownerMode === "existing") {
      if (!f.ownerId) e.owner = "Choose a boat owner.";
      else if (!f.boatId) e.boat = "Choose a boat.";
    } else {
      if (!f.newOwner.trim()) e.newOwner = "Enter the owner's name.";
      if (!/^\S+@\S+\.\S+$/.test(f.newEmail)) e.newEmail = "Enter a valid email.";
      if (!f.newBoat.trim()) e.newBoat = "Enter the boat name.";
      if (!(Number(f.newLength) >= 10)) e.newLength = "Enter the boat length in feet.";
    }
    if (f.start < now) e.start = "Arrival can't be in the past.";
    if (nights < 1) e.end = "Departure must be after arrival.";
    if (!berthId) e.berth = free.length ? "Choose a berth." : "No berth is free for these dates and boat size.";
    if (!(Number(f.guests) >= 1)) e.guests = "At least 1 guest.";
    setErrors(e);
    if (Object.keys(e).length) return;

    update((d) => {
      let owners = d.owners, boats = d.boats, boatId = f.boatId;
      if (ownerMode === "new") {
        const ownerId = nextId("o", d.owners);
        boatId = nextId("bt", d.boats);
        owners = [...owners, { id: ownerId, name: f.newOwner.trim(), email: f.newEmail.trim(), phone: "", since: now }];
        boats = [...boats, { id: boatId, ownerId, name: f.newBoat.trim(), type: f.newType, length: Number(f.newLength), registration: "Pending" }];
      }
      const id = nextId("bk", d.bookings);
      const seq = Number(id.split("-")[1]);
      const booking: Booking = { id, code: `BK-${String(seq).padStart(4, "0")}`, boatId, berthId, start: f.start, end: f.end, guests: Number(f.guests), status: f.status, createdAt: now };
      const next = { ...d, owners, boats, bookings: [...d.bookings, booking] };
      return f.status === "confirmed" ? withInvoice(next, id, price) : next;
    }, { text: `New ${f.status} booking for ${ownerMode === "new" ? f.newBoat : ix.boat(f.boatId)?.name} at ${ix.marina(f.marinaId)?.name}, berth ${berth?.code}`, marinaId: f.marinaId });
    // Guide 12: the first booking someone creates gets a soft yellow glow (no confetti).
    const firstKey = `mms.firstBooking.${user?.id}`;
    let first = false;
    try {
      first = !localStorage.getItem(firstKey);
      localStorage.setItem(firstKey, "1");
    } catch {
      /* storage unavailable */
    }
    if (first) toast("Your first booking is in. Nice work!", undefined, "celebrate");
    else toast(f.status === "confirmed" ? "Booking confirmed and invoiced" : "Booking saved as pending");
    onClose();
  };

  return (
    <Modal
      open
      wide
      dirty={dirty}
      onClose={onClose}
      title="New booking"
      description="Only berths that are free and big enough for the boat are offered."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{f.status === "confirmed" ? "Confirm booking" : "Save as pending"}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">1. Boat owner</h3>
            <div className="flex rounded-md border border-line p-0.5 text-xs">
              {(["existing", "new"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setOwnerMode(m)} aria-pressed={ownerMode === m} className={`rounded px-2.5 py-1 cursor-pointer ${ownerMode === m ? "bg-primary text-on-primary" : "text-ink-2"}`}>
                  {m === "existing" ? "Existing owner" : "New owner"}
                </button>
              ))}
            </div>
          </div>
          {ownerMode === "existing" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Owner" error={errors.owner}>
                {(id) => (
                  <div className="space-y-2">
                    <Input aria-label="Search owners" value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} placeholder="Type to search by name or email" />
                    <Select id={id} value={f.ownerId} onChange={(e) => setF((x) => ({ ...x, ownerId: e.target.value, boatId: db.boats.find((b) => b.ownerId === e.target.value)?.id ?? "", berthId: "" }))}>
                      <option value="">Select owner…</option>
                      {owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.email}</option>)}
                    </Select>
                  </div>
                )}
              </Field>
              <Field label="Boat" error={errors.boat}>
                {(id) => (
                  <Select id={id} value={f.boatId} onChange={(e) => set("boatId", e.target.value)} disabled={!f.ownerId}>
                    {!f.ownerId && <option value="">Choose an owner first</option>}
                    {ownerBoats.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.type} · {b.length} ft</option>)}
                  </Select>
                )}
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Owner name" error={errors.newOwner}>{(id) => <Input id={id} value={f.newOwner} onChange={(e) => set("newOwner", e.target.value)} />}</Field>
              <Field label="Owner email" error={errors.newEmail}>{(id) => <Input id={id} type="email" value={f.newEmail} onChange={(e) => set("newEmail", e.target.value)} />}</Field>
              <Field label="Boat name" error={errors.newBoat}>{(id) => <Input id={id} value={f.newBoat} onChange={(e) => set("newBoat", e.target.value)} />}</Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  {(id) => (
                    <Select id={id} value={f.newType} onChange={(e) => set("newType", e.target.value)}>
                      {["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"].map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Length (ft)" error={errors.newLength}>{(id) => <Input id={id} type="number" min={10} value={f.newLength} onChange={(e) => set("newLength", e.target.value)} />}</Field>
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-[13px] font-semibold">2. Stay</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="Marina">
                {(id) => (
                  <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}>
                    {db.marinas.filter((m) => scope.includes(m.id) && m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Arrival" error={errors.start}>{(id) => <Input id={id} type="date" min={now} value={f.start} onChange={(e) => set("start", e.target.value)} />}</Field>
            <Field label="Departure" error={errors.end} hint={nights > 0 ? `${nights} nights` : undefined}>{(id) => <Input id={id} type="date" min={addDays(f.start, 1)} value={f.end} onChange={(e) => set("end", e.target.value)} />}</Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-[13px] font-semibold">3. Berth</h3>
          {boatLength <= 0 ? (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink-2">Choose a boat to see which berths fit.</p>
          ) : free.length === 0 ? (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-ink-3 px-3 py-2 text-[13px]"><TriangleAlert className="size-4" aria-hidden /> No berth fits a {boatLength} ft boat on these dates. Try other dates or another marina.</p>
          ) : (
            <>
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5" role="radiogroup" aria-label="Available berths">
                {free.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={berthId === b.id}
                    onClick={() => set("berthId", b.id)}
                    className={`rounded-md border p-2 text-left cursor-pointer ${berthId === b.id ? "border-ink bg-primary text-on-primary" : "border-line hover:bg-row-hover"}`}
                  >
                    <span className="block text-[13px] font-semibold">{b.code}</span>
                    <span className="block text-[11px] opacity-75">{b.maxLength} ft · {money(b.dailyRate)}/d</span>
                  </button>
                ))}
              </div>
              {errors.berth && <p className="mt-1.5 text-xs font-medium">⚠ {errors.berth}</p>}
            </>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Guests" error={errors.guests}>{(id) => <Input id={id} type="number" min={1} value={f.guests} onChange={(e) => set("guests", e.target.value)} />}</Field>
          <Field label="Status">
            {(id) => (
              <Select id={id} value={f.status} onChange={(e) => set("status", e.target.value)}>
                <option value="confirmed">Confirmed (send invoice)</option>
                <option value="pending">Pending approval</option>
              </Select>
            )}
          </Field>
          <div className="rounded-md bg-surface-2 px-4 py-3">
            <p className="text-xs text-ink-3">Total</p>
            <p className="text-lg font-semibold num">{money(price)}</p>
            <p className="text-[11px] text-ink-3">{berth ? (nights >= db.settings.monthlyFromNights ? "Monthly rate, prorated" : `${nights} × ${money(berth.dailyRate)}`) : "Select a berth"}</p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
