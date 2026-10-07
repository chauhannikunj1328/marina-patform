// Maintenance › Parts & supplies: stock per marina, what work orders used, low-stock flags and restocking.
import { useState } from "react";
import { Package, PackagePlus, Plus } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { t, lowStock, money2, withPartsUsed, type InventoryItem, type MaintenanceTask } from "@marina/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Table } from "@/components/ui";

export function PartsCard({ ids, canEdit }: { ids: string[]; canEdit: boolean }) {
  const { db, ix } = useStore();
  const [restocking, setRestocking] = useState<InventoryItem | undefined>();
  const [adding, setAdding] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const items = (db.inventory ?? []).filter((i) => ids.includes(i.marinaId));
  const low = lowStock(items);
  const rows = (lowOnly ? low : items).sort((a, b) => Number(a.qty > a.reorderAt) - Number(b.qty > b.reorderAt) || a.name.localeCompare(b.name));
  const value = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  return (
    <Card className="mt-4" >
      <div id="parts" />
      <CardHeader title={t("Parts & supplies")} description={t("{n} items · {amount} in stock{v}", { n: items.length, amount: money2(value), v: low.length ? t(" · {x} running low", { x: low.length }) : "" })} icon={Package}
        actions={<div className="flex gap-2"><Button size="sm" onClick={() => setLowOnly(!lowOnly)}>{lowOnly ? t("Show all") : t("Low stock ({n})", { n: low.length })}</Button>{canEdit && <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>{t("Add item")}</Button>}</div>} />
      {rows.length === 0 ? (
        <EmptyState icon={Package} title={lowOnly ? t("Nothing is running low") : t("No parts listed")} />
      ) : (
        <Table head={["Item", "Marina", "In stock", "Reorder at", "Unit cost", "Used on open jobs", "Actions"]}>
          {rows.slice(0, 80).map((i) => {
            const used = db.tasks.filter((t) => t.status !== "done" && t.parts?.some((p) => p.itemId === i.id)).length;
            return (
              <tr key={i.id}>
                <td className="font-medium">{i.name}</td>
                <td>{ix.marina(i.marinaId)?.name}</td>
                <td className="num whitespace-nowrap">{i.qty} {i.unit}{i.qty <= i.reorderAt && <span className="ms-2"><Badge tone={i.qty === 0 ? "cancelled" : "pending"}>{i.qty === 0 ? t("Out") : t("Low")}</Badge></span>}</td>
                <td className="num">{i.reorderAt}</td>
                <td className="num">{money2(i.unitCost)}</td>
                <td className="num">{used || "–"}</td>
                <td>{canEdit && <Button size="sm" icon={PackagePlus} onClick={() => setRestocking(i)}>{t("Restock")}</Button>}</td>
              </tr>
            );
          })}
        </Table>
      )}
      {restocking && <RestockForm item={restocking} onClose={() => setRestocking(undefined)} />}
      {adding && <ItemForm ids={ids} onClose={() => setAdding(false)} />}
    </Card>
  );
}

function RestockForm({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const [qty, setQty] = useState(String(Math.max(item.reorderAt * 2 - item.qty, 1)));
  const [error, setError] = useState("");
  const save = () => {
    const n = Number(qty);
    if (!(Number.isInteger(n) && n > 0)) return setError(t("Enter how many arrived."));
    const before = db;
    update((d) => ({ ...d, inventory: (d.inventory ?? []).map((i) => (i.id === item.id ? { ...i, qty: i.qty + n } : i)) }), { text: `Restocked ${n} × ${item.name}`, to: "/maintenance", marinaId: item.marinaId });
    toast(t("{name}: {v} {unit} in stock", { name: item.name, v: item.qty + n, unit: item.unit }), before);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Restock {name}", { name: item.name })} description={t("{qty} {unit} in stock now, reorder at {reorderAt}.", { qty: item.qty, unit: item.unit, reorderAt: item.reorderAt })} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Add to stock")}</Button></>}>
      <Field label={t("How many arrived")} hint={Number(qty) > 0 ? t("Cost {amount}", { amount: money2(Number(qty) * item.unitCost) }) : undefined} error={error}>{(id) => <Input id={id} type="number" min={1} value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} />}</Field>
    </Modal>
  );
}

