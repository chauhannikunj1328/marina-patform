import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleDashed, DollarSign, Droplets, Eye, Pencil, Plus, QrCode as QrIcon, Sailboat, Trash, Wrench, Zap } from "lucide-react";
import { BerthDetail } from "@/components/BerthDetail";
import { BerthLabels } from "@/components/BerthLabels";
import { MetersPanel } from "./Meters";
import { nextId, useStore } from "@/data/store";
import type { Berth, BerthType } from "@marina/shared";
import type { BerthStatus } from "@marina/shared";
import { tn, t, money } from "@marina/shared";
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
    if (!/^[A-Z]{1,2}-\d{1,3}$/.test(code)) e.code = t("Use the dock letter and number, e.g. A-12.");
    else if (db.berths.some((b) => b.marinaId === f.marinaId && b.code === code && b.id !== berth?.id)) e.code = t("This berth number already exists at this marina.");
    const len = Number(f.maxLength), daily = Number(f.dailyRate), monthly = Number(f.monthlyRate);
    if (!(len >= 10 && len <= 300)) e.maxLength = t("Enter a length between 10 and 300 ft.");
    if (!(daily > 0)) e.dailyRate = t("Enter a daily rate above $0.");
    if (!(monthly > 0)) e.monthlyRate = t("Enter a monthly rate above $0.");
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { marinaId: f.marinaId, code, maxLength: len, type: f.type, dailyRate: daily, monthlyRate: monthly, power: f.power, water: f.water };
    update((d) =>
      berth
        ? { ...d, berths: d.berths.map((b) => (b.id === berth.id ? { ...b, ...data } : b)) }
        : { ...d, berths: [...d.berths, { ...data, id: `${f.marinaId}-${code.replace("-", "")}-${nextId("x", d.berths).split("-")[1]}`, underMaintenance: false }] },
      { text: `Berth ${code} ${berth ? "updated" : "added"} at ${db.marinas.find((m) => m.id === f.marinaId)?.name}`, marinaId: f.marinaId },
    );
    toast(berth ? t("Berth {code} updated", { code: code }) : t("Berth {code} added", { code: code }));
    onClose();
  };

  return (
    <Modal
      open
      dirty={dirty}
      onClose={onClose}
      title={berth ? t("Edit berth {code}", { code: berth.code }) : t("Add berth")}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{berth ? t("Save changes") : t("Add berth")}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("Marina")}>
          {(id) => (
            <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)} disabled={!!berth}>
              {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t("Berth number")} error={errors.code} hint={t("Dock letter and number")}>{(id) => <Input id={id} value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="A-12" />}</Field>
        <Field label={t("Max boat length (ft)")} error={errors.maxLength}>{(id) => <Input id={id} type="number" min={10} value={f.maxLength} onChange={(e) => set("maxLength", e.target.value)} />}</Field>
        <Field label={t("Type")}>
          {(id) => (
            <Select id={id} value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option>{t("Floating")}</option><option>{t("Fixed")}</option><option>{t("Mooring")}</option>
            </Select>
          )}
        </Field>
        <Field label={t("Daily rate ($)")} error={errors.dailyRate}>{(id) => <Input id={id} type="number" min={1} value={f.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} />}</Field>
        <Field label={t("Monthly rate ($)")} error={errors.monthlyRate} hint={t("Used for stays of 28+ nights")}>{(id) => <Input id={id} type="number" min={1} value={f.monthlyRate} onChange={(e) => set("monthlyRate", e.target.value)} />}</Field>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.power} onChange={(e) => set("power", e.target.checked)} className="size-4 accent-[var(--primary)]" /> {t("Shore power")}</label>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.water} onChange={(e) => set("water", e.target.checked)} className="size-4 accent-[var(--primary)]" /> {t("Fresh water")}</label>
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
  const ids = useMemo(() => (marinaId === "all" ? scope : [marinaId]), [marinaId, scope]);

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
      toast(t("Berth {code} is occupied. Move the boat before marking it for maintenance.", { code: b.code }), undefined, "warning");
      return;
    }
    const before = db;
    update(
      (d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }),
      { text: `Berth ${b.code} at ${ix.marina(b.marinaId)?.name} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId },
    );
    const affected = b.underMaintenance ? 0 : ix.serviceConflicts(b.id).length;
    toast(
      b.underMaintenance ? t("Berth {code} back in service", { code: b.code }) : affected ? tn(affected, "Berth {code} out of service. {n} upcoming booking needs a new berth (Bookings › Conflicts).", "Berth {code} out of service. {n} upcoming bookings need a new berth (Bookings › Conflicts).", { code: b.code }) : t("Berth {code} marked for maintenance", { code: b.code }),
      before,
      affected ? "warning" : "success",
    );
  };

  return (
    <>
      <PageHeader
        title={t("Berths")}
        description={t("Dock spaces, sizes, pricing and today's availability")}
        actions={
          <>
            <Button icon={QrIcon} onClick={() => setLabels(true)}>{t("QR labels")}</Button>
            {canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>{t("Add berth")}</Button>}
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label={t("Available")} icon={CircleDashed} value={m.available} sub={t("of {berths} berths", { berths: m.berths })} active={status === "available"} onClick={() => { setStatus(status === "available" ? "all" : "available"); setPage(1); }} />
        <StatCard label={t("Occupied")} icon={Sailboat} value={m.occupied} sub={t("{reserved} reserved this week", { reserved: m.reserved })} active={status === "occupied"} onClick={() => { setStatus(status === "occupied" ? "all" : "occupied"); setPage(1); }} />
        <StatCard label={t("In maintenance")} icon={Wrench} value={m.maintenance} active={status === "maintenance"} onClick={() => { setStatus(status === "maintenance" ? "all" : "maintenance"); setPage(1); }} />
        <StatCard label={t("Daily revenue capacity")} icon={DollarSign} value={money(dailyPotential)} sub={t("If every working berth is filled")} />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "list", label: t("List") }, { value: "map", label: t("Dock map") }, { value: "meters", label: t("Meters") }]} />
      <Card>
        <Toolbar active={filters} onClear={clearFilters}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t("Search berth, boat or marina")} />
          <Select aria-label={t("Filter by marina")} value={marinaId} onChange={(e) => { setParams(e.target.value === "all" ? {} : { marina: e.target.value }); setPage(1); }} className="sm:w-56">
            <option value="all">{t("All marinas")}</option>
            {marinas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
          <Select aria-label={t("Filter by status")} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="sm:w-44">
            <option value="all">{t("All statuses")}</option>
            {(Object.keys(berthLabel) as BerthStatus[]).map((s) => <option key={s} value={s}>{t(berthLabel[s])}</option>)}
          </Select>
        </Toolbar>

        {tab === "list" ? (
          <>
            <Table sort={sort} head={[{ label: t("Berth"), sortKey: "code" }, "Marina", { label: t("Size & type"), sortKey: "size" }, "Services", { label: t("Status"), sortKey: "status" }, { label: t("Pricing"), sortKey: "price" }, "Actions"]} empty={rows.length === 0}>
              {pg.rows.map(({ b, st, cur, next }) => {
                const boat = cur && ix.boat(cur.boatId);
                return (
                  <tr key={b.id} className="cursor-pointer hover:bg-row-hover" onClick={() => setViewing(b)}>
                    <td>
                      <span className="font-medium">{b.code}</span>
                      {boat && <span className="block text-xs text-ink-3">{boat.name} {t("· until")} {fmtShort(cur!.end)}</span>}
                      {!boat && next && <span className="block text-xs text-ink-3">{t("Next:")} {fmtShort(next.start)}</span>}
                    </td>
                    <td>{ix.marina(b.marinaId)?.name}</td>
                    <td>{b.maxLength} {t("ft")}<span className="block text-xs text-ink-3">{t(b.type)}</span></td>
                    <td>
                      <span className="flex gap-1.5 text-ink-2">
                        {b.power && <span title={t("Shore power")}><Zap className="size-4" aria-label={t("Shore power")} /></span>}
                        {b.water && <span title={t("Fresh water")}><Droplets className="size-4" aria-label={t("Fresh water")} /></span>}
                        {!b.power && !b.water && <span className="text-xs text-ink-3">{t("None")}</span>}
                      </span>
                    </td>
                    <td><BerthBadge status={st} /></td>
                    <td className="num whitespace-nowrap">{money(b.dailyRate)}{t("/day")}<span className="block text-xs text-ink-3">{money(b.monthlyRate)}{t("/month")}</span></td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon={Eye} label={t("Open berth {code}", { code: b.code })} onClick={() => setViewing(b)} />
                      {canEdit && (
                      <>
<IconButton icon={Wrench} label={b.underMaintenance ? t("Return {code} to service", { code: b.code }) : t("Mark {code} for maintenance", { code: b.code })} onClick={() => toggleMaintenance(b)} />
                      <IconButton icon={Pencil} label={t("Edit berth {code}", { code: b.code })} onClick={() => setEditing(b)} />
                      <IconButton icon={Trash} label={t("Delete berth {code}", { code: b.code })} onClick={() => setDeleting(b)} />
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
        title={t("Delete berth {code}?", { code: deleting?.code })}
        body={
          deleting && (ix.bookingsByBerth.get(deleting.id)?.length ?? 0) > 0
            ? t("This berth has booking history, so it can't be deleted. Mark it for maintenance to take it out of service instead.")
            : t("This berth will be removed permanently.")
        }
        confirmLabel={t("Delete berth")}
        onConfirm={() => {
          if (!deleting) return;
          if ((ix.bookingsByBerth.get(deleting.id)?.length ?? 0) > 0) return toast(t("Berth kept: it has booking history"), undefined, "warning");
          const before = db;
          update((d) => ({ ...d, berths: d.berths.filter((b) => b.id !== deleting.id) }), { text: `Berth ${deleting.code} deleted`, marinaId: deleting.marinaId });
          toast(t("Berth {code} deleted", { code: deleting.code }), before);
        }}
      />
    </>
  );
}

function DockMap({ rows, onOpen }: { rows: { b: Berth; st: BerthStatus }[]; onOpen: (b: Berth) => void }) {
  const { ix } = useStore();
  if (!rows.length) return <EmptyState title={t("No berths match these filters")} />;
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
          <span key={s} className="flex items-center gap-2"><span className={`size-3.5 rounded-sm border ${fill[s]}`} />{t(berthLabel[s])}</span>
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
                  <span className="w-14 shrink-0 text-xs font-medium text-ink-3">{t("Dock")} {dock}</span>
                  <div className="flex flex-1 flex-wrap gap-2 border-s-4 border-teal-faint ps-3">
                    {items.map(({ b, st }) => (
                      <button
                        key={b.id}
                        onClick={() => onOpen(b)}
                        title={t("{code} · {maxLength} ft · {v}", { code: b.code, maxLength: b.maxLength, v: berthLabel[st] })}
                        aria-label={t("Berth {code}, {maxLength} feet, {v}", { code: b.code, maxLength: b.maxLength, v: berthLabel[st] })}
                        className={`num flex h-12 w-14 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-transform duration-[120ms] hover:scale-105 cursor-pointer ${fill[st]}`}
                      >
                        {b.code.split("-")[1]}
                        <span className="text-[10px] opacity-70">{b.maxLength}{t("ft")}</span>
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
