// Detail sheets and actions shared by the staff tabs: bookings, berths, tasks, problem reports.
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { Banknote, CalendarCog, Camera, CircleCheck, CircleX, ImagePlus, LogIn, LogOut, Mail, Phone, Search, TriangleAlert, X } from "lucide-react-native";
import {
  addDays, bookingAmount, daysBetween, fmtDate, fmtShort, money2, nextId, relative, today, withInvoice,
  type Berth, type Booking, type BookingStatus, type BoatType, type Invoice, type MaintenanceTask, type PaymentMethod, type Priority,
} from "@marina/shared";
import { ALL, useMe, useStore } from "../store";
import { MarinaPicker } from "./office";
import { OwnerSheet } from "./owner";
import { useTheme } from "../theme";
import { pickPhoto, takePhoto } from "../lib/photos";
import { BerthBadge, BookingBadge, PriorityBadge, TaskBadge } from "./status";
import { Badge, Button, Chip, DayChips, Field, Input, Row, Segmented, Sheet, Stepper, Txt } from "./ui";

/** Check in / check out, with Undo and an activity log entry. */
export function useBookingStatus() {
  const { db, ix, update, toast } = useStore();
  return (bk: Booking, status: BookingStatus) => {
    const boat = ix.boat(bk.boatId);
    const before = db;
    const msg = status === "checked-in" ? `${boat?.name} checked in` : `${boat?.name} checked out`;
    update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === bk.id ? { ...x, status } : x)) }), { text: `${msg} (${bk.code})`, to: `/bookings?q=${bk.code}`, marinaId: ix.berth(bk.berthId)?.marinaId });
    toast(msg, before);
  };
}