function ItemForm({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const [f, setF] = useState({ marinaId: ids[0], name: "", unit: "each", qty: "10", reorderAt: "3", unitCost: "" });
  const [error, setError] = useState("");
  const save = () => {
    if (!f.name.trim()) return setError(t("Name the item."));
    if (!(Number(f.unitCost) >= 0) || f.unitCost === "") return setError(t("Enter the unit cost."));
    update((d) => ({ ...d, inventory: [...(d.inventory ?? []), { id: nextId("inv", d.inventory ?? []), marinaId: f.marinaId, name: f.name.trim(), unit: f.unit.trim() || "each", qty: Number(f.qty) || 0, reorderAt: Number(f.reorderAt) || 0, unitCost: Number(f.unitCost) }] }), { text: `Added ${f.name.trim()} to parts & supplies`, to: "/maintenance", marinaId: f.marinaId });
    toast(`${f.name.trim()} added`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Add a part or supply")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Add item")}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("Marina")}>{(id) => <Select id={id} value={f.marinaId} onChange={(e) => setF({ ...f, marinaId: e.target.value })}>{db.marinas.filter((m) => ids.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label={t("Item")} error={error}>{(id) => <Input id={id} value={f.name} placeholder={t("e.g. Dock cleat, 10 in")} onChange={(e) => { setF({ ...f, name: e.target.value }); setError(""); }} />}</Field>
        <Field label={t("Unit")}>{(id) => <Input id={id} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />}</Field>
        <Field label={t("Unit cost")}>{(id) => <Input id={id} type="number" min={0} step="0.01" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: e.target.value })} />}</Field>
        <Field label={t("In stock now")}>{(id) => <Input id={id} type="number" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />}</Field>
        <Field label={t("Reorder at")}>{(id) => <Input id={id} type="number" min={0} value={f.reorderAt} onChange={(e) => setF({ ...f, reorderAt: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

/** "Parts used" on a work order: pick from the marina's stock. */
export function PartsUsed({ task: wo }: { task: MaintenanceTask }) {
  const { db, update, toast } = useStore();
  const items = (db.inventory ?? []).filter((i) => i.marinaId === wo.marinaId);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const item = items.find((i) => i.id === itemId);
  const add = () => {
    const n = Number(qty);
    if (!item || !(n > 0)) return;
    if (n > item.qty) return toast(t("Only {qty} {unit} of {name} in stock", { qty: item.qty, unit: item.unit, name: item.name }), undefined, "warning");
    const before = db;
    update((d) => withPartsUsed(d, wo.id, item.id, n), { text: `Used ${n} × ${item.name} on ${wo.code}`, to: `/maintenance?open=${wo.id}`, marinaId: wo.marinaId });
    toast(t("{n} × {name} taken from stock", { n: n, name: item.name }), before);
    setQty("1");
  };
  const cost = (wo.parts ?? []).reduce((s, p) => s + p.qty * (items.find((i) => i.id === p.itemId)?.unitCost ?? 0), 0);
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[13px] font-semibold">{t("Parts used")} {cost > 0 && <span className="font-normal text-ink-3">· {money2(cost)}</span>}</h3>
      {(wo.parts ?? []).length === 0 ? <p className="mb-2 text-[13px] text-ink-3">{t("None yet.")}</p> : (
        <ul className="mb-2 space-y-1 text-[13px]">
          {wo.parts!.map((p) => { const i = items.find((x) => x.id === p.itemId); return <li key={p.itemId}>{p.qty} × {i?.name ?? t("Part")}</li>; })}
        </ul>
      )}
      {wo.status !== "done" && items.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label={t("Take from stock")}>{(id) => <Select id={id} value={itemId} onChange={(e) => setItemId(e.target.value)}><option value="">{t("Choose a part…")}</option>{items.map((i) => <option key={i.id} value={i.id} disabled={i.qty === 0}>{i.name} ({i.qty} {i.unit} {t("left)")}</option>)}</Select>}</Field></div>
          <div className="w-24"><Field label={t("Qty")}>{(id) => <Input id={id} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />}</Field></div>
          <Button onClick={add} disabled={!item}>{t("Use")}</Button>
        </div>
      )}
    </div>
  );
}
