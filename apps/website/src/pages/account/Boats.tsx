// The owner's boats: add one, or update name, type, length and registration.
import { useState } from "react";
import { Pencil, Plus, Ship } from "lucide-react";
import { ownerBookings, t, today, withBoat, type Boat, type BoatType, ftM } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, Card, EmptyState, Field, Input, Modal, Select, usePageTitle } from "@/components/ui";

const BOAT_TYPES: BoatType[] = ["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"];

function BoatForm({ boat, onClose }: { boat?: Boat; onClose: () => void }) {
  const { db, ix, owner, update, toast } = useStore();
  const [f, setF] = useState({ name: boat?.name ?? "", type: boat?.type ?? BOAT_TYPES[0], length: boat ? String(boat.length) : "", registration: boat?.registration ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    const length = Number(f.length);
    if (!f.name.trim()) e.name = t("Enter your boat's name.");
    if (!(length > 0 && length <= 200)) e.length = t("Enter your boat's length in feet.");
    // A longer boat must still fit the berths it's booked into.
    if (boat && length > boat.length) {
      const tooSmall = ownerBookings(db, owner!.id).find((b) => b.boatId === boat.id && b.end > today() && b.status !== "cancelled" && b.status !== "completed" && (ix.berth(b.berthId)?.maxLength ?? 0) < length);
      if (tooSmall) e.length = t("Booking {code} is for a berth that takes up to {ft} ft. Contact the marina to change berths first.", { code: tooSmall.code, ft: ix.berth(tooSmall.berthId)?.maxLength });
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) => withBoat(d, owner!.id, { id: boat?.id, name: f.name.trim(), type: f.type, length, registration: f.registration.trim() }).db);
    toast(boat ? t("{name} updated", { name: f.name.trim() }) : t("{name} added", { name: f.name.trim() }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={boat ? t("Edit {name}", { name: boat.name }) : t("Add a boat")}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{boat ? t("Save changes") : t("Add boat")}</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Boat name")} error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />}</Field>
        <Field label={t("Type")}>{(id) => <Select id={id} value={f.type} onChange={(e) => setF((s) => ({ ...s, type: e.target.value as BoatType }))}>{BOAT_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}</Select>}</Field>
        <Field label={t("Length (ft)")} error={errors.length}>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={200} value={f.length} onChange={(e) => setF((s) => ({ ...s, length: e.target.value }))} />}</Field>
        <Field label={t("Registration")} hint={t("Optional")}>{(id) => <Input id={id} value={f.registration} onChange={(e) => setF((s) => ({ ...s, registration: e.target.value }))} />}</Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export function MyBoats() {
  const { db, owner } = useStore();
  usePageTitle(t("My boats"));
  const [editing, setEditing] = useState<Boat | "new" | undefined>();
  if (!owner) return null;
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[22px] leading-[30px] font-medium">{t("My boats")}</h2>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setEditing("new")}>{t("Add a boat")}</Button>
      </div>
      {boats.length === 0 ? (
        <Card><EmptyState icon={Ship} title={t("No boats yet")} body={t("Add your boat so we can match it to berths it fits.")} action={<Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>{t("Add a boat")}</Button>} /></Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {boats.map((b) => (
            <li key={b.id}>
              <Card className="flex items-start justify-between gap-3 p-5">
                <div>
                  <p className="text-[17px] font-medium">{b.name}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{t(b.type)} · <span className="num">{ftM(b.length)}</span></p>
                  <p className="mt-1 text-xs text-ink-3">{b.registration ? <bdi>{b.registration}</bdi> : t("No registration on file")}</p>
                </div>
                <Button size="sm" icon={Pencil} onClick={() => setEditing(b)}>{t("Edit")}</Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && <BoatForm boat={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