export function BookingSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, can } = useStore();
  const { t } = useTheme();
  const setStatus = useBookingStatus();
  const [paying, setPaying] = useState<Invoice | undefined>();
  const [changing, setChanging] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { user, update, toast } = useStore();
  const office = user?.role === "admin" || user?.role === "manager";
  const b = db.bookings.find((x) => x.id === booking.id) ?? booking;
  const boat = ix.boat(b.boatId);
  const owner = ix.ownerOfBooking(b);
  const berth = ix.berth(b.berthId);
  const canEdit = can("bookings") !== "view";
  const canCheckIn = canEdit && b.status === "confirmed" && b.start <= today();
  const canCheckOut = canEdit && b.status === "checked-in";
  return (
    <Sheet
      open
      onClose={onClose}
      title={boat?.name ?? "Booking"}
      subtitle={`${b.code} · Berth ${berth?.code}`}
      footer={
        office && canEdit && b.status === "pending" ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button style={{ flex: 1 }} size="lg" label="Decline" onPress={() => setCancelling(true)} />
            <Button style={{ flex: 1 }} variant="primary" size="lg" label="Approve" disabled={!ix.isFree(b.berthId, b.start, b.end, b.id)} onPress={() => {
              const before = db;
              update((d) => withInvoice({ ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "confirmed" as const } : x)) }, b.id, ix.amount(b)), { text: `Approved booking ${b.code} for ${boat?.name}`, to: `/bookings?q=${b.code}`, marinaId: berth?.marinaId });
              toast(`${boat?.name} approved and invoiced`, before);
            }} />
          </View>
        )
        : canCheckIn ? <Button variant="primary" size="lg" icon={LogIn} label="Check in" onPress={() => { setStatus(b, "checked-in"); onClose(); }} />
        : canCheckOut ? <Button variant="primary" size="lg" icon={LogOut} label="Check out" onPress={() => { setStatus(b, "completed"); onClose(); }} />
        : <Button size="lg" label="Close" onPress={onClose} />
      }
    >
      <View style={{ marginBottom: 16 }}><BookingBadge status={b.status} /></View>
      <Row label="Boat" value={`${boat?.type} · ${boat?.length} ft`} sub={boat?.registration} />
      <Row label="Dates" value={`${fmtShort(b.start)} – ${fmtShort(b.end)}`} sub={`${daysBetween(b.start, b.end)} ${daysBetween(b.start, b.end) === 1 ? "night" : "nights"} · ${b.guests} ${b.guests === 1 ? "guest" : "guests"}`} />
      <Row label="Berth" value={`${berth?.code} · up to ${berth?.maxLength} ft`} sub={`${berth?.type}${berth?.power ? " · power" : ""}${berth?.water ? " · water" : ""}`} />
      {owner && can("owners") !== "none" ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Boat owner ${owner.name}. Open their details`} onPress={() => setOwnerOpen(true)}>
          <Row label="Boat owner" value={`${owner.name} ›`} sub={owner.email} />
        </Pressable>
      ) : (
        <Row label="Boat owner" value={owner?.name ?? ""} sub={owner?.email} />
      )}
      {b.status === "pending" && (
        <View style={{ backgroundColor: t.status.pending.bg, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Txt v="bodySm" color={t.status.pending.fg}>Waiting for a manager to approve this booking.</Txt>
        </View>
      )}
      <InvoiceRow bookingId={b.id} onPay={setPaying} />
      {owner && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button style={{ flex: 1 }} icon={Phone} label="Call" disabled={!owner.phone} onPress={() => Linking.openURL(`tel:${owner.phone.replace(/[^\d+]/g, "")}`)} />
          <Button style={{ flex: 1 }} icon={Mail} label="Email" onPress={() => Linking.openURL(`mailto:${owner.email}?subject=${encodeURIComponent(`Your stay at ${ix.marinaOfBerth(b.berthId)?.name}`)}`)} />
        </View>
      )}
      {canEdit && (b.status === "pending" || b.status === "confirmed" || b.status === "checked-in") && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button style={{ flex: 1 }} size="sm" icon={CalendarCog} label={b.status === "checked-in" ? "Extend or move" : "Change"} onPress={() => setChanging(true)} />
          {b.status !== "checked-in" && <Button style={{ flex: 1 }} size="sm" icon={CircleX} label="Cancel booking" onPress={() => setCancelling(true)} />}
        </View>
      )}
      {paying && <PaymentSheet invoice={paying} onClose={() => setPaying(undefined)} />}
      {changing && <ChangeBookingSheet booking={b} onClose={() => setChanging(false)} />}
      {ownerOpen && owner && <OwnerSheet owner={owner} onClose={() => setOwnerOpen(false)} />}
      {cancelling && <CancelBookingSheet booking={b} decline={b.status === "pending"} onClose={() => setCancelling(false)} />}
    </Sheet>
  );
}

/** Invoice summary with a Take payment button when money is still owed. */
function InvoiceRow({ bookingId, onPay }: { bookingId: string; onPay: (inv: Invoice) => void }) {
  const { db, ix, can } = useStore();
  const { t } = useTheme();
  const inv = db.invoices.find((i) => i.bookingId === bookingId && i.status !== "void");
  if (!inv || can("billing") === "none") return null;
  const owed = ix.balance(inv);
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginBottom: 12, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Txt v="bodySm" weight="medium">Invoice {inv.number}</Txt>
          <Txt v="caption" num color={t.text3}>{money2(inv.amount)} · paid {money2(ix.paidSoFar(inv))}</Txt>
        </View>
        {inv.status === "paid" ? <Badge tone="success" icon={CircleCheck} label="Paid" />
          : inv.status === "overdue" ? <Badge tone="cancelled" label={`${money2(owed)} overdue`} />
          : <Badge tone="pending" label={`${money2(owed)} due`} />}
      </View>
      {owed > 0 && can("billing") !== "view" && <Button size="sm" icon={Banknote} label="Take payment" onPress={() => onPay(inv)} style={{ alignSelf: "flex-start" }} />}
    </View>
  );
}

const DOCK_METHODS: PaymentMethod[] = ["Card", "Cash", "Check"];

/** Record money taken at the dock (card reader, cash or check) against an invoice. Same rules as Billing on the web. */
export function PaymentSheet({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const methods: PaymentMethod[] = user?.role === "staff" ? DOCK_METHODS : [...DOCK_METHODS, "Bank transfer"];
  const balance = ix.balance(invoice);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [error, setError] = useState("");
  const save = () => {
    const value = Math.round(Number(amount.replace(/[^\d.]/g, "")) * 100) / 100;
    if (!(value > 0)) return setError("Enter an amount above zero.");
    if (value > balance) return setError(`That's more than the ${money2(balance)} still owed.`);
    const before = db;
    const full = value >= balance;
    const now = today();
    update(
      (d) => ({ ...d, invoices: d.invoices.map((i) => (i.id === invoice.id ? { ...i, payments: [...i.payments, { date: now, amount: value, method }], ...(full ? { status: "paid" as const, paidAt: now, method } : {}) } : i)) }),
      { text: `Recorded ${money2(value)} ${full ? "payment" : "part payment"} for ${invoice.number} (${method})`, to: `/billing?open=${invoice.id}`, marinaId: ix.marinaOfInvoice(invoice) },
    );
    toast(full ? `${invoice.number} is paid` : `${money2(value)} taken. ${money2(balance - value)} still owed.`, before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Take payment" subtitle={`${invoice.number} · ${money2(balance)} owed`} footer={<Button variant="primary" size="lg" label={`Record ${money2(Number(amount) || 0)}`} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="Amount" error={error}>
          <Input value={amount} onChangeText={(v) => { setAmount(v); setError(""); }} keyboardType="decimal-pad" inputMode="decimal" invalid={!!error} accessibilityLabel="Amount" />
        </Field>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Full balance" on={Number(amount) === balance} onPress={() => setAmount(balance.toFixed(2))} />
          <Chip label="Half" on={Number(amount) === Math.round(balance * 50) / 100} onPress={() => setAmount((Math.round(balance * 50) / 100).toFixed(2))} />
        </View>
        <Field label="Paid by" hint={method === "Card" ? "Run the card on the marina's card reader first, then record it here." : method === "Check" ? "Write the invoice number on the back of the check." : method === "Bank transfer" ? "Record it once the money shows in the bank account." : "Hand the cash to the front desk at the end of your shift."}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {methods.map((m) => <Chip key={m} label={m} on={method === m} onPress={() => setMethod(m)} />)}
          </View>
        </Field>
      </View>
    </Sheet>
  );
}

