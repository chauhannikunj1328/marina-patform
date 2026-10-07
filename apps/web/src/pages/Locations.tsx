import { useState } from "react";
import { Link } from "react-router-dom";
import { Building, Landmark, MapPin, Pencil, Plus, Trash, Warehouse } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { City, County } from "@marina/shared";
import { t, count, marinaPoint, money, pct } from "@marina/shared";
import { MapView, type MapMarker } from "@/components/MapView";
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

/** Every marina on a street map; picking one shows its city's figures beside the map. */
function LocationMap() {
  const { db, ix } = useStore();
  const [selected, setSelected] = useState<string | undefined>(db.cities[0]?.id);
  const markers: MapMarker[] = db.marinas.flatMap((mr) => {
    const p = marinaPoint(mr, ix.city(mr.cityId));
    return p ? [{ id: mr.id, ...p, label: `${mr.name}, ${ix.city(mr.cityId)?.name ?? ""}`, muted: mr.status === "inactive", selected: mr.cityId === selected }] : [];
  });
  const city = db.cities.find((c) => c.id === selected);
  const ids = city ? ix.marinaIdsInCity(city.id) : [];
  const m = ix.metrics(ids);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px]">
      <div className="p-4">
        <MapView label={t("Map of marinas")} markers={markers} onSelect={(id) => setSelected(ix.marina(id)?.cityId)} height={460} zoom={11} />
        <p className="mt-2 text-xs text-ink-3">{t("Each pin is a marina. Click one to see its city.")}</p>
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
