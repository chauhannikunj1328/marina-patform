import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Anchor, ArrowLeft, CalendarDays, CalendarPlus, DollarSign, Eye, Gauge, Mail, MapPin, Pencil, Phone, Plus, Trash, Warehouse } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { Berth, Marina } from "@marina/shared";
import { BerthDetail } from "@/components/BerthDetail";
import { t, count, money, pct } from "@marina/shared";
import { lastMonths, fmtShort } from "@marina/shared";
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, IconButton, Input, Meter, Modal, PageHeader, SearchInput, Select, StatCard, Table, Toolbar, useDirty, useSort } from "@/components/ui";
import { ActiveBadge, BerthBadge, BookingBadge } from "@/components/status";
import { OccupancyChart, RevenueChart } from "@/components/charts";

const AMENITIES = ["Wi-Fi", "Shore power", "Fresh water", "Fuel dock", "Pump-out", "Showers", "Laundry", "Security", "Parking"];

export function MarinaForm({ open, onClose, marina }: { open: boolean; onClose: () => void; marina?: Marina }) {
  const { db, update, toast } = useStore();
  const [form, setForm] = useState<Omit<Marina, "id">>(
    () =>
      marina ?? { name: "", cityId: db.cities[0]?.id ?? "", phone: "", email: "", address: "", status: "active", amenities: ["Wi-Fi", "Shore power", "Fresh water"] },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(form);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("Enter the marina name.");
    else if (db.marinas.some((m) => m.name.toLowerCase() === form.name.trim().toLowerCase() && m.id !== marina?.id)) e.name = t("A marina with this name already exists.");
    if (!form.address.trim()) e.address = t("Enter the street address.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = t("Enter a valid email.");
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) =>
      marina
        ? { ...d, marinas: d.marinas.map((m) => (m.id === marina.id ? { ...m, ...form, name: form.name.trim() } : m)) }
        : { ...d, marinas: [...d.marinas, { ...form, name: form.name.trim(), id: nextId("m", d.marinas) }] },
      { text: `${marina ? "Updated" : "Added"} marina ${form.name.trim()}`, marinaId: marina?.id },
    );
    toast(marina ? `${form.name} updated` : `${form.name} added`);
    onClose();
  };

  return (
    <Modal
      open={open}
      dirty={dirty}
      onClose={onClose}
      title={marina ? t("Edit marina") : t("Add marina")}
      description={marina ? undefined : t("You can add berths after the marina is created.")}
      footer={
        <>
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" onClick={save}>{marina ? t("Save changes") : t("Add marina")}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("Marina name")} error={errors.name}>{(id) => <Input id={id} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("e.g. Harbor Point Marina")} />}</Field>
        </div>
        <Field label={t("City")}>
          {(id) => (
            <Select id={id} value={form.cityId} onChange={(e) => set("cityId", e.target.value)}>
              {db.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t("Status")}>
          {(id) => (
            <Select id={id} value={form.status} onChange={(e) => set("status", e.target.value as Marina["status"])}>
              <option value="active">{t("Active")}</option>
              <option value="inactive">{t("Inactive")}</option>
            </Select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("Street address")} error={errors.address}>{(id) => <Input id={id} value={form.address} onChange={(e) => set("address", e.target.value)} />}</Field>
        </div>
        <Field label={t("Phone")}>{(id) => <Input id={id} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(415) 555-0100" />}</Field>
        <Field label={t("Office email")} error={errors.email}>{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-medium">{t("Amenities")}</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = form.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("amenities", on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])}
                  className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${on ? "border-transparent bg-primary text-on-primary" : "border-line text-ink-2 hover:bg-row-hover"}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

export function Marinas() {
  const { db, ix, scope, update, toast, user, can } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState("all");
  const [editing, setEditing] = useState<Marina | undefined>();
  const [deleting, setDeleting] = useState<Marina | undefined>();
  const adding = params.get("new") === "1";

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return db.marinas
      .filter((m) => scope.includes(m.id))
      .filter((m) => cityId === "all" || m.cityId === cityId)
      .filter((m) => !s || m.name.toLowerCase().includes(s) || ix.city(m.cityId)?.name.toLowerCase().includes(s));
  }, [db, ix, scope, q, cityId]);

  const all = ix.metrics(scope);
  const { sorted, sort } = useSort(rows, {
    name: (m) => m.name,
    city: (m) => ix.city(m.cityId)?.name ?? "",
    occupancy: (m) => ix.metrics([m.id]).occupancy,
    revenue: (m) => ix.metrics([m.id]).revenue,
  });

  return (
    <>
      <PageHeader
        title={t("Marinas")}
        description={t("Locations, contact details and live occupancy")}
        actions={user?.role === "admin" && <Button variant="primary" icon={Plus} onClick={() => setParams({ new: "1" })}>{t("Add marina")}</Button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-4">
        <StatCard onClick={() => { setQ(""); setCityId("all"); }} label={t("Marinas")} icon={Anchor} value={count(scope.length)} sub={t("{n} active", { n: db.marinas.filter((m) => scope.includes(m.id) && m.status === "active").length })} />
        <StatCard label={t("Total berths")} icon={Warehouse} value={count(all.berths)} sub={t("{occupied} occupied today", { occupied: all.occupied })} to="/berths" />
        <StatCard to="/analytics" label={t("Occupancy rate")} icon={Gauge} value={pct(all.occupancy)} />
        <StatCard to="/billing" label={t("Revenue booked this month")} icon={DollarSign} value={money(all.revenue)} trend={{ value: all.revenueChange }} />
      </div>
      <Card>
        <Toolbar active={(q ? 1 : 0) + (cityId !== "all" ? 1 : 0)} onClear={() => { setQ(""); setCityId("all"); }}>
          <SearchInput value={q} onChange={setQ} placeholder={t("Search by marina or city")} />
          <Select aria-label={t("Filter by city")} value={cityId} onChange={(e) => setCityId(e.target.value)} className="sm:w-48">
            <option value="all">{t("All cities")}</option>
            {db.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Toolbar>
        <Table sort={sort} head={[{ label: t("Marina"), sortKey: "name" }, { label: t("Location"), sortKey: "city" }, "Status", { label: t("Occupancy today"), sortKey: "occupancy" }, { label: t("Revenue (month)"), sortKey: "revenue" }, "Actions"]} empty={rows.length === 0}>
          {sorted.map((m) => {
            const met = ix.metrics([m.id]);
            const city = ix.city(m.cityId);
            return (
              <tr key={m.id} className="cursor-pointer hover:bg-row-hover" onClick={() => navigate(`/marinas/${m.id}`)}>
                <td>
                  <Link to={`/marinas/${m.id}`} className="font-medium underline-offset-2 hover:underline">{m.name}</Link>
                  <span className="block text-xs text-ink-3">{m.phone}</span>
                </td>
                <td>
                  {city?.name}
                  <span className="block text-xs text-ink-3">{ix.county(city?.countyId ?? "")?.name}</span>
                </td>
                <td><ActiveBadge status={m.status} /></td>
                <td className="w-52">
                  {met.berths ? (
                    <>
                      <Meter value={met.occupancy} label={`${m.name} occupancy`} />
                      <span className="text-xs text-ink-3">{met.occupied} {t("of")} {met.berths} {t("berths")}</span>
                    </>
                  ) : (
                    <span className="text-xs text-ink-3">{t("No berths yet")}</span>
                  )}
                </td>
                <td className="font-medium num">{money(met.revenue)}</td>
                <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Eye} label={t("View {name}", { name: m.name })} onClick={() => navigate(`/marinas/${m.id}`)} />
                  {can("marinas") !== "view" && <IconButton icon={Pencil} label={t("Edit {name}", { name: m.name })} onClick={() => setEditing(m)} />}
                  {user?.role === "admin" && <IconButton icon={Trash} label={t("Delete {name}", { name: m.name })} onClick={() => setDeleting(m)} />}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {adding && <MarinaForm open onClose={() => setParams({})} />}
      {editing && <MarinaForm open marina={editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={t("Delete {name}?", { name: deleting?.name })}
        body={
          deleting && db.berths.some((b) => b.marinaId === deleting.id)
            ? t("This marina has berths and booking history, so it will be set to Inactive instead of deleted. You can reactivate it later.")
            : t("This marina has no berths. It will be removed permanently.")
        }
        confirmLabel={t("Delete marina")}
        onConfirm={() => {
          if (!deleting) return;
          const hasBerths = db.berths.some((b) => b.marinaId === deleting.id);
          const before = db;
          update((d) =>
            hasBerths
              ? { ...d, marinas: d.marinas.map((m) => (m.id === deleting.id ? { ...m, status: "inactive" } : m)) }
              : { ...d, marinas: d.marinas.filter((m) => m.id !== deleting.id) },
            { text: `${hasBerths ? "Deactivated" : "Deleted"} marina ${deleting.name}`, marinaId: deleting.id },
          );
          toast(hasBerths ? t("{name} set to inactive", { name: deleting.name }) : `${deleting.name} deleted`, before);
        }}
      />
    </>
  );
}

export function MarinaDetail() {
  const { id } = useParams();
  const { db, ix, scope, can } = useStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState<Berth | undefined>();
  const marina = db.marinas.find((m) => m.id === id);
  if (!marina || !scope.includes(marina.id))
    return <EmptyState title={t("Marina not found")} body={t("It may have been removed, or you don't have access.")} action={<Button onClick={() => navigate("/marinas")}>{t("Back to marinas")}</Button>} />;

  const m = ix.metrics([marina.id]);
  const months = lastMonths(6);
  const city = ix.city(marina.cityId);
  const berths = db.berths.filter((b) => b.marinaId === marina.id);
  const staff = db.staff.filter((s) => s.marinaId === marina.id);
  const upcoming = ix
    .bookingsIn([marina.id])
    .filter((b) => b.status !== "cancelled" && b.status !== "completed")
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);

  return (
    <>
      <Link to="/marinas" className="mb-3 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("All marinas")}
      </Link>
      <PageHeader
        title={marina.name}
        description={`${marina.address}, ${city?.name}`}
        actions={
          <>
            {can("marinas") !== "view" && <Button icon={Pencil} onClick={() => setEditing(true)}>{t("Edit")}</Button>}
            <Button variant="primary" icon={CalendarPlus} onClick={() => navigate(`/bookings?new=1&marina=${marina.id}`)}>{t("New booking")}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-4">
          <StatCard label={t("Berths occupied")} icon={Gauge} value={`${m.occupied} / ${m.berths}`} sub={`${m.available} available`} to={`/berths?marina=${marina.id}`} />
          <StatCard to={`/berths?marina=${marina.id}`} label={t("Occupancy rate")} icon={CalendarDays} value={pct(m.occupancy)} />
          <StatCard to="/billing" label={t("Revenue booked this month")} icon={DollarSign} value={money(m.revenue)} trend={{ value: m.revenueChange }} />
          <StatCard label={t("Awaiting approval")} icon={CalendarPlus} value={m.pending} to={`/bookings?status=pending&marina=${marina.id}`} />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={t("Revenue")} description={t("Last 6 months")} />
            <div className="p-4"><RevenueChart months={months} series={[{ name: "Revenue", values: ix.revenueByMonth([marina.id], months) }]} /></div>
          </Card>
          <Card>
            <CardHeader title={t("Details")} />
            <dl className="space-y-3 p-5 text-[13px]">
              <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-ink-3" aria-hidden /><span>{marina.address}, {city?.name}, {t(ix.county(city?.countyId ?? "")?.state)}</span></div>
              <div className="flex gap-3"><Phone className="size-4 shrink-0 text-ink-3" aria-hidden /><span>{marina.phone || t("No phone")}</span></div>
              <div className="flex gap-3"><Mail className="size-4 shrink-0 text-ink-3" aria-hidden /><span className="break-all">{marina.email || t("No email")}</span></div>
              <div className="flex flex-wrap gap-1.5 pt-1">{marina.amenities.map((a) => <Badge key={a} tone="outline">{a}</Badge>)}</div>
              <div className="pt-1"><ActiveBadge status={marina.status} /></div>
            </dl>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={t("Upcoming and current bookings")} actions={<Link to={`/bookings?marina=${marina.id}`} className="text-[13px] font-semibold text-green-text hover:underline">{t("View all")}</Link>} />
            {upcoming.length ? (
              <Table head={["Booking", "Boat", "Berth", "Dates", "Status"]}>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium">{b.code}</td>
                    <td>{ix.boat(b.boatId)?.name}</td>
                    <td>{ix.berth(b.berthId)?.code}</td>
                    <td className="whitespace-nowrap">{fmtShort(b.start)} – {fmtShort(b.end)}</td>
                    <td><BookingBadge status={b.status} /></td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title={t("No upcoming bookings")} />
            )}
          </Card>
          <Card>
            <CardHeader title={t("Staff")} description={`${staff.length} people`} />
            <ul>
              {staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{s.name}</p>
                    <p className="text-xs text-ink-3">{s.position} · {t(s.shift)}</p>
                  </div>
                  <ActiveBadge status={s.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card>
          <CardHeader title={t("Berth status")} description={t("Today")} actions={<Link to={`/berths?marina=${marina.id}`} className="text-[13px] font-semibold text-green-text hover:underline">{t("Manage berths")}</Link>} />
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {berths.map((b) => (
              <button key={b.id} onClick={() => setViewing(b)} className="rounded-md border border-line p-2 text-start hover:border-line-strong hover:bg-row-hover cursor-pointer">
                <p className="text-[13px] font-semibold">{b.code}</p>
                <p className="mb-1.5 text-xs text-ink-3">{b.maxLength} {t("ft")}</p>
                <BerthBadge status={ix.berthStatus(b)} />
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("Occupancy")} description={t("Last 6 months")} />
          <div className="p-4"><OccupancyChart months={months} series={[{ name: marina.name, values: ix.occupancyByMonth([marina.id], months) }]} /></div>
        </Card>
      </div>
      {editing && <MarinaForm open marina={marina} onClose={() => setEditing(false)} />}
      {viewing && <BerthDetail berth={viewing} onClose={() => setViewing(undefined)} />}
    </>
  );
}