const BOAT_TYPES: BoatType[] = ["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"];

/**
 * New booking: pick or add the boat, choose the arrival day and a free berth that fits.
 * Arriving today covers walk-ins, with the option to check the boat in straight away.
 */
export function NewBookingSheet({ onClose, onDone }: { onClose: () => void; onDone: (bookingId: string) => void }) {
  const { db, ix, update, toast, marinaId: current, scope } = useStore();
  const { t } = useTheme();
  const [marinaId, setMarina] = useState(current === ALL ? scope[0] : current);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [q, setQ] = useState("");
  const [boatId, setBoatId] = useState("");
  const [f, setF] = useState({ owner: "", phone: "", email: "", boat: "", type: "Sailboat" as BoatType, length: "" });
  const [nights, setNights] = useState(1);
  const [guests, setGuests] = useState(2);
  const [berthId, setBerthId] = useState("");
  const [checkInNow, setCheckIn] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [start, setStart] = useState(today());
  const now = start;
  const arrivingToday = start === today();
  const checkIn = arrivingToday && checkInNow;
  const end = addDays(now, nights);
  const s = q.trim().toLowerCase();
  const matches = s.length < 2 ? [] : db.boats.filter((b) => b.name.toLowerCase().includes(s) || b.registration.toLowerCase().includes(s) || ix.owner(b.ownerId)?.name.toLowerCase().includes(s)).slice(0, 6);
  const boat = ix.boat(boatId);
  const length = mode === "existing" ? boat?.length ?? 0 : Number(f.length) || 0;
  const free = db.berths
    .filter((b) => b.marinaId === marinaId && !b.underMaintenance && b.maxLength >= length && ix.isFree(b.id, now, end))
    .sort((a, b) => a.maxLength - b.maxLength || a.code.localeCompare(b.code));
  const berth = free.find((b) => b.id === berthId);
  const price = berth ? bookingAmount(now, end, berth, db.settings.monthlyFromNights) : 0;
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({}); };

  const save = () => {
    const e: Record<string, string> = {};
    if (mode === "existing") {
      if (!boat) e.boat = "Find the boat, or add a new one.";
      // A boat can't hold two berths for the same nights.
      const clash = boat && db.bookings.find((b) => b.boatId === boat.id && ["pending", "confirmed", "checked-in"].includes(b.status) && b.start < end && b.end > now);
      if (clash) e.boat = `${boat?.name} already has ${clash.code} at berth ${ix.berth(clash.berthId)?.code} (${fmtShort(clash.start)} – ${fmtShort(clash.end)}).`;
    } else {
      if (!f.owner.trim()) e.owner = "Enter the owner's name.";
      if (!f.phone.trim() && !f.email.trim()) e.contact = "Add a phone number or email so we can reach them.";
      if (!f.boat.trim()) e.newBoat = "Enter the boat name.";
      if (!(Number(f.length) >= 10)) e.length = "Enter the boat length in feet (10 or more).";
    }
    if (!berth) e.berth = free.length ? "Choose a berth." : `No berth is free and big enough ${arrivingToday ? "tonight" : "for those nights"}.`;
    setErrors(e);
    if (Object.keys(e).length || !berth) return;
    const id = nextId("bk", db.bookings);
    const status: BookingStatus = checkIn ? "checked-in" : "confirmed";
    const name = mode === "existing" ? boat!.name : f.boat.trim();
    update((d) => {
      let owners = d.owners, boats = d.boats, bId = boatId;
      if (mode === "new") {
        const ownerId = nextId("o", d.owners);
        bId = nextId("bt", d.boats);
        owners = [...owners, { id: ownerId, name: f.owner.trim(), email: f.email.trim(), phone: f.phone.trim(), since: today() }];
        boats = [...boats, { id: bId, ownerId, name, type: f.type, length: Number(f.length), registration: "Pending" }];
      }
      const booking: Booking = { id, code: `BK-${String(Number(id.split("-")[1])).padStart(4, "0")}`, boatId: bId, berthId: berth.id, start: now, end, guests, status, createdAt: today() };
      return withInvoice({ ...d, owners, boats, bookings: [...d.bookings, booking] }, id, price);
    }, { text: `${arrivingToday ? "Walk-in booking" : "New booking"} for ${name} at berth ${berth.code}, ${fmtShort(now)}, ${nights} ${nights === 1 ? "night" : "nights"}${checkIn ? ", checked in" : ""}`, marinaId });
    toast(checkIn ? `${name} booked and checked in` : `${name} booked for ${fmtShort(now)} and invoiced`);
    onDone(id);
  };

  return (
    <Sheet open onClose={onClose} title="New booking" subtitle={arrivingToday ? "Arriving today, or pick a later day" : `Arriving ${fmtShort(start)}`} footer={<Button variant="primary" size="lg" icon={checkIn ? LogIn : undefined} label={berth ? `${checkIn ? "Book and check in" : "Book"} · ${money2(price)}` : "Book"} onPress={save} />}>
      <View style={{ gap: 16 }}>
        {current === ALL && <MarinaPicker value={marinaId} onChange={(id) => { setMarina(id); setBerthId(""); }} />}
        <Segmented value={mode} onChange={(v) => { setMode(v); setErrors({}); }} items={[{ value: "existing", label: "Known boat" }, { value: "new", label: "New boat" }]} />
        {mode === "existing" ? (
          <Field label="Boat" error={errors.boat}>
            {boat ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${boat.name}. Change boat`} onPress={() => { setBoatId(""); setBerthId(""); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.primary, borderRadius: 12, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{boat.name}</Txt>
                  <Txt v="caption" color={t.text3}>{boat.type} · {boat.length} ft · {ix.owner(boat.ownerId)?.name}</Txt>
                </View>
                <Txt v="bodySm" weight="semibold" color={t.greenText}>Change</Txt>
              </Pressable>
            ) : (
              <View style={{ gap: 8 }}>
                <View style={{ justifyContent: "center" }}>
                  <Search size={18} color={t.text3} style={{ position: "absolute", left: 14, zIndex: 1 }} />
                  <Input value={q} onChangeText={setQ} placeholder="Boat name, registration or owner" style={{ paddingLeft: 40 }} autoCorrect={false} invalid={!!errors.boat} />
                </View>
                {matches.map((b) => (
                  <Pressable key={b.id} accessibilityRole="button" onPress={() => { setBoatId(b.id); setBerthId(""); setErrors({}); }} style={({ pressed }) => ({ borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : t.surface })}>
                    <Txt weight="medium">{b.name}</Txt>
                    <Txt v="caption" color={t.text3}>{b.type} · {b.length} ft · {b.registration} · {ix.owner(b.ownerId)?.name}</Txt>
                  </Pressable>
                ))}
                {s.length >= 2 && matches.length === 0 && (
                  <Pressable accessibilityRole="button" onPress={() => { setMode("new"); setF({ ...f, boat: q.trim() }); }}>
                    <Txt v="bodySm" color={t.text3}>No boat matches. <Txt v="bodySm" weight="semibold" color={t.greenText}>Add it as a new boat</Txt></Txt>
                  </Pressable>
                )}
              </View>
            )}
          </Field>
        ) : (
          <>
            <Field label="Owner's name" error={errors.owner}><Input value={f.owner} onChangeText={(v) => set("owner", v)} autoComplete="name" invalid={!!errors.owner} /></Field>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field label="Phone"><Input value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" autoComplete="tel" invalid={!!errors.contact} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Email"><Input value={f.email} onChangeText={(v) => set("email", v)} keyboardType="email-address" autoCapitalize="none" invalid={!!errors.contact} /></Field></View>
            </View>
            {errors.contact ? <Txt v="caption" weight="medium" color={t.error.fg} style={{ marginTop: -8 }}>{errors.contact}</Txt> : null}
            <Field label="Boat name" error={errors.newBoat}><Input value={f.boat} onChangeText={(v) => set("boat", v)} invalid={!!errors.newBoat} /></Field>
            <Field label="Length (ft)" error={errors.length}><Input value={f.length} onChangeText={(v) => { set("length", v.replace(/\D/g, "")); setBerthId(""); }} keyboardType="number-pad" invalid={!!errors.length} /></Field>
            <Field label="Type">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BOAT_TYPES.map((x) => <Chip key={x} label={x} on={f.type === x} onPress={() => set("type", x)} />)}
              </View>
            </Field>
          </>
        )}
        <Field label="Arrival"><DayChips days={Array.from({ length: 120 }, (_, i) => addDays(today(), i))} value={start} onChange={(d) => { setStart(d); setBerthId(""); setErrors({}); }} /></Field>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
          <Field label="Nights" hint={`Leaves ${fmtShort(end)}`}><Stepper label="nights" value={nights} onChange={(n) => { setNights(n); setBerthId(""); }} max={60} /></Field>
          <Field label="Guests"><Stepper label="guests" value={guests} onChange={setGuests} max={20} /></Field>
        </View>
        <Field label="Berth" error={errors.berth} hint={length ? `Free ${arrivingToday ? "from tonight" : `from ${fmtShort(start)}`}${nights > 1 ? ` for ${nights} nights` : ""} and fits ${length} ft, smallest first.` : "Choose the boat first to see berths that fit."}>
          {length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {free.slice(0, 12).map((b) => <Chip key={b.id} label={b.code} sub={`${b.maxLength} ft`} on={berthId === b.id} onPress={() => { setBerthId(b.id); setErrors({}); }} />)}
            </View>
          )}
        </Field>
        {berth && <Row label="Price" value={money2(price)} sub={nights >= db.settings.monthlyFromNights ? "Monthly rate, prorated" : `${nights} × ${money2(berth.dailyRate)} a night`} />}
        {arrivingToday && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: checkIn }} onPress={() => setCheckIn(!checkIn)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.primary, backgroundColor: checkIn ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
            {checkIn && <CircleCheck size={14} color={t.onPrimary} />}
          </View>
          <Txt v="bodySm">The boat is here: check it in now</Txt>
        </Pressable>}
      </View>
    </Sheet>
  );
}

export function BerthSheet({ berth, onClose, onReport }: { berth: Berth; onClose: () => void; onReport: () => void }) {
  const { db, ix, update, toast, can } = useStore();
  const b = db.berths.find((x) => x.id === berth.id) ?? berth;
  const status = ix.berthStatus(b);
  const current = ix.currentBooking(b.id);
  const next = ix.nextBooking(b.id);
  const tasks = db.tasks.filter((x) => x.berthId === b.id && x.status !== "done");
  const toggle = () => {
    if (!b.underMaintenance && current) return toast("A boat is in this berth. Check it out or move it first.", undefined, "warning");
    const before = db;
    update((d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }), { text: `Berth ${b.code} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId });
    toast(b.underMaintenance ? `Berth ${b.code} back in service` : `Berth ${b.code} out of service`, before);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Berth ${b.code}`}
      subtitle={`${b.maxLength} ft · ${b.type}${b.power ? " · power" : ""}${b.water ? " · water" : ""}`}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          {can("berths") !== "view" && <Button style={{ flex: 1 }} label={b.underMaintenance ? "Back in service" : "Out of service"} onPress={toggle} />}
          {can("maintenance") !== "view" && <Button style={{ flex: 1 }} variant="primary" icon={TriangleAlert} label="Report" onPress={onReport} />}
        </View>
      }
    >
      <View style={{ marginBottom: 16 }}><BerthBadge status={status} /></View>
      {current && <Row label="Boat here now" value={ix.boat(current.boatId)?.name ?? ""} sub={`Leaves ${fmtShort(current.end)} · ${ix.ownerOfBooking(current)?.name}`} />}
      <Row label="Next arrival" value={next ? fmtShort(next.start) : "None booked"} sub={next ? `${ix.boat(next.boatId)?.name} · ${relative(next.start).toLowerCase()}` : undefined} />
      <Row label="Open repairs" value={tasks.length ? String(tasks.length) : "None"} sub={tasks.map((x) => x.title).join(", ") || undefined} />
    </Sheet>
  );
}

export function PhotoPicker({ photos, onChange, max = 3 }: { photos: string[]; onChange: (p: string[]) => void; max?: number }) {
  const { t } = useTheme();
  const { toast } = useStore();
  const add = async (from: "camera" | "library") => {
    try {
      const p = from === "camera" ? await takePhoto() : await pickPhoto();
      if (p) onChange([...photos, p]);
      else if (from === "camera") toast("Camera not available. Choose a photo instead.", undefined, "warning");
    } catch {
      toast("Couldn't add that photo. Try another.", undefined, "error");
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Txt v="bodySm" weight="medium">Photos <Txt v="bodySm" color={t.text3}>(optional, up to {max})</Txt></Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: p }} style={{ width: 80, height: 80, borderRadius: 12 }} accessibilityLabel={`Photo ${i + 1}`} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => onChange(photos.filter((_, j) => j !== i))} style={{ position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={t.onPrimary} />
            </Pressable>
          </View>
        ))}
        {photos.length < max && (
          <>
            <PhotoTile icon="camera" onPress={() => add("camera")} />
            <PhotoTile icon="library" onPress={() => add("library")} />
          </>
        )}
      </View>
    </View>
  );
}

function PhotoTile({ icon, onPress }: { icon: "camera" | "library"; onPress: () => void }) {
  const { t } = useTheme();
  const IconCmp = icon === "camera" ? Camera : ImagePlus;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === "camera" ? "Take photo" : "Choose photo"} onPress={onPress} style={({ pressed }) => ({ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <IconCmp size={20} color={t.text2} />
      <Txt v="caption" color={t.text2}>{icon === "camera" ? "Camera" : "Library"}</Txt>
    </Pressable>
  );
}

export function ReportProblem({ berthId, onClose }: { berthId?: string; onClose: () => void }) {
  const { db, update, toast, marinaId: current, scope } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const fromBerth = db.berths.find((b) => b.id === berthId)?.marinaId;
  const [marinaId, setMarina] = useState(fromBerth ?? (current === ALL ? scope[0] : current));
  const [title, setTitle] = useState("");
  const [berth, setBerth] = useState(berthId ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [takeOut, setTakeOut] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = () => {
    if (!title.trim()) return setError("Say what's wrong.");
    update((d) => {
      const task: MaintenanceTask = {
        id: nextId("t", d.tasks), code: `WO-${String(d.tasks.length + 1).padStart(3, "0")}`, title: title.trim(), marinaId, berthId: berth || undefined,
        priority, status: "open", created: today(), due: addDays(today(), priority === "high" ? 1 : 7),
        notes: [{ at: today(), by: me?.name ?? "Staff", text: "Reported from the staff app." }], photos,
      };
      const berths = takeOut && berth ? d.berths.map((b) => (b.id === berth ? { ...b, underMaintenance: true } : b)) : d.berths;
      return { ...d, tasks: [...d.tasks, task], berths };
    }, { text: `Reported a problem: ${title.trim()}`, to: "/maintenance", marinaId });
    toast("Problem reported. Your manager can see it now.");
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Report a problem" subtitle="It goes straight to the marina's work orders." footer={<Button variant="primary" size="lg" label="Send report" onPress={save} />}>
      <View style={{ gap: 16 }}>
        {current === ALL && !fromBerth && <MarinaPicker value={marinaId} onChange={(id) => { setMarina(id); setBerth(""); }} />}
        <Field label="What's wrong?" error={error}>
          <Input multiline value={title} onChangeText={(v) => { setTitle(v); setError(""); }} placeholder="e.g. Power pedestal sparks when plugged in" invalid={!!error} />
        </Field>
        <Field label="Berth">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: "", code: "Not a berth" }, ...db.berths.filter((b) => b.marinaId === marinaId)].map((b) => {
              const on = berth === b.id;
              return (
                <Pressable key={b.id || "none"} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setBerth(b.id)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", borderWidth: 1, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : t.surface }}>
                  <Txt v="bodySm" weight="semibold" num color={on ? t.onPrimary : t.text}>{b.code}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>
        <Field label="How urgent?">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: priority === p }} onPress={() => setPriority(p)} style={{ flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: priority === p ? t.primary : t.border, backgroundColor: priority === p ? t.primary : t.surface }}>
                <Txt v="bodySm" weight="semibold" color={priority === p ? t.onPrimary : t.text}>{p === "high" ? "Urgent" : p === "medium" ? "Medium" : "Low"}</Txt>
              </Pressable>
            ))}
          </View>
        </Field>
        <PhotoPicker photos={photos} onChange={setPhotos} />
        {berth ? (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: takeOut }} onPress={() => setTakeOut(!takeOut)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.primary, backgroundColor: takeOut ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {takeOut && <CircleCheck size={14} color={t.onPrimary} />}
            </View>
            <Txt v="bodySm">Take this berth out of service</Txt>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

export function TaskSheet({ task, onClose }: { task: MaintenanceTask; onClose: () => void }) {
  const { db, ix, update, toast, can, user } = useStore();
  const office = user?.role === "admin" || user?.role === "manager";
  const me = useMe();
  const { t } = useTheme();
  const x = db.tasks.find((y) => y.id === task.id) ?? task;
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const canEdit = can("maintenance") !== "view";
  const log = (text: string) => ({ text: `${text} (${x.code})`, to: `/maintenance?open=${x.id}`, marinaId: x.marinaId });
  const setStatus = (status: MaintenanceTask["status"]) => {
    const before = db;
    update(
      (d) => ({
        ...d,
        tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, status, assigneeId: y.assigneeId ?? me?.id } : y)),
        // Finishing the last open job on a berth puts it back in service.
        berths: status === "done" ? d.berths.map((b) => (b.id === x.berthId && !d.tasks.some((y) => y.id !== x.id && y.berthId === b.id && y.status !== "done") ? { ...b, underMaintenance: false } : b)) : d.berths,
      }),
      log(status === "done" ? `Finished: ${x.title}` : `Started: ${x.title}`),
    );
    toast(status === "done" ? "Marked as done" : "Started. It's now assigned to you.", before);
  };
  const addUpdate = () => {
    if (!note.trim() && photos.length === 0) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, notes: note.trim() ? [...y.notes, { at: today(), by: me?.name ?? "Staff", text: note.trim() }] : y.notes, photos: [...(y.photos ?? []), ...photos].slice(-6) } : y)),
    }), log("Added an update"));
    setNote("");
    setPhotos([]);
    toast("Update added");
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={x.title}
      subtitle={`${x.code} · ${x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"}`}
      footer={
        canEdit && x.status === "open" && !office ? <Button variant="primary" size="lg" label="Start work" onPress={() => setStatus("in-progress")} />
        : canEdit && x.status !== "done" ? <Button variant="primary" size="lg" icon={CircleCheck} label="Mark as done" onPress={() => { setStatus("done"); onClose(); }} />
        : <Button size="lg" label="Close" onPress={onClose} />
      }
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TaskBadge status={x.status} />
        <PriorityBadge priority={x.priority} />
      </View>
      <Txt v="bodySm" color={t.text3} style={{ marginBottom: 16 }}>Due {fmtDate(x.due)} · {x.assigneeId ? `Assigned to ${ix.staffMember(x.assigneeId)?.name}` : "Unassigned"}</Txt>
      {office && canEdit && x.status !== "done" && (
        <View style={{ gap: 16, marginBottom: 16 }}>
          <Field label="Priority">
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <Chip key={p} label={p === "high" ? "Urgent" : p === "medium" ? "Medium" : "Low"} on={x.priority === p} onPress={() => {
                  if (x.priority === p) return;
                  const before = db;
                  update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, priority: p } : y)) }), log(`Priority set to ${p === "high" ? "urgent" : p}: ${x.title}`));
                  toast("Priority changed", before);
                }} />
              ))}
            </View>
          </Field>
          <Field label="Due">
            <DayChips days={[...(x.due < today() ? [x.due] : []), ...Array.from({ length: 60 }, (_, i) => addDays(today(), i))]} value={x.due} onChange={(due) => {
              const before = db;
              update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, due } : y)) }), log(`Due date set to ${fmtShort(due)}: ${x.title}`));
              toast(`Due ${fmtShort(due)}`, before);
            }} />
          </Field>
        </View>
      )}
      {office && canEdit && x.status !== "done" && (
        <View style={{ marginBottom: 16 }}>
          <Field label="Assign to" hint="They see it under Mine in their app.">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {db.staff.filter((s) => s.marinaId === x.marinaId && s.position !== "Marina Manager" && s.status === "active").map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  sub={s.position}
                  on={x.assigneeId === s.id}
                  onPress={() => {
                    if (x.assigneeId === s.id) return;
                    const before = db;
                    update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, assigneeId: s.id } : y)) }), log(`Assigned to ${s.name}: ${x.title}`));
                    toast(`Assigned to ${s.name}`, before);
                  }}
                />
              ))}
            </ScrollView>
          </Field>
        </View>
      )}
      {(x.photos?.length ?? 0) > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {x.photos!.map((p, i) => <Image key={i} source={{ uri: p }} style={{ width: 96, height: 96, borderRadius: 12 }} accessibilityLabel={`Task photo ${i + 1}`} />)}
        </View>
      )}
      {x.notes.map((n, i) => (
        <View key={i} style={{ borderLeftWidth: 2, borderColor: t.border, paddingLeft: 12, marginBottom: 12 }}>
          <Txt v="bodySm">{n.text}</Txt>
          <Txt v="caption" color={t.text3}>{n.by} · {fmtShort(n.at)}</Txt>
        </View>
      ))}
      {canEdit && (
        <View style={{ gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginTop: 4 }}>
          <Input multiline value={note} onChangeText={setNote} placeholder="Add a note…" accessibilityLabel="Add a note" />
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <Button size="sm" label="Add update" disabled={!note.trim() && photos.length === 0} onPress={addUpdate} style={{ alignSelf: "flex-start" }} />
        </View>
      )}
    </Sheet>
  );
}

