// Join a full marina's waitlist. Staff see the request on the web app's Waitlist tab and offer
// a berth when one frees up.
import { useState } from "react";
import { fmtDate, t, today, withWaitlistRequest } from "@marina/shared";
import { useStore } from "@/data/store";
import { openMarinas } from "@/lib/marinas";
import { Button, Field, Input, Modal, Notice, Select, Textarea } from "./ui";

const stamp = () => new Date().toISOString();

export function WaitlistDialog({ marinaId, start, end, length, onClose }: { marinaId?: string; start: string; end: string; length: number; onClose: () => void }) {
  const { db, owner, update, toast } = useStore();
  const marinas = openMarinas(db);
  const boats = owner ? db.boats.filter((b) => b.ownerId === owner.id) : [];
  const [f, setF] = useState({
    marinaId: marinaId || marinas[0]?.id || "",
    name: owner?.name ?? "",
    email: owner?.email ?? "",
    phone: owner?.phone ?? "",
    boatName: boats[0]?.name ?? "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors({}); };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = t("Enter a valid email.");
    if (!f.boatName.trim()) e.boatName = t("Enter your boat's name.");
    if (Object.keys(e).length) return setErrors(e);
    const r = withWaitlistRequest(db, { marinaId: f.marinaId, name: f.name, email: f.email, phone: f.phone.trim(), boatName: f.boatName, boatLength: length, start, end, note: f.note, now: today(), at: stamp() });
    const marina = marinas.find((m) => m.id === f.marinaId)?.name ?? "";
    if (r.duplicate) toast(t("You're already on the waitlist at {marina} for these dates", { marina }));
    else {
      update(() => r.db);
      toast(t("You're on the waitlist at {marina}", { marina }));
    }
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Join the waitlist")} description={t("{from} to {to} · boat up to {ft} ft", { from: fmtDate(start), to: fmtDate(end), ft: length })}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={submit}>{t("Join the waitlist")}</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("Marina")}>{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}>{marinas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        </div>
        <Field label={t("Your name")} error={errors.name}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label={t("Email")} error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label={t("Phone")} hint={t("Optional")}>{(id) => <Input id={id} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />}</Field>
        <Field label={t("Boat name")} error={errors.boatName}>{(id) => <Input id={id} list="my-boats" value={f.boatName} onChange={(e) => set("boatName", e.target.value)} />}</Field>
        <datalist id="my-boats">{boats.map((b) => <option key={b.id} value={b.name} />)}</datalist>
        <div className="sm:col-span-2">
          <Field label={t("Anything we should know?")} hint={t("Optional")}>{(id) => <Textarea id={id} rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} />}</Field>
        </div>
        <div className="sm:col-span-2"><Notice>{t("If a berth frees up, the dock office offers it to people on the waitlist in order. Nothing is charged until you book.")}</Notice></div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
