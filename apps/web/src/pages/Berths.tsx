import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleDashed, DollarSign, Droplets, Eye, Pencil, Plus, QrCode as QrIcon, Sailboat, Trash, Wrench, Zap } from "lucide-react";
import { BerthDetail } from "@/components/BerthDetail";
import { BerthLabels } from "@/components/BerthLabels";
import { MetersPanel } from "./Meters";
import { nextId, useStore } from "@/data/store";
import type { Berth, BerthType } from "@marina/shared";
import type { BerthStatus } from "@marina/shared";
import { money } from "@marina/shared";
import { fmtShort } from "@marina/shared";
import { Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, StatCard, Table, Tabs, Toolbar, useDirty, useSort } from "@/components/ui";
import { BerthBadge, berthLabel } from "@/components/status";

function BerthForm({ berth, defaultMarina, onClose }: { berth?: Berth; defaultMarina: string; onClose: () => void }) {
  const { db, scope, update, toast } = useStore();
  const [f, setF] = useState(() => ({
    marinaId: berth?.marinaId ?? defaultMarina,
    code: berth?.code ?? "",
    maxLength: String(berth?.maxLength ?? 35),
    type: berth?.type ?? ("Floating" as BerthType),
    dailyRate: String(berth?.dailyRate ?? 50),
    monthlyRate: String(berth?.monthlyRate ?? 1100),
    power: berth?.power ?? true,
    water: berth?.water ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const e: Record<string, string> = {};
    const code = f.code.trim().toUpperCase();
    if (!/^[A-Z]{1,2}-\d{1,3}$/.test(code)) e.code = "Use the dock letter and number, e.g. A-12.";
    else if (db.berths.some((b) => b.marinaId === f.marinaId && b.code === code && b.id !== berth?.id)) e.code = "This berth number already exists at this marina.";
    const len = Number(f.maxLength), daily = Number(f.dailyRate), monthly = Number(f.monthlyRate);
    if (!(len >= 10 && len <= 300)) e.maxLength = "Enter a length between 10 and 300 ft.";
    if (!(daily > 0)) e.dailyRate = "Enter a daily rate above $0.";
    if (!(monthly > 0)) e.monthlyRate = "Enter a monthly rate above $0.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { marinaId: f.marinaId, code, maxLength: len, type: f.type, dailyRate: daily, monthlyRate: monthly, power: f.power, water: f.water };
    update((d) =>
      berth
        ? { ...d, berths: d.berths.map((b) => (b.id === berth.id ? { ...b, ...data } : b)) }
        : { ...d, berths: [...d.berths, { ...data, id: `${f.marinaId}-${code.replace("-", "")}-${nextId("x", d.berths).split("-")[1]}`, underMaintenance: false }] },
      { text: `Berth ${code} ${berth ? "updated" : "added"} at ${db.marinas.find((m) => m.id === f.marinaId)?.name}`, marinaId: f.marinaId },
    );
    toast(berth ? `Berth ${code} updated` : `Berth ${code} added`);
    onClose();
  };

  return (
    <Modal
      open
      dirty={dirty}
      onClose={onClose}
      title={berth ? `Edit berth ${berth.code}` : "Add berth"}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{berth ? "Save changes" : "Add berth"}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Marina">
          {(id) => (
            <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)} disabled={!!berth}>
              {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Berth number" error={errors.code} hint="Dock letter and number">{(id) => <Input id={id} value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="A-12" />}</Field>
        <Field label="Max boat length (ft)" error={errors.maxLength}>{(id) => <Input id={id} type="number" min={10} value={f.maxLength} onChange={(e) => set("maxLength", e.target.value)} />}</Field>
        <Field label="Type">
          {(id) => (
            <Select id={id} value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option>Floating</option><option>Fixed</option><option>Mooring</option>
            </Select>
          )}
        </Field>
        <Field label="Daily rate ($)" error={errors.dailyRate}>{(id) => <Input id={id} type="number" min={1} value={f.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} />}</Field>
        <Field label="Monthly rate ($)" error={errors.monthlyRate} hint="Used for stays of 28+ nights">{(id) => <Input id={id} type="number" min={1} value={f.monthlyRate} onChange={(e) => set("monthlyRate", e.target.value)} />}</Field>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.power} onChange={(e) => set("power", e.target.checked)} className="size-4 accent-[var(--primary)]" /> Shore power</label>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.water} onChange={(e) => set("water", e.target.checked)} className="size-4 accent-[var(--primary)]" /> Fresh water</label>
      </div>
    </Modal>
  );
}

export function Berths() {
  const { db, ix, scope, update, toast, can } = useStore();
  const canEdit = can("berths") !== "view";
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"list" | "map" | "meters">("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | BerthStatus>(() => (params.get("status") as BerthStatus) ?? "all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Berth | "new" | undefined>();
  const [deleting, setDeleting] = useState<Berth | undefined>();
  const [viewing, setViewing] = useState<Berth | undefined>();
  const [labels, setLabels] = useState(false);
  const marinaId = params.get("marina") ?? "all";
  const marinas = db.marinas.filter((m) => scope.includes(m.id));
  const ids = marinaId === "all" ? scope : [marinaId];

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ix
      .berthsIn(ids)
      .map((b) => ({ b, st: ix.berthStatus(b), cur: ix.currentBooking(b.id), next: ix.nextBooking(b.id) }))
      .filter((r) => status === "all" || r.st === status)
      .filter((r) => {
        if (!s) return true;
        const boat = r.cur && ix.boat(r.cur.boatId);
        return r.b.code.toLowerCase().includes(s) || boat?.name.toLowerCase().includes(s) || ix.marina(r.b.marinaId)?.name.toLowerCase().includes(s);
      });
  }, [ix, ids, status, q]);

  const m = ix.metrics(ids);
  const { sorted, sort } = useSort(rows, {
    code: (r) => `${ix.marina(r.b.marinaId)?.name} ${r.b.code}`,
    size: (r) => r.b.maxLength,
    status: (r) => berthLabel[r.st],
    price: (r) => r.b.dailyRate,
  });
  const pg = paginate(sorted, page);
  const filters = (q ? 1 : 0) + (status !== "all" ? 1 : 0) + (marinaId !== "all" ? 1 : 0);
  const clearFilters = () => { setQ(""); setStatus("all"); setParams({}); setPage(1); };
  const dailyPotential = ix.berthsIn(ids).filter((b) => !b.underMaintenance).reduce((s, b) => s + b.dailyRate, 0);

  const toggleMaintenance = (b: Berth) => {
    if (!b.underMaintenance && ix.currentBooking(b.id)) {
      toast(`Berth ${b.code} is occupied. Move the boat before marking it for maintenance.`, undefined, "warning");
      return;
    }
    const before = db;
    update(
      (d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }),
      { text: `Berth ${b.code} at ${ix.marina(b.marinaId)?.name} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId },
    );
    const affected = b.underMaintenance ? 0 : ix.serviceConflicts(b.id).length;
    toast(
      b.underMaintenance ? `Berth ${b.code} back in service` : affected ? `Berth ${b.code} out of service. ${affected} upcoming booking${affected > 1 ? "s need" : " needs"} a new berth (Bookings › Conflicts).` : `Berth ${b.code} marked for maintenance`,
      before,
      affected ? "warning" : "success",
    );
  };

  return (
    <>
      <PageHeader
        title="Berths"
        description="Dock spaces, sizes, pricing and today's availability"
        actions={
          <>
            <Button icon={QrIcon} onClick={() => setLabels(true)}>QR labels</Button>
            {canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add berth</Button>}
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="Available" icon={CircleDashed} value={m.available} sub={`of ${m.berths} berths`} active={status === "available"} onClick={() => { setStatus(status === "available" ? "all" : "available"); setPage(1); }} />
        <StatCard label="Occupied" icon={Sailboat} value={m.occupied} sub={`${m.reserved} reserved this week`} active={status === "occupied"} onClick={() => { setStatus(status === "occupied" ? "all" : "occupied"); setPage(1); }} />
        <StatCard label="In maintenance" icon={Wrench} value={m.maintenance} active={status === "maintenance"} onClick={() => { setStatus(status === "maintenance" ? "all" : "maintenance"); setPage(1); }} />
        <StatCard label="Daily revenue capacity" icon={DollarSign} value={money(dailyPotential)} sub="If every working berth is filled" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "list", label: "List" }, { value: "map", label: "Dock map" }, { value: "meters", label: "Meters" }]} />
      <Card>
        <Toolbar active={filters} onClear={clearFilters}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search berth, boat or marina" />
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => { setParams(e.target.value === "all" ? {} : { marina: e.target.value }); setPage(1); }} className="sm:w-56">
            <option value="all">All marinas</option>
            {marinas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="sm:w-44">
            <option value="all">All statuses</option>
            {(Object.keys(berthLabel) as BerthStatus[]).map((s) => <option key={s} value={s}>{berthLabel[s]}</option>)}
          </Select>
        </Toolbar>

        {tab === "list" ? (
          <>
            <Table sort={sort} head={[{ label: "Berth", sortKey: "code" }, "Marina", { label: "Size & type", sortKey: "size" }, "Services", { label: "Status", sortKey: "status" }, { label: "Pricing", sortKey: "price" }, "Actions"]} empty={rows.length === 0}>
              {pg.rows.map(({ b, st, cur, next }) => {
                const boat = cur && ix.boat(cur.boatId);
                return (
                  <tr key={b.id} className="cursor-pointer hover:bg-row-hover" onClick={() => setViewing(b)}>
                    <td>
                      <span className="font-medium">{b.code}</span>
                      {boat && <span className="block text-xs text-ink-3">{boat.name} · until {fmtShort(cur!.end)}</span>}
                      {!boat && next && <span className="block text-xs text-ink-3">Next: {fmtShort(next.start)}</span>}
                    </td>
                    <td>{ix.marina(b.marinaId)?.name}</td>
                    <td>{b.maxLength} ft<span className="block text-xs text-ink-3">{b.type}</span></td>
                    <td>
                      <span className="flex gap-1.5 text-ink-2">
                        {b.power && <span title="Shore power"><Zap className="size-4" aria-label="Shore power" /></span>}
                        {b.water && <span title="Fresh water"><Droplets className="size-4" aria-label="Fresh water" /></span>}
                        {!b.power && !b.water && <span className="text-xs text-ink-3">None</span>}
                      </span>
                    </td>
                    <td><BerthBadge status={st} /></td>
                    <td className="num whitespace-nowrap">{money(b.dailyRate)}/day<span className="block text-xs text-ink-3">{money(b.monthlyRate)}/month</span></td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon={Eye} label={`Open berth ${b.code}`} onClick={() => setViewing(b)} />
                      {canEdit && (
                      <>
<IconButton icon={Wrench} label={b.underMaintenance ? `Return ${b.code} to service` : `Mark ${b.code} for maintenance`} onClick={() => toggleMaintenance(b)} />
                      <IconButton icon={Pencil} label={`Edit berth ${b.code}`} onClick={() => setEditing(b)} />
                      <IconButton icon={Trash} label={`Delete berth ${b.code}`} onClick={() => setDeleting(b)} />
                      </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pagination page={pg.page} pages={pg.pages} total={rows.length} onPage={setPage} />
          </>
        ) : tab === "map" ? (
          <DockMap rows={rows} onOpen={setViewing} />
        ) : (
          <MetersPanel berths={rows.map((r) => r.b)} canEdit={canEdit} />
        )}
      </Card>

      {viewing && <BerthDetail berth={viewing} onClose={() => setViewing(undefined)} onEdit={() => { setEditing(viewing); setViewing(undefined); }} />}
      {editing && <BerthForm berth={editing === "new" ? undefined : editing} defaultMarina={marinaId === "all" ? scope[0] : marinaId} onClose={() => setEditing(undefined)} />}
      {labels && <BerthLabels defaultMarina={marinaId} onClose={() => setLabels(false)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={`Delete berth ${deleting?.code}?`}
        body={
          deleting && (ix.bookingsByBerth.get(deleting.id)?.length ?? 0) > 0
            ? "This berth has booking history, so it can't be deleted. Mark it for maintenance to take it out of service instead."
            : "This berth will be removed permanently."
        }
        confirmLabel="Delete berth"
        onConfirm={() => {
          if (!deleting) return;
          if ((ix.bookingsByBerth.get(deleting.id)?.length ?? 0) > 0) return toast("Berth kept: it has booking history", undefined, "warning");
          const before = db;
          update((d) => ({ ...d, berths: d.berths.filter((b) => b.id !== deleting.id) }), { text: `Berth ${deleting.code} deleted`, marinaId: deleting.marinaId });
          toast(`Berth ${deleting.code} deleted`, before);
        }}
      />
    </>
  );
}

function DockMap({ rows, onOpen }: { rows: { b: Berth; st: BerthStatus }[]; onOpen: (b: Berth) => void }) {
  const { ix } = useStore();
  if (!rows.length) return <EmptyState title="No berths match these filters" />;
  const byMarina = new Map<string, { b: Berth; st: BerthStatus }[]>();
  rows.forEach((r) => byMarina.set(r.b.marinaId, [...(byMarina.get(r.b.marinaId) ?? []), r]));
  // Teal scale for occupancy (guide 03), coral for maintenance (guide 07).
  const fill: Record<BerthStatus, string> = {
    occupied: "bg-teal-strong text-on-teal-strong border-transparent",
    reserved: "bg-teal-soft text-on-teal-soft border-transparent",
    available: "bg-surface text-ink border-line-strong",
    maintenance: "bg-st-maint-bg text-st-maint-fg border-dashed border-st-maint-fg",
  };
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap gap-3 text-xs text-ink-2">
        {(Object.keys(fill) as BerthStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-2"><span className={`size-3.5 rounded-sm border ${fill[s]}`} />{berthLabel[s]}</span>
        ))}
      </div>
      {[...byMarina.entries()].map(([mid, list]) => {
        const docks = new Map<string, typeof list>();
        list.forEach((r) => docks.set(r.b.code.split("-")[0], [...(docks.get(r.b.code.split("-")[0]) ?? []), r]));
        return (
          <div key={mid}>
            <h3 className="mb-2 font-semibold">{ix.marina(mid)?.name}</h3>
            <div className="space-y-3">
              {[...docks.entries()].map(([dock, items]) => (
                <div key={dock} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-medium text-ink-3">Dock {dock}</span>
                  <div className="flex flex-1 flex-wrap gap-2 border-l-4 border-teal-faint pl-3">
                    {items.map(({ b, st }) => (
                      <button
                        key={b.id}
                        onClick={() => onOpen(b)}
                        title={`${b.code} · ${b.maxLength} ft · ${berthLabel[st]}`}
                        aria-label={`Berth ${b.code}, ${b.maxLength} feet, ${berthLabel[st]}`}
                        className={`num flex h-12 w-14 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-transform duration-[120ms] hover:scale-105 cursor-pointer ${fill[st]}`}
                      >
                        {b.code.split("-")[1]}
                        <span className="text-[10px] opacity-70">{b.maxLength}ft</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