/** Change arrival, departure, berth or guests. Unpaid invoices follow the new price (same rule as the web app). */
export function ChangeBookingSheet({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const { t } = useTheme();
  const now = today();
  const started = b.start <= now && b.status === "checked-in";
  const [start, setStart] = useState(b.start);
  const [nights, setNights] = useState(daysBetween(b.start, b.end));
  const [guests, setGuests] = useState(b.guests);
  const [berthId, setBerthId] = useState(b.berthId);
  const [error, setError] = useState("");
  const end = addDays(start, nights);
  const boat = ix.boat(b.boatId);
  const marinaId = ix.berth(b.berthId)?.marinaId;
  const free = db.berths
    .filter((x) => x.marinaId === marinaId && !x.underMaintenance && x.maxLength >= (boat?.length ?? 0) && ix.isFree(x.id, start, end, b.id))
    .sort((x, y) => x.maxLength - y.maxLength || x.code.localeCompare(y.code));
  const berth = ix.berth(berthId);
  const fits = free.some((x) => x.id === berthId);
  const amount = berth ? bookingAmount(start, end, berth, db.settings.monthlyFromNights) : 0;
  const invoice = db.invoices.find((i) => i.bookingId === b.id && i.status !== "void");
  const changed = start !== b.start || end !== b.end || berthId !== b.berthId || guests !== b.guests;
  const days = Array.from({ length: 120 }, (_, i) => addDays(now, i));

  const save = () => {
    if (!fits) return setError(`Berth ${berth?.code} isn't free for these dates. Choose another berth.`);
    const before = db;
    update(
      (d) => ({
        ...d,
        bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, start, end, berthId, guests } : x)),
        // Unpaid invoices follow the new price; paid ones are left as issued.
        invoices: d.invoices.map((i) => (i.bookingId === b.id && (i.status === "due" || i.status === "overdue") ? { ...i, amount } : i)),
      }),
      { text: `Changed ${b.code}: ${fmtShort(start)}–${fmtShort(end)}, berth ${berth?.code}`, to: `/bookings?q=${b.code}`, marinaId },
    );
    toast(`${b.code} updated`, before);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={`Change ${b.code}`} subtitle={`${boat?.name} · ${boat?.length} ft`} footer={<Button variant="primary" size="lg" label={`Save · ${money2(amount)}`} disabled={!changed} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="Arrival" hint={started ? "Already arrived" : undefined}>
          {started ? <Txt>{fmtShort(start)}</Txt> : <DayChips days={b.start < now ? [b.start, ...days] : days} value={start} onChange={(d) => { setStart(d); setError(""); }} />}
        </Field>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
          <Field label="Nights" hint={`Leaves ${fmtShort(end)}`}><Stepper label="nights" value={nights} onChange={(n) => { setNights(n); setError(""); }} min={started ? Math.max(1, daysBetween(b.start, now)) : 1} max={365} /></Field>
          <Field label="Guests"><Stepper label="guests" value={guests} onChange={setGuests} max={20} /></Field>
        </View>
        <Field label="Berth" error={error} hint={fits ? `${free.length} free berths fit this boat` : `Berth ${berth?.code} isn't free for these dates`}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {free.slice(0, 16).map((x) => <Chip key={x.id} label={x.code} sub={`${x.maxLength} ft`} on={berthId === x.id} onPress={() => { setBerthId(x.id); setError(""); }} />)}
          </View>
        </Field>
        <Row label="New total" value={money2(amount)} sub={invoice ? (invoice.status === "paid" ? "The invoice is already paid. Adjust any difference in Billing." : `Invoice ${invoice.number} is updated to match.`) : undefined} />
        {!fits && <Txt v="caption" color={t.error.fg}>Pick one of the free berths above to save.</Txt>}
      </View>
    </Sheet>
  );
}

