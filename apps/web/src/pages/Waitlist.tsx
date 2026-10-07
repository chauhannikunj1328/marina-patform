// Waitlist (Bookings › Waitlist): boat owners waiting for a berth at a full marina. When a berth that
// fits frees up for their dates the row shows it; offer it, then book it in one click.
import { useState } from "react";
import { CalendarPlus, Hourglass, Send, Trash, UserPlus } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { addDays, bookingAmount, daysBetween, fmtDate, fmtShort, money, today, withInvoice, withMessage, type Booking, type WaitlistEntry } from "@marina/shared";
import { Badge, Button, EmptyState, Field, IconButton, Input, Modal, Select, Table, Textarea, useDirty } from "@/components/ui";

const STATUS: Record<WaitlistEntry["status"], { tone: "pending" | "info" | "success" | "muted"; label: string }> = {
  waiting: { tone: "pending", label: "Waiting" },
  offered: { tone: "info", label: "Offered" },
  booked: { tone: "success", label: "Booked" },
  removed: { tone: "muted", label: "Removed" },
};

export function WaitlistPanel({ ids, canEdit }: { ids: string[]; canEdit: boolean }) {
  const { db, ix, update, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const rows = (db.waitlist ?? [])
    .filter((w) => ids.includes(w.marinaId) && (showAll || w.status === "waiting" || w.status === "offered"))
    .sort((a, b) => a.start.localeCompare(b.start));

  const offer = (w: WaitlistEntry, berthId: string) => {
    const berth = ix.berth(berthId);
    update(
      (d) => withMessage({ ...d, waitlist: (d.waitlist ?? []).map((x) => (x.id === w.id ? { ...x, status: "offered" as const, offeredBerthId: berthId } : x)) }, { to: w.email, subject: `A berth is free at ${ix.marina(w.marinaId)?.name}: ${berth?.code}, ${fmtShort(w.start)} – ${fmtShort(w.end)}`, kind: "offer", ref: w.id }),
      { text: `Offered berth ${berth?.code} to ${w.name} from the waitlist`, to: "/bookings?view=waitlist", marinaId: w.marinaId },
    );
    toast(`Offer recorded for ${w.name}. Call or email them to confirm.`);
  };

  const book = (w: WaitlistEntry, berthId: string) => {
    const before = db;
    const berth = ix.berth(berthId)!;
    const price = bookingAmount(w.start, w.end, berth, db.settings.monthlyFromNights, db.settings.pricing);
    update((d) => {
      let owners = d.owners, boats = d.boats;
      let owner = d.owners.find((o) => o.email.toLowerCase() === w.email.toLowerCase());
      if (!owner) {
        owner = { id: nextId("o", d.owners), name: w.name, email: w.email, phone: w.phone, since: today() };
        owners = [...owners, owner];
      }
      let boat = d.boats.find((b) => b.ownerId === owner.id && b.name.toLowerCase() === w.boatName.toLowerCase());
      if (!boat) {
        boat = { id: nextId("bt", d.boats), ownerId: owner.id, name: w.boatName, type: "Sailboat", length: w.boatLength, registration: "Pending" };
        boats = [...boats, boat];
      }
      const id = nextId("bk", d.bookings);
      const booking: Booking = { id, code: `BK-${String(Number(id.split("-")[1])).padStart(4, "0")}`, boatId: boat.id, berthId, start: w.start, end: w.end, guests: 2, status: "confirmed", createdAt: today(), price };
      const next = { ...d, owners, boats, bookings: [...d.bookings, booking], waitlist: (d.waitlist ?? []).map((x) => (x.id === w.id ? { ...x, status: "booked" as const, offeredBerthId: berthId, bookingId: id } : x)) };
      return withInvoice(next, id, price);
    }, { text: `Booked ${w.boatName} from the waitlist into berth ${berth.code}, ${fmtShort(w.start)} – ${fmtShort(w.end)}`, to: "/bookings?view=waitlist", marinaId: w.marinaId });
    toast(`${w.boatName} booked into ${berth.code} and invoiced (${money(price)})`, before);
  };

  const remove = (w: WaitlistEntry) => {
    const before = db;
    update((d) => ({ ...d, waitlist: (d.waitlist ?? []).map((x) => (x.id === w.id ? { ...x, status: "removed" as const } : x)) }), { text: `Removed ${w.name} from the waitlist`, marinaId: w.marinaId });
    toast(`${w.name} removed from the waitlist`, before);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show booked and removed</label>
        {canEdit && <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>Add to waitlist</Button>}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Hourglass} title="Nobody on the waitlist" body="When a marina is full, add the boat owner here. You'll see when a berth that fits frees up." />
      ) : (
        <Table head={["Boat owner", "Marina", "Dates", "Status", "Free berth", "Actions"]}>
          {rows.map((w) => {
            const matches = w.status === "waiting" || w.status === "offered" ? ix.waitlistMatches(w) : [];
            const offered = w.offeredBerthId && matches.some((b) => b.id === w.offeredBerthId) ? w.offeredBerthId : undefined;
            const pick = offered ?? matches[0]?.id;
            return (
              <tr key={w.id}>
                <td><p className="font-medium">{w.name}</p><p className="text-xs text-ink-3">{w.boatName} · {w.boatLength} ft · {w.phone}</p>{w.note && <p className="text-xs text-ink-3">“{w.note}”</p>}</td>
                <td>{ix.marina(w.marinaId)?.name}</td>
                <td className="whitespace-nowrap">{fmtShort(w.start)} – {fmtShort(w.end)}<span className="block text-xs text-ink-3">{daysBetween(w.start, w.end)} nights · added {fmtDate(w.createdAt)}</span></td>
                <td><Badge tone={STATUS[w.status].tone}>{STATUS[w.status].label}</Badge>{w.status === "offered" && w.offeredBerthId && <span className="block text-xs text-ink-3">Berth {ix.berth(w.offeredBerthId)?.code}</span>}</td>
                <td>
                  {w.status === "booked" ? <span className="text-xs text-ink-3">{ix.booking(w.bookingId ?? "")?.code}</span>
                    : matches.length ? <span className="font-medium text-green-text">{matches.slice(0, 3).map((b) => b.code).join(", ")}{matches.length > 3 && ` +${matches.length - 3}`}</span>
                    : w.status !== "removed" ? <span className="text-xs text-ink-3">Nothing free yet</span> : null}
                </td>
                <td className="whitespace-nowrap">
                  {canEdit && pick && (w.status === "waiting" || w.status === "offered") && (
                    <span className="inline-flex gap-2">
                      {w.status === "waiting" && <Button size="sm" icon={Send} onClick={() => offer(w, pick)}>Offer {ix.berth(pick)?.code}</Button>}
                      <Button size="sm" variant="primary" icon={CalendarPlus} onClick={() => book(w, pick)}>Book {ix.berth(pick)?.code}</Button>
                    </span>
                  )}
                  {canEdit && (w.status === "waiting" || w.status === "offered") && <IconButton icon={Trash} label={`Remove ${w.name}`} onClick={() => remove(w)} />}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {adding && <AddToWaitlist ids={ids} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddToWaitlist({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const [f, setF] = useState({ marinaId: ids[0], name: "", email: "", phone: "", boatName: "", boatLength: "32", start: addDays(today(), 3), end: addDays(today(), 6), note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({}); };
  const matches = ix.waitlistMatches({ marinaId: f.marinaId, start: f.start, end: f.end, boatLength: Number(f.boatLength) || 0 });
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter the owner's name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email.";
    if (!f.boatName.trim()) e.boatName = "Enter the boat name.";
    if (!(Number(f.boatLength) >= 10)) e.boatLength = "10 ft or more.";
    if (f.start < today()) e.start = "Arrival can't be in the past.";
    if (daysBetween(f.start, f.end) < 1) e.end = "Departure must be after arrival.";
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) => ({ ...d, waitlist: [...(d.waitlist ?? []), { id: nextId("wl", d.waitlist ?? []), marinaId: f.marinaId, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), boatName: f.boatName.trim(), boatLength: Number(f.boatLength), start: f.start, end: f.end, note: f.note.trim() || undefined, status: "waiting", createdAt: today() }] }), { text: `Added ${f.name.trim()} to the waitlist at ${ix.marina(f.marinaId)?.name}`, to: "/bookings?view=waitlist", marinaId: f.marinaId });
    toast(`${f.name.trim()} is on the waitlist`);
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title="Add to waitlist" description="For when the marina is full. You'll see when a berth that fits frees up." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Add to waitlist</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Marina">{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}>{db.marinas.filter((m) => ids.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label="Owner's name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} value={f.phone} onChange={(e) => set("phone", e.target.value)} />}</Field>
        <Field label="Boat name" error={errors.boatName}>{(id) => <Input id={id} value={f.boatName} onChange={(e) => set("boatName", e.target.value)} />}</Field>
        <Field label="Boat length (ft)" error={errors.boatLength}>{(id) => <Input id={id} type="number" min={10} value={f.boatLength} onChange={(e) => set("boatLength", e.target.value)} />}</Field>
        <Field label="Arrival" error={errors.start}>{(id) => <Input id={id} type="date" value={f.start} onChange={(e) => set("start", e.target.value)} />}</Field>
        <Field label="Departure" error={errors.end}>{(id) => <Input id={id} type="date" value={f.end} onChange={(e) => set("end", e.target.value)} />}</Field>
        <div className="sm:col-span-2"><Field label="Note (optional)">{(id) => <Textarea id={id} rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} />}</Field></div>
      </div>
      {matches.length > 0 && <p className="mt-3 text-[13px] text-green-text">{matches.length} {matches.length === 1 ? "berth is" : "berths are"} free for these dates already ({matches.slice(0, 3).map((b) => b.code).join(", ")}). You could book it straight away instead.</p>}
    </Modal>
  );
}
