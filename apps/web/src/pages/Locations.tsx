import { useState } from "react";
import { Link } from "react-router-dom";
import { Building, Landmark, MapPin, Pencil, Plus, Trash, Warehouse } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { City, County } from "@marina/shared";
import { t, count, money, pct } from "@marina/shared";
import { Button, Card, CardHeader, ConfirmDialog, Field, IconButton, Input, Meter, Modal, PageHeader, Select, StatCard, Table, Tabs, useDirty } from "@/components/ui";

type Target = { kind: "city"; item?: City } | { kind: "county"; item?: County };

function LocationForm({ target, onClose }: { target: Target; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const [kind, setKind] = useState<"city" | "county">(target.kind);
  const city = target.kind === "city" ? target.item : undefined;
  const county = target.kind === "county" ? target.item : undefined;
  const editing = !!(city || county);
  const [f, setF] = useState({
    name: city?.name ?? county?.name ?? "",
    countyId: city?.countyId ?? db.counties[0]?.id ?? "",
    state: county?.state ?? "",
    lat: city ? String(city.lat) : "",
    lng: city ? String(city.lng) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const save = () => {
    const e: Record<string, string> = {};
    const name = f.name.trim();
    if (!name) e.name = t("Enter a name.");
    else if (kind === "city" && db.cities.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.countyId === f.countyId && c.id !== city?.id)) e.name = t("This city already exists in that county.");
    else if (kind === "county" && db.counties.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== county?.id)) e.name = t("This county already exists.");
    if (kind === "county" && !f.state.trim()) e.state = t("Enter the state.");
    const lat = Number(f.lat), lng = Number(f.lng);
    if (kind === "city" && (!f.lat || !f.lng || isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) e.coords = t("Enter latitude (−90 to 90) and longitude (−180 to 180).");
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) => {
      if (kind === "city") {
        const data = { name, countyId: f.countyId, lat, lng };
        return city ? { ...d, cities: d.cities.map((c) => (c.id === city.id ? { ...c, ...data } : c)) } : { ...d, cities: [...d.cities, { ...data, id: nextId("ct", d.cities) }] };
      }
      const data = { name, state: f.state.trim() };
      return county ? { ...d, counties: d.counties.map((c) => (c.id === county.id ? { ...c, ...data } : c)) } : { ...d, counties: [...d.counties, { ...data, id: nextId("c", d.counties) }] };
    }, `${editing ? "Updated" : "Added"} ${kind} ${name}`);
    toast(`${name} ${editing ? "updated" : "added"}`);
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={editing ? t("Edit {name}", { name: f.name }) : t("Add location")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{editing ? t("Save changes") : t("Add {kind}", { kind: kind })}</Button></>}>
      <div className="space-y-4">
        {!editing && <Field label={t("Type")}>{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="city">{t("City")}</option><option value="county">{t("County")}</option></Select>}</Field>}
        <Field label={kind === "city" ? t("City name") : t("County name")} error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        {kind === "city" ? (
          <>
            <Field label={t("County")}>{(id) => <Select id={id} value={f.countyId} onChange={(e) => setF({ ...f, countyId: e.target.value })}>{db.counties.map((c) => <option key={c.id} value={c.id}>{c.name}, {t(c.state)}</option>)}</Select>}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Latitude")} error={errors.coords}>{(id) => <Input id={id} value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} placeholder="37.7749" />}</Field>
              <Field label={t("Longitude")}>{(id) => <Input id={id} value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} placeholder="-122.4194" />}</Field>
            </div>
          </>
        ) : (
          <Field label={t("State")} error={errors.state}>{(id) => <Input id={id} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />}</Field>
        )}
      </div>
    </Modal>
  );
}