/** Cancel (or decline, when pending). The berth frees up and any unpaid invoice is voided, as on the web. */
export function CancelBookingSheet({ booking: b, decline, onClose }: { booking: Booking; decline?: boolean; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const { t } = useTheme();
  const boat = ix.boat(b.boatId);
  const owner = ix.ownerOfBooking(b);
  const paid = db.invoices.find((i) => i.bookingId === b.id && i.status !== "void" && i.payments.length > 0);
  const confirm = () => {
    const before = db;
    update(
      (d) => ({
        ...d,
        bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "cancelled" as const } : x)),
        invoices: d.invoices.map((i) => (i.bookingId === b.id && i.status !== "paid" && i.payments.length === 0 ? { ...i, status: "void" as const } : i)),
      }),
      { text: `${decline ? "Declined" : "Cancelled"} booking ${b.code} for ${boat?.name}`, to: `/bookings?q=${b.code}`, marinaId: ix.berth(b.berthId)?.marinaId },
    );
    toast(`${b.code} ${decline ? "declined" : "cancelled"}`, before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`${decline ? "Decline" : "Cancel"} ${b.code}?`} subtitle={`${boat?.name} · ${fmtShort(b.start)} – ${fmtShort(b.end)}`} footer={<Button variant="danger" size="lg" label={decline ? "Decline booking" : "Cancel booking"} onPress={confirm} />}>
      <Txt v="bodySm" color={t.text2}>
        {`Berth ${ix.berth(b.berthId)?.code} becomes free for those nights${decline ? "" : " and any unpaid invoice is voided"}. ${owner?.name} isn't told automatically: call or email them from the booking.`}
      </Txt>
      {paid && <Txt v="bodySm" color={t.error.fg} style={{ marginTop: 12 }}>{owner?.name} has already paid {money2(ix.paidSoFar(paid))}. Refund it from Billing in the web app.</Txt>}
    </Sheet>
  );
}
