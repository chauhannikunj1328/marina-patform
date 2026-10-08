import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Anchor, ArrowLeft, CalendarDays, CalendarPlus, DollarSign, Eye, Gauge, List, Mail, Map as MapIcon, MapPin, Navigation, Pencil, Phone, Plus, Trash, Warehouse } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { Berth, Marina } from "@marina/shared";
import { BerthDetail } from "@/components/BerthDetail";
import { t, count, directionsUrl, marinaPoint, money, pct, validPoint, ftM } from "@marina/shared";
import { MapView, type MapMarker } from "@/components/MapView";
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
  // Position as typed; empty means "use the city's center".
  const [pos, setPos] = useState({ lat: marina?.lat !== undefined ? String(marina.lat) : "", lng: marina?.lng !== undefined ? String(marina.lng) : "" });
  const dirty = useDirty({ form, pos });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("Enter the marina name.");
    else if (db.marinas.some((m) => m.name.toLowerCase() === form.name.trim().toLowerCase() && m.id !== marina?.id)) e.name = t("A marina with this name already exists.");
    if (!form.address.trim()) e.address = t("Enter the street address.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = t("Enter a valid email.");
    const hasPos = pos.lat.trim() !== "" || pos.lng.trim() !== "";
    if (hasPos && !validPoint(Number(pos.lat), Number(pos.lng))) e.pos = t("Enter latitude (−90 to 90) and longitude (−180 to 180).");
    setErrors(e);
    if (Object.keys(e).length) return;
    const point = hasPos ? { lat: Number(pos.lat), lng: Number(pos.lng) } : { lat: undefined, lng: undefined };
    update((d) =>
      marina
        ? { ...d, marinas: d.marinas.map((m) => (m.id === marina.id ? { ...m, ...form, ...point, name: form.name.trim() } : m)) }
        : { ...d, marinas: [...d.marinas, { ...form, ...point, name: form.name.trim(), id: nextId("m", d.marinas) }] },
      { text: `${marina ? "Updated" : "Added"} marina ${form.name.trim()}`, marinaId: marina?.id },
    );
    toast(marina ? t("{name} updated", { name: form.name }) : t("{name} added", { name: form.name }));
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
        <div className="sm:col-span-2">
          <LocationPicker cityId={form.cityId} pos={pos} onChange={setPos} error={errors.pos} />
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
                  {t(a)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

/** Where the marina is: click the map or type coordinates. Left empty, the city's center is used. */
function LocationPicker({ cityId, pos, onChange, error }: { cityId: string; pos: { lat: string; lng: string }; onChange: (p: { lat: string; lng: string }) => void; error?: string }) {
  const { ix } = useStore();
  const city = ix.city(cityId);
  // The map follows typed coordinates and city changes, but not its own clicks (so it doesn't jump).
  const [typed, setTyped] = useState(0);
  const type = (p: { lat: string; lng: string }) => { onChange(p); setTyped((n) => n + 1); };
  const own = validPoint(Number(pos.lat), Number(pos.lng)) && pos.lat.trim() !== "" && pos.lng.trim() !== "";
  const point = own ? { lat: Number(pos.lat), lng: Number(pos.lng) } : city ? { lat: city.lat, lng: city.lng } : undefined;
  return (
    <fieldset>
      <legend className="mb-1 text-[13px] font-medium">{t("Location on the map")}</legend>
      <p className="mb-2 text-xs text-ink-3">{own ? t("Click the map to move the pin.") : t("Click the map where the marina is. Until then it shows at the city's center.")}</p>
      <MapView
        label={t("Choose the marina's location")}
        markers={point ? [{ id: "here", ...point, label: t("Marina location"), muted: !own }] : []}
        onPick={(p) => onChange({ lat: String(p.lat), lng: String(p.lng) })}
        height={220}
        zoom={own ? 15 : 12}
        fitKey={`${cityId}:${typed}`}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={t("Latitude")} error={error}>{(id) => <Input id={id} inputMode="decimal" value={pos.lat} onChange={(e) => type({ ...pos, lat: e.target.value })} placeholder={city ? String(city.lat) : "37.8067"} />}</Field>
        <Field label={t("Longitude")}>{(id) => <Input id={id} inputMode="decimal" value={pos.lng} onChange={(e) => type({ ...pos, lng: e.target.value })} placeholder={city ? String(city.lng) : "-122.4430"} />}</Field>
      </div>
    </fieldset>
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
  const view = params.get("view") === "map" ? "map" : "list";
  const setView = (v: "list" | "map") => setParams(v === "map" ? { view: "map" } : {}, { replace: true });
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
          <div role="group" aria-label={t("View")} className="flex shrink-0 rounded-full bg-surface-3 p-1 sm:ms-auto">
            {([["list", List, t("List")], ["map", MapIcon, t("Map")]] as const).map(([v, Icon, name]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${view === v ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
                <Icon className="size-3.5" aria-hidden /> {name}
              </button>
            ))}
          </div>
        </Toolbar>
        {view === "map" ? (
          <div className="p-4">
            <MapView
              label={t("Map of marinas")}
              height={520}
              zoom={12}
              markers={rows.flatMap((m): MapMarker[] => {
                const p = marinaPoint(m, ix.city(m.cityId));
                if (!p) return [];
                const met = ix.metrics([m.id]);
                return [{
                  id: m.id, ...p, label: m.name, muted: m.status === "inactive",
                  popup: (
                    <div className="min-w-48">
                      <Link to={`/marinas/${m.id}`} className="font-semibold text-ink underline-offset-2 hover:underline">{m.name}</Link>
                      <p className="text-xs text-ink-3">{m.address}, {ix.city(m.cityId)?.name}</p>
                      <p className="mt-2 num">{t("{occupied} of {berths} berths", { occupied: met.occupied, berths: met.berths })} · {pct(met.occupancy)}</p>
                      <p className="num">{t("{amount} this month", { amount: money(met.revenue) })}</p>
                      {m.status === "inactive" && <p className="mt-1 text-xs font-semibold text-ink-3">{t("Inactive")}</p>}
                    </div>
                  ),
                }];
              })}
            />
            {rows.length === 0 && <p className="mt-3 text-[13px] text-ink-3">{t("Nothing matches these filters. Try a different search or clear the filters.")}</p>}
          </div>
        ) : (
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
        )}
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
          toast(hasBerths ? t("{name} set to inactive", { name: deleting.name }) : t("{name} deleted", { name: deleting.name }), before);
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
  const point = marinaPoint(marina, city);
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
          <StatCard label={t("Berths occupied")} icon={Gauge} value={`${m.occupied} / ${m.berths}`} sub={t("{n} available", { n: m.available })} to={`/berths?marina=${marina.id}`} />
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
              <div className="flex flex-wrap gap-1.5 pt-1">{marina.amenities.map((a) => <Badge key={a} tone="outline">{t(a)}</Badge>)}</div>
              <div className="pt-1"><ActiveBadge status={marina.status} /></div>
            </dl>
            {point && (
              <div className="px-5 pb-5">
                <MapView label={t("Map of {name}", { name: marina.name })} markers={[{ id: marina.id, ...point, label: marina.name, selected: true }]} height={200} zoom={15} />
                <a href={directionsUrl(point)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-text hover:underline">
                  <Navigation className="size-4" aria-hidden /> {t("Directions")}
                </a>
              </div>
            )}
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
                <p className="mb-1.5 text-xs text-ink-3">{ftM(b.maxLength)}</p>
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