/** Plots cities on a simple projection of the continental US. No map tiles or external services. */
function LocationMap() {
  const { db, ix } = useStore();
  const [selected, setSelected] = useState<string | undefined>(db.cities[0]?.id);
  const W = 800, H = 440;
  const bounds = { west: -125, east: -66, north: 50, south: 24 };
  const x = (lng: number) => ((lng - bounds.west) / (bounds.east - bounds.west)) * W;
  const y = (lat: number) => ((bounds.north - lat) / (bounds.north - bounds.south)) * H;
  // Rough outline of the lower 48 states for orientation only.
  const outline: [number, number][] = [[-124.7, 48.4], [-123, 46], [-124.2, 42], [-124.4, 40.3], [-122.4, 37.2], [-120.6, 34.6], [-117.1, 32.5], [-114.7, 32.7], [-111, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-103, 29], [-101.4, 29.8], [-99.5, 27.5], [-97.2, 25.9], [-97.4, 27.8], [-94.7, 29.4], [-91, 29.2], [-89.4, 29], [-88, 30.4], [-85.4, 29.7], [-83, 29], [-82.7, 27.5], [-81.2, 25.2], [-80.1, 25.8], [-80.5, 28.5], [-81.4, 30.7], [-79.2, 33.2], [-75.5, 35.2], [-76, 37], [-74, 40.5], [-71, 41.5], [-70, 43.7], [-67, 44.8], [-67.8, 47.1], [-69.2, 47.4], [-71.5, 45], [-75, 45], [-76.5, 43.6], [-79, 43.3], [-79.2, 42.5], [-82.5, 41.7], [-82.4, 43], [-83.5, 46.1], [-84.6, 46.5], [-88.4, 48.3], [-89.6, 48], [-95.2, 49], [-123, 49], [-124.7, 48.4]];
  const path = outline.map(([lng, lat], i) => `${i ? "L" : "M"}${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join(" ") + "Z";
  // Cities closer than ~30px are fanned out downward so markers and labels don't overlap.
  const placed: { c: City; px: number; py: number; stack: number }[] = [];
  for (const c of [...db.cities].sort((a, b) => b.lat - a.lat)) {
    const stack = placed.filter((p) => Math.hypot(x(p.c.lng) - x(c.lng), y(p.c.lat) - y(c.lat)) < 30).length;
    placed.push({ c, px: x(c.lng) + stack * 6, py: y(c.lat) + stack * 22, stack });
  }
  const city = db.cities.find((c) => c.id === selected);
  const ids = city ? ix.marinaIdsInCity(city.id) : [];
  const m = ix.metrics(ids);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px]">
      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("Map of cities with marinas")}>
          <path d={path} fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth={1.5} />
          {placed.map(({ c, px, py, stack }) => {
            const n = ix.marinaIdsInCity(c.id).length;
            const r = 6 + n * 3;
            const on = c.id === selected;
            return (
              <g key={c.id} onClick={() => setSelected(c.id)} className="cursor-pointer" role="button" aria-label={t("{name}, {n} marinas", { name: c.name, n: n })} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(c.id)}>
                {stack > 0 && <line x1={x(c.lng)} y1={y(c.lat)} x2={px} y2={py} stroke="var(--border-strong)" />}
                <circle cx={px} cy={py} r={r} fill={on ? "var(--ring-1)" : "var(--surface)"} stroke="var(--ring-1)" strokeWidth={2} />
                <text x={px + r + 4} y={py + 4} fontSize={12} fill="var(--text)" fontWeight={on ? 600 : 400} paintOrder="stroke" stroke="var(--surface-2)" strokeWidth={3}>{c.name}</text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-xs text-ink-3">{t("Circle size shows the number of marinas. Click a city for details.")}</p>
      </div>
      <div className="border-t border-line xl:border-t-0 xl:border-s">
        {city ? (
          <>
            <CardHeader title={city.name} description={`${ix.county(city.countyId)?.name}, ${ix.county(city.countyId)?.state}`} />
            <dl className="space-y-3 p-5 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-3">{t("Marinas")}</dt><dd className="font-medium">{ids.length}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">{t("Berths")}</dt><dd className="font-medium">{m.berths}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">{t("Occupancy today")}</dt><dd className="font-medium">{pct(m.occupancy)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">{t("Revenue booked this month")}</dt><dd className="font-medium">{money(m.revenue)}</dd></div>
            </dl>
            <ul className="border-t border-line">
              {ids.map((id) => (
                <li key={id}><Link to={`/marinas/${id}`} className="block px-5 py-2.5 text-[13px] hover:bg-row-hover">{ix.marina(id)?.name}</Link></li>
              ))}
            </ul>
            {ids.length > 0 && <div className="p-5"><Link to={`/city/${city.id}`}><Button className="w-full">{t("Open city dashboard")}</Button></Link></div>}
          </>
        ) : (
          <p className="p-5 text-[13px] text-ink-3">{t("Select a city on the map.")}</p>
        )}
      </div>
    </div>
  );
}

export function Locations() {
  const { db, ix, update, toast } = useStore();
  const [tab, setTab] = useState<"counties" | "cities" | "map">("counties");
  const [form, setForm] = useState<Target | undefined>();
  const [deleting, setDeleting] = useState<Target | undefined>();

  const blocker = (t: Target) =>
    t.kind === "city"
      ? db.marinas.some((m) => m.cityId === t.item?.id) && "It still has marinas. Move or remove them first."
      : db.cities.some((c) => c.countyId === t.item?.id) && "It still has cities. Move or remove them first.";

  return (
    <>
      <PageHeader title={t("Locations")} description={t("Counties and cities your marinas belong to")} actions={<Button variant="primary" icon={Plus} onClick={() => setForm({ kind: tab === "counties" ? "county" : "city" })}>{t("Add location")}</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label={t("Counties")} icon={Landmark} value={db.counties.length} active={tab === "counties"} onClick={() => setTab("counties")} />
        <StatCard label={t("Cities")} icon={Building} value={db.cities.length} active={tab === "cities"} onClick={() => setTab("cities")} />
        <StatCard label={t("Marinas")} icon={MapPin} value={db.marinas.length} to="/marinas" />
        <StatCard label={t("Berths")} icon={Warehouse} value={count(db.berths.length)} to="/berths" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "counties", label: t("Counties"), count: db.counties.length }, { value: "cities", label: t("Cities"), count: db.cities.length }, { value: "map", label: t("Map") }]} />
      <Card>
        {tab === "counties" && (
          <Table head={["County", "State", "Cities", "Marinas", "Berths", "Occupancy", "Revenue (month)", "Actions"]}>
            {db.counties.map((c) => {
              const ids = ix.marinaIdsInCounty(c.id);
              const m = ix.metrics(ids);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{ids.length ? <Link to={`/county/${c.id}`} className="underline-offset-2 hover:underline">{c.name}</Link> : c.name}</td>
                  <td>{t(c.state)}</td>
                  <td>{db.cities.filter((x) => x.countyId === c.id).length}</td>
                  <td>{ids.length}</td>
                  <td>{m.berths}</td>
                  <td className="w-40">{m.berths ? <Meter value={m.occupancy} label={`${c.name} occupancy`} /> : <span className="text-xs text-ink-3">{t("No berths")}</span>}</td>
                  <td className="num">{money(m.revenue)}</td>
                  <td className="whitespace-nowrap">
                    <IconButton icon={Pencil} label={t("Edit {name}", { name: c.name })} onClick={() => setForm({ kind: "county", item: c })} />
                    <IconButton icon={Trash} label={t("Delete {name}", { name: c.name })} onClick={() => setDeleting({ kind: "county", item: c })} />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
        {tab === "cities" && (
          <Table head={["City", "County", "Marinas", "Berths", "Occupancy", "Coordinates", "Actions"]}>
            {db.cities.map((c) => {
              const ids = ix.marinaIdsInCity(c.id);
              const m = ix.metrics(ids);
              const county = ix.county(c.countyId);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{ids.length ? <Link to={`/city/${c.id}`} className="underline-offset-2 hover:underline">{c.name}</Link> : c.name}</td>
                  <td>{county?.name}<span className="block text-xs text-ink-3">{t(county?.state)}</span></td>
                  <td>{ids.length}</td>
                  <td>{m.berths}</td>
                  <td className="w-40">{m.berths ? <Meter value={m.occupancy} label={`${c.name} occupancy`} /> : <span className="text-xs text-ink-3">{t("No berths")}</span>}</td>
                  <td className="text-xs text-ink-3 num">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</td>
                  <td className="whitespace-nowrap">
                    <IconButton icon={Pencil} label={t("Edit {name}", { name: c.name })} onClick={() => setForm({ kind: "city", item: c })} />
                    <IconButton icon={Trash} label={t("Delete {name}", { name: c.name })} onClick={() => setDeleting({ kind: "city", item: c })} />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
        {tab === "map" && <LocationMap />}
      </Card>
      {form && <LocationForm target={form} onClose={() => setForm(undefined)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={t("Delete {name}?", { name: deleting?.item?.name })}
        body={(deleting && blocker(deleting)) || t("It will be removed permanently.")}
        confirmLabel={t("Delete")}
        onConfirm={() => {
          if (!deleting?.item) return;
          const why = blocker(deleting);
          if (why) return toast(`${deleting.item.name} kept. ${why}`, undefined, "warning");
          const id = deleting.item.id;
          update((d) => (deleting.kind === "city" ? { ...d, cities: d.cities.filter((c) => c.id !== id) } : { ...d, counties: d.counties.filter((c) => c.id !== id) }), `Deleted ${deleting.kind} ${deleting.item.name}`);
          toast(`${deleting.item.name} deleted`);
        }}
      />
    </>
  );
}
