// Detail sheets and actions shared by the staff tabs: bookings, berths, tasks, problem reports.
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { ArrowRightLeft, Banknote, Fuel, Gauge, CalendarCog, Camera, CircleCheck, CircleX, ImagePlus, LogIn, LogOut, Mail, Phone, Search, TriangleAlert, X } from "lucide-react-native";
import {
  addDays, bookingAmount, daysBetween, DEFAULT_UTILITIES, withPartsUsed, lastReading, METER_UNIT, priceNote, withMeterReading, fmtDate, fmtShort, linesTotal, money2, nextId, prepChecklist, relative, SERVICES, today, withInvoice, withServiceCharge,
  type ArrivalRecord, type Berth, type MeterKind, type BoatCondition, type Booking, type BookingStatus, type BoatType, type Invoice, type MaintenanceTask, type PaymentMethod, type Priority,
} from "@marina/shared";
import { ALL, useMe, useStore } from "../store";
import { MarinaPicker } from "./office";
import { OwnerSheet } from "./owner";
import { SignaturePad, SignatureView, type Signature } from "./signature";
import { useTheme } from "../theme";
import { pickPhoto, takePhoto } from "../lib/photos";
import { BerthBadge, BookingBadge, PriorityBadge, TaskBadge } from "./status";
import { Badge, Button, Chip, DayChips, Field, Input, Row, Segmented, Sheet, Stepper, Txt } from "./ui";
import { useTr } from "../lib/i18n";
import { tn } from "@marina/shared";

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
  const tr = useTr();
  const setStatus = useBookingStatus();
  const [paying, setPaying] = useState<Invoice | undefined>();
  const [changing, setChanging] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [servicing, setServicing] = useState(false);
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
      title={boat?.name ?? tr("Booking")}
      subtitle={tr("{code} · Berth {code2}", { code: b.code, code2: berth?.code })}
      footer={
        office && canEdit && b.status === "pending" ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button style={{ flex: 1 }} size="lg" label={tr("Decline")} onPress={() => setCancelling(true)} />
            <Button style={{ flex: 1 }} variant="primary" size="lg" label={tr("Approve")} disabled={!ix.isFree(b.berthId, b.start, b.end, b.id)} onPress={() => {
              const before = db;
              update((d) => withInvoice({ ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "confirmed" as const } : x)) }, b.id, ix.amount(b)), { text: `Approved booking ${b.code} for ${boat?.name}`, to: `/bookings?q=${b.code}`, marinaId: berth?.marinaId });
              toast(tr("{name} approved and invoiced", { name: boat?.name }), before);
            }} />
          </View>
        )
        : canCheckIn ? <Button variant="primary" size="lg" icon={LogIn} label={tr("Check in")} onPress={() => setCheckingIn(true)} />
        : canCheckOut ? <Button variant="primary" size="lg" icon={LogOut} label={tr("Check out")} onPress={() => { setStatus(b, "completed"); onClose(); }} />
        : <Button size="lg" label={tr("Close")} onPress={onClose} />
      }
    >
      <View style={{ marginBottom: 16 }}><BookingBadge status={b.status} /></View>
      <Row label={tr("Boat")} value={`${boat?.type} · ${boat?.length} ft`} sub={boat?.registration} />
      <Row label={tr("Dates")} value={`${fmtShort(b.start)} – ${fmtShort(b.end)}`} sub={`${tn(daysBetween(b.start, b.end), "{n} night", "{n} nights")} · ${tn(b.guests, "{n} guest", "{n} guests")}`} />
      <Row label={tr("Berth")} value={`${berth?.code} · up to ${berth?.maxLength} ft`} sub={`${berth?.type}${berth?.power ? " · power" : ""}${berth?.water ? " · water" : ""}`} />
      {owner && can("owners") !== "none" ? (
        <Pressable accessibilityRole="button" accessibilityLabel={tr("Boat owner {name}. Open their details", { name: owner.name })} onPress={() => setOwnerOpen(true)}>
          <Row label={tr("Boat owner")} value={`${owner.name} ›`} sub={owner.email} />
        </Pressable>
      ) : (
        <Row label={tr("Boat owner")} value={owner?.name ?? ""} sub={owner?.email} />
      )}
      {b.status === "pending" && (
        <View style={{ backgroundColor: t.status.pending.bg, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Txt v="bodySm" color={t.status.pending.fg}>{tr("Waiting for a manager to approve this booking.")}</Txt>
        </View>
      )}
      {canEdit && b.status === "confirmed" && b.start <= addDays(today(), 2) && <PrepChecklist booking={b} />}
      {b.arrival && <ArrivalSummary record={b.arrival} />}
      <InvoiceRow bookingId={b.id} onPay={setPaying} />
      {owner && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Button style={{ flex: 1 }} icon={Phone} label={tr("Call")} disabled={!owner.phone} onPress={() => Linking.openURL(`tel:${owner.phone.replace(/[^\d+]/g, "")}`)} />
          <Button style={{ flex: 1 }} icon={Mail} label={tr("Email")} onPress={() => Linking.openURL(`mailto:${owner.email}?subject=${encodeURIComponent(`Your stay at ${ix.marinaOfBerth(b.berthId)?.name}`)}`)} />
        </View>
      )}
      {canEdit && (b.status === "pending" || b.status === "confirmed" || b.status === "checked-in") && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button style={{ flex: 1 }} size="sm" icon={CalendarCog} label={b.status === "checked-in" ? tr("Extend or move") : tr("Change")} onPress={() => setChanging(true)} />
          {b.status === "checked-in" && <Button style={{ flex: 1 }} size="sm" icon={Fuel} label={tr("Add service")} onPress={() => setServicing(true)} />}
          {b.status !== "checked-in" && <Button style={{ flex: 1 }} size="sm" icon={CircleX} label={tr("Cancel")} onPress={() => setCancelling(true)} />}
        </View>
      )}
      {paying && <PaymentSheet invoice={paying} onClose={() => setPaying(undefined)} />}
      {changing && <ChangeBookingSheet booking={b} onClose={() => setChanging(false)} />}
      {ownerOpen && owner && <OwnerSheet owner={owner} onClose={() => setOwnerOpen(false)} />}
      {checkingIn && <CheckInSheet booking={b} onClose={() => setCheckingIn(false)} />}
      {servicing && <ServiceSheet booking={b} onClose={() => setServicing(false)} />}
      {cancelling && <CancelBookingSheet booking={b} decline={b.status === "pending"} onClose={() => setCancelling(false)} />}
    </Sheet>
  );
}

/** Invoice summary with a Take payment button when money is still owed. */
function InvoiceRow({ bookingId, onPay }: { bookingId: string; onPay: (inv: Invoice) => void }) {
  const { db, ix, can } = useStore();
  const { t } = useTheme();
  const tr = useTr();
  const inv = db.invoices.find((i) => i.bookingId === bookingId && i.status !== "void");
  if (!inv || can("billing") === "none") return null;
  const owed = ix.balance(inv);
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginBottom: 12, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Txt v="bodySm" weight="medium">{tr("Invoice")} {inv.number}</Txt>
          <Txt v="caption" num color={t.text3}>{tr("{amount} · paid {paid}", { amount: money2(inv.amount), paid: money2(ix.paidSoFar(inv)) })}</Txt>
        </View>
        {inv.status === "paid" ? <Badge tone="success" icon={CircleCheck} label={tr("Paid")} />
          : inv.status === "overdue" ? <Badge tone="cancelled" label={`${money2(owed)} overdue`} />
          : <Badge tone="pending" label={`${money2(owed)} due`} />}
      </View>
      {(inv.lines ?? []).map((l, i) => (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt v="caption" color={t.text2}>{tr(l.label)} · {l.qty} {l.unit} · {fmtShort(l.at.slice(0, 10))}</Txt>
          <Txt v="caption" num color={t.text2}>{money2(l.amount)}</Txt>
        </View>
      ))}
      {owed > 0 && can("billing") !== "view" && <Button size="sm" icon={Banknote} label={tr("Take payment")} onPress={() => onPay(inv)} style={{ alignSelf: "flex-start" }} />}
    </View>
  );
}

const DOCK_METHODS: PaymentMethod[] = ["Card", "Cash", "Check"];

/** Record money taken at the dock (card reader, cash or check) against an invoice. Same rules as Billing on the web. */
export function PaymentSheet({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, update, toast, user } = useStore();
  const methods: PaymentMethod[] = user?.role === "staff" ? DOCK_METHODS : [...DOCK_METHODS, "Bank transfer"];
  const balance = ix.balance(invoice);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [error, setError] = useState("");
  const save = () => {
    const value = Math.round(Number(amount.replace(/[^\d.]/g, "")) * 100) / 100;
    if (!(value > 0)) return setError(tr("Enter an amount above zero."));
    if (value > balance) return setError(tr("That's more than the {amount} still owed.", { amount: money2(balance) }));
    const before = db;
    const full = value >= balance;
    const now = today();
    update(
      (d) => ({ ...d, invoices: d.invoices.map((i) => (i.id === invoice.id ? { ...i, payments: [...i.payments, { date: now, amount: value, method }], ...(full ? { status: "paid" as const, paidAt: now, method } : {}) } : i)) }),
      { text: `Recorded ${money2(value)} ${full ? "payment" : "part payment"} for ${invoice.number} (${method})`, to: `/billing?open=${invoice.id}`, marinaId: ix.marinaOfInvoice(invoice) },
    );
    toast(full ? tr("{number} is paid", { number: invoice.number }) : tr("{amount} taken. {amount2} still owed.", { amount: money2(value), amount2: money2(balance - value) }), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Take payment")} subtitle={tr("{number} · {amount} owed", { number: invoice.number, amount: money2(balance) })} footer={<Button variant="primary" size="lg" label={tr("Record {amount}", { amount: money2(Number(amount) || 0) })} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Amount")} error={error}>
          <Input value={amount} onChangeText={(v) => { setAmount(v); setError(""); }} keyboardType="decimal-pad" inputMode="decimal" invalid={!!error} accessibilityLabel={tr("Amount")} />
        </Field>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label={tr("Full balance")} on={Number(amount) === balance} onPress={() => setAmount(balance.toFixed(2))} />
          <Chip label={tr("Half")} on={Number(amount) === Math.round(balance * 50) / 100} onPress={() => setAmount((Math.round(balance * 50) / 100).toFixed(2))} />
        </View>
        <Field label={tr("Paid by")} hint={method === "Card" ? tr("Run the card on the marina's card reader first, then record it here.") : method === "Check" ? tr("Write the invoice number on the back of the check.") : method === "Bank transfer" ? tr("Record it once the money shows in the bank account.") : tr("Hand the cash to the front desk at the end of your shift.")}>
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
export function NewBookingSheet({ onClose, onDone }: { onClose: () => void; onDone: (bookingId: string, checkIn: boolean) => void }) {
  const { db, ix, update, toast, marinaId: current, scope } = useStore();
  const { t } = useTheme();
  const tr = useTr();
  const [marinaId, setMarina] = useState(current === ALL ? scope.find((m) => ix.marina(m)?.status !== "inactive") ?? scope[0] : current);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const closed = ix.marina(marinaId)?.status === "inactive";
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
  const price = berth ? bookingAmount(now, end, berth, db.settings.monthlyFromNights, db.settings.pricing) : 0;
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({}); };

  const save = () => {
    if (closed) return toast(tr("{name} is closed to new bookings.", { name: ix.marina(marinaId)?.name }), undefined, "warning");
    const e: Record<string, string> = {};
    if (mode === "existing") {
      if (!boat) e.boat = tr("Find the boat, or add a new one.");
      // A boat can't hold two berths for the same nights.
      const clash = boat && db.bookings.find((b) => b.boatId === boat.id && ["pending", "confirmed", "checked-in"].includes(b.status) && b.start < end && b.end > now);
      if (clash) e.boat = tr("{name} already has {code} at berth {code2} ({date} – {date2}).", { name: boat?.name, code: clash.code, code2: ix.berth(clash.berthId)?.code, date: fmtShort(clash.start), date2: fmtShort(clash.end) });
    } else {
      if (!f.owner.trim()) e.owner = tr("Enter the owner's name.");
      if (!f.phone.trim() && !f.email.trim()) e.contact = tr("Add a phone number or email so we can reach them.");
      if (!f.boat.trim()) e.newBoat = tr("Enter the boat name.");
      if (!(Number(f.length) >= 10)) e.length = tr("Enter the boat length in feet (10 or more).");
    }
    if (!berth) e.berth = free.length ? tr("Choose a berth.") : (arrivingToday ? tr("No berth is free and big enough tonight.") : tr("No berth is free and big enough for those nights."));
    setErrors(e);
    if (Object.keys(e).length || !berth) return;
    const id = nextId("bk", db.bookings);
    // Checking in goes through the check-in sheet next (condition, photos, signature).
    const status: BookingStatus = "confirmed";
    const name = mode === "existing" ? boat!.name : f.boat.trim();
    update((d) => {
      let owners = d.owners, boats = d.boats, bId = boatId;
      if (mode === "new") {
        const ownerId = nextId("o", d.owners);
        bId = nextId("bt", d.boats);
        owners = [...owners, { id: ownerId, name: f.owner.trim(), email: f.email.trim(), phone: f.phone.trim(), since: today() }];
        boats = [...boats, { id: bId, ownerId, name, type: f.type, length: Number(f.length), registration: "Pending" }];
      }
      const booking: Booking = { id, code: `BK-${String(Number(id.split("-")[1])).padStart(4, "0")}`, boatId: bId, berthId: berth.id, start: now, end, guests, status, createdAt: today(), price };
      return withInvoice({ ...d, owners, boats, bookings: [...d.bookings, booking] }, id, price);
    }, { text: `${arrivingToday ? "Walk-in booking" : "New booking"} for ${name} at berth ${berth.code}, ${fmtShort(now)}, ${nights} ${nights === 1 ? "night" : "nights"}`, marinaId });
    toast(checkIn ? tr("{name} booked. Now check them in.", { name: name }) : tr("{name} booked for {date} and invoiced", { name: name, date: fmtShort(now) }));
    onDone(id, checkIn);
  };

  return (
    <Sheet open onClose={onClose} title={tr("New booking")} subtitle={arrivingToday ? tr("Arriving today, or pick a later day") : tr("Arriving {date}", { date: fmtShort(start) })} footer={<Button variant="primary" size="lg" icon={checkIn ? LogIn : undefined} label={berth ? `${checkIn ? "Book, then check in" : "Book"} · ${money2(price)}` : tr("Book")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        {current === ALL && <MarinaPicker openOnly value={marinaId} onChange={(id) => { setMarina(id); setBerthId(""); }} />}
        {closed && (
          <View style={{ backgroundColor: t.status.maintenance.bg, borderRadius: 12, padding: 12 }}>
            <Txt v="bodySm" color={t.status.maintenance.fg}>{tr("{name} is closed to new bookings. Ask an admin to reopen it.", { name: ix.marina(marinaId)?.name })}</Txt>
          </View>
        )}
        <Segmented value={mode} onChange={(v) => { setMode(v); setErrors({}); }} items={[{ value: "existing", label: tr("Known boat") }, { value: "new", label: tr("New boat") }]} />
        {mode === "existing" ? (
          <Field label={tr("Boat")} error={errors.boat}>
            {boat ? (
              <Pressable accessibilityRole="button" accessibilityLabel={tr("{name}. Change boat", { name: boat.name })} onPress={() => { setBoatId(""); setBerthId(""); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.primary, borderRadius: 12, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{boat.name}</Txt>
                  <Txt v="caption" color={t.text3}>{tr(boat.type)} · {boat.length} {tr("ft ·")} {ix.owner(boat.ownerId)?.name}</Txt>
                </View>
                <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Change")}</Txt>
              </Pressable>
            ) : (
              <View style={{ gap: 8 }}>
                <View style={{ justifyContent: "center" }}>
                  <Search size={18} color={t.text3} style={{ position: "absolute", start: 14, zIndex: 1 }} />
                  <Input value={q} onChangeText={setQ} placeholder={tr("Boat name, registration or owner")} style={{ paddingStart: 40 }} autoCorrect={false} invalid={!!errors.boat} />
                </View>
                {matches.map((b) => (
                  <Pressable key={b.id} accessibilityRole="button" onPress={() => { setBoatId(b.id); setBerthId(""); setErrors({}); }} style={({ pressed }) => ({ borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : t.surface })}>
                    <Txt weight="medium">{b.name}</Txt>
                    <Txt v="caption" color={t.text3}>{tr(b.type)} · {b.length} {tr("ft ·")} {b.registration} · {ix.owner(b.ownerId)?.name}</Txt>
                  </Pressable>
                ))}
                {s.length >= 2 && matches.length === 0 && (
                  <Pressable accessibilityRole="button" onPress={() => { setMode("new"); setF({ ...f, boat: q.trim() }); }}>
                    <Txt v="bodySm" color={t.text3}>{tr("No boat matches.")} <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Add it as a new boat")}</Txt></Txt>
                  </Pressable>
                )}
              </View>
            )}
          </Field>
        ) : (
          <>
            <Field label={tr("Owner's name")} error={errors.owner}><Input value={f.owner} onChangeText={(v) => set("owner", v)} autoComplete="name" invalid={!!errors.owner} /></Field>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field label={tr("Phone")}><Input value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" autoComplete="tel" invalid={!!errors.contact} /></Field></View>
              <View style={{ flex: 1 }}><Field label={tr("Email")}><Input value={f.email} onChangeText={(v) => set("email", v)} keyboardType="email-address" autoCapitalize="none" invalid={!!errors.contact} /></Field></View>
            </View>
            {errors.contact ? <Txt v="caption" weight="medium" color={t.error.fg} style={{ marginTop: -8 }}>{errors.contact}</Txt> : null}
            <Field label={tr("Boat name")} error={errors.newBoat}><Input value={f.boat} onChangeText={(v) => set("boat", v)} invalid={!!errors.newBoat} /></Field>
            <Field label={tr("Length (ft)")} error={errors.length}><Input value={f.length} onChangeText={(v) => { set("length", v.replace(/\D/g, "")); setBerthId(""); }} keyboardType="number-pad" invalid={!!errors.length} /></Field>
            <Field label={tr("Type")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BOAT_TYPES.map((x) => <Chip key={x} label={x} on={f.type === x} onPress={() => set("type", x)} />)}
              </View>
            </Field>
          </>
        )}
        <Field label={tr("Arrival")}><DayChips days={Array.from({ length: 120 }, (_, i) => addDays(today(), i))} value={start} onChange={(d) => { setStart(d); setBerthId(""); setErrors({}); }} /></Field>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
          <Field label={tr("Nights")} hint={tr("Leaves {date}", { date: fmtShort(end) })}><Stepper label={tr("nights")} value={nights} onChange={(n) => { setNights(n); setBerthId(""); }} max={60} /></Field>
          <Field label={tr("Guests")}><Stepper label={tr("guests")} value={guests} onChange={setGuests} max={20} /></Field>
        </View>
        <Field label={tr("Berth")} error={errors.berth} hint={length ? (arrivingToday ? tn(nights, "Free from tonight and fits {length} ft, smallest first.", "Free from tonight for {n} nights and fits {length} ft, smallest first.", { length }) : tn(nights, "Free from {date} and fits {length} ft, smallest first.", "Free from {date} for {n} nights and fits {length} ft, smallest first.", { date: fmtShort(start), length })) : tr("Choose the boat first to see berths that fit.")}>
          {length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {free.slice(0, 12).map((b) => <Chip key={b.id} label={b.code} sub={`${b.maxLength} ft`} on={berthId === b.id} onPress={() => { setBerthId(b.id); setErrors({}); }} />)}
            </View>
          )}
        </Field>
        {berth && <Row label={tr("Price")} value={money2(price)} sub={priceNote(now, end, db.settings.monthlyFromNights, db.settings.pricing)} />}
        {arrivingToday && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: checkIn }} onPress={() => setCheckIn(!checkIn)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.primary, backgroundColor: checkIn ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
            {checkIn && <CircleCheck size={14} color={t.onPrimary} />}
          </View>
          <Txt v="bodySm">{tr("The boat is here: check it in now")}</Txt>
        </Pressable>}
      </View>
    </Sheet>
  );
}

export function BerthSheet({ berth, onClose, onReport }: { berth: Berth; onClose: () => void; onReport: () => void }) {
  const tr = useTr();
  const { db, ix, update, toast, can } = useStore();
  const [moving, setMoving] = useState(false);
  const [metering, setMetering] = useState(false);
  const b = db.berths.find((x) => x.id === berth.id) ?? berth;
  const status = ix.berthStatus(b);
  const current = ix.currentBooking(b.id);
  const next = ix.nextBooking(b.id);
  const tasks = db.tasks.filter((x) => x.berthId === b.id && x.status !== "done");
  const toggle = () => {
    if (!b.underMaintenance && current) return toast(tr("A boat is in this berth. Check it out or move it first."), undefined, "warning");
    const before = db;
    update((d) => ({ ...d, berths: d.berths.map((x) => (x.id === b.id ? { ...x, underMaintenance: !x.underMaintenance } : x)) }), { text: `Berth ${b.code} ${b.underMaintenance ? "returned to service" : "taken out of service"}`, marinaId: b.marinaId });
    toast(b.underMaintenance ? tr("Berth {code} back in service", { code: b.code }) : tr("Berth {code} out of service", { code: b.code }), before);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={tr("Berth {code}", { code: b.code })}
      subtitle={[tr("{n} ft", { n: b.maxLength }), tr(b.type), b.power && tr("power"), b.water && tr("water")].filter(Boolean).join(" · ")}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          {can("berths") !== "view" && <Button style={{ flex: 1 }} label={b.underMaintenance ? tr("Back in service") : tr("Out of service")} onPress={toggle} />}
          {can("maintenance") !== "view" && <Button style={{ flex: 1 }} variant="primary" icon={TriangleAlert} label={tr("Report")} onPress={onReport} />}
        </View>
      }
    >
      <View style={{ marginBottom: 16 }}><BerthBadge status={status} /></View>
      {current && <Row label={tr("Boat here now")} value={ix.boat(current.boatId)?.name ?? ""} sub={tr("Leaves {date} · {name}", { date: fmtShort(current.end), name: ix.ownerOfBooking(current)?.name })} />}
      <Row label={tr("Next arrival")} value={next ? fmtShort(next.start) : "None booked"} sub={next ? `${ix.boat(next.boatId)?.name} · ${relative(next.start).toLowerCase()}` : undefined} />
      <Row label={tr("Open repairs")} value={tasks.length ? String(tasks.length) : "None"} sub={tasks.map((x) => x.title).join(", ") || undefined} />
      {current && can("bookings") !== "view" && (
        <Button icon={ArrowRightLeft} label={tr("Move {name} to another berth", { name: ix.boat(current.boatId)?.name })} onPress={() => setMoving(true)} />
      )}
      {(b.power || b.water) && can("berths") !== "view" && <Button icon={Gauge} label={tr("Read meters")} onPress={() => setMetering(true)} style={{ marginTop: 8 }} />}
      {moving && current && <ChangeBookingSheet booking={current} onClose={() => setMoving(false)} />}
      {metering && <MeterSheet berth={b} onClose={() => setMetering(false)} />}
    </Sheet>
  );
}

export function PhotoPicker({ photos, onChange, max = 3 }: { photos: string[]; onChange: (p: string[]) => void; max?: number }) {
  const tr = useTr();
  const { t } = useTheme();
  const { toast } = useStore();
  const add = async (from: "camera" | "library") => {
    try {
      const p = from === "camera" ? await takePhoto() : await pickPhoto();
      if (p) onChange([...photos, p]);
      else if (from === "camera") toast(tr("Camera not available. Choose a photo instead."), undefined, "warning");
    } catch {
      toast(tr("Couldn't add that photo. Try another."), undefined, "error");
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Txt v="bodySm" weight="medium">{tr("Photos")} <Txt v="bodySm" color={t.text3}>{tr("(optional, up to {n})", { n: max })}</Txt></Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: p }} style={{ width: 80, height: 80, borderRadius: 12 }} accessibilityLabel={tr("Photo {v}", { v: i + 1 })} />
            <Pressable accessibilityRole="button" accessibilityLabel={tr("Remove photo {v}", { v: i + 1 })} onPress={() => onChange(photos.filter((_, j) => j !== i))} style={{ position: "absolute", top: -8, end: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
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
  const tr = useTr();
  const { t } = useTheme();
  const IconCmp = icon === "camera" ? Camera : ImagePlus;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === "camera" ? tr("Take photo") : tr("Choose photo")} onPress={onPress} style={({ pressed }) => ({ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <IconCmp size={20} color={t.text2} />
      <Txt v="caption" color={t.text2}>{icon === "camera" ? tr("Camera") : tr("Library")}</Txt>
    </Pressable>
  );
}

export function ReportProblem({ berthId, onClose }: { berthId?: string; onClose: () => void }) {
  const { db, update, toast, marinaId: current, scope } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const fromBerth = db.berths.find((b) => b.id === berthId)?.marinaId;
  const [marinaId, setMarina] = useState(fromBerth ?? (current === ALL ? scope[0] : current));
  const [title, setTitle] = useState("");
  const [berth, setBerth] = useState(berthId ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [takeOut, setTakeOut] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = () => {
    if (!title.trim()) return setError(tr("Say what's wrong."));
    update((d) => {
      const task: MaintenanceTask = {
        id: nextId("t", d.tasks), code: `WO-${String(d.tasks.length + 1).padStart(3, "0")}`, title: title.trim(), marinaId, berthId: berth || undefined,
        priority, status: "open", created: today(), due: addDays(today(), priority === "high" ? 1 : 7),
        notes: [{ at: today(), by: me?.name ?? "Staff", text: "Reported from the staff app." }], photos,
      };
      const berths = takeOut && berth ? d.berths.map((b) => (b.id === berth ? { ...b, underMaintenance: true } : b)) : d.berths;
      return { ...d, tasks: [...d.tasks, task], berths };
    }, { text: `Reported a problem: ${title.trim()}`, to: "/maintenance", marinaId });
    toast(tr("Problem reported. Your manager can see it now."));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Report a problem")} subtitle={tr("It goes straight to the marina's work orders.")} footer={<Button variant="primary" size="lg" label={tr("Send report")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        {current === ALL && !fromBerth && <MarinaPicker value={marinaId} onChange={(id) => { setMarina(id); setBerth(""); }} />}
        <Field label={tr("What's wrong?")} error={error}>
          <Input multiline value={title} onChangeText={(v) => { setTitle(v); setError(""); }} placeholder={tr("e.g. Power pedestal sparks when plugged in")} invalid={!!error} />
        </Field>
        <Field label={tr("Berth")}>
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
        <Field label={tr("How urgent?")}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: priority === p }} onPress={() => setPriority(p)} style={{ flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: priority === p ? t.primary : t.border, backgroundColor: priority === p ? t.primary : t.surface }}>
                <Txt v="bodySm" weight="semibold" color={priority === p ? t.onPrimary : t.text}>{p === "high" ? tr("Urgent") : p === "medium" ? tr("Medium") : tr("Low")}</Txt>
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
            <Txt v="bodySm">{tr("Take this berth out of service")}</Txt>
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
  const tr = useTr();
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
        tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, status, assigneeId: y.assigneeId ?? me?.id, doneAt: status === "done" ? today() : y.doneAt } : y)),
        // Finishing the last open job on a berth puts it back in service.
        berths: status === "done" ? d.berths.map((b) => (b.id === x.berthId && !d.tasks.some((y) => y.id !== x.id && y.berthId === b.id && y.status !== "done") ? { ...b, underMaintenance: false } : b)) : d.berths,
      }),
      log(status === "done" ? `Finished: ${x.title}` : `Started: ${x.title}`),
    );
    toast(status === "done" ? tr("Marked as done") : tr("Started. It's now assigned to you."), before);
  };
  const addUpdate = () => {
    if (!note.trim() && photos.length === 0) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, notes: note.trim() ? [...y.notes, { at: today(), by: me?.name ?? "Staff", text: note.trim() }] : y.notes, photos: [...(y.photos ?? []), ...photos].slice(-6) } : y)),
    }), log("Added an update"));
    setNote("");
    setPhotos([]);
    toast(tr("Update added"));
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={x.title}
      subtitle={`${x.code} · ${x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"}`}
      footer={
        canEdit && x.status === "open" && !office ? <Button variant="primary" size="lg" label={tr("Start work")} onPress={() => setStatus("in-progress")} />
        : canEdit && x.status !== "done" ? <Button variant="primary" size="lg" icon={CircleCheck} label={tr("Mark as done")} onPress={() => { setStatus("done"); onClose(); }} />
        : <Button size="lg" label={tr("Close")} onPress={onClose} />
      }
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TaskBadge status={x.status} />
        <PriorityBadge priority={x.priority} />
      </View>
      <Txt v="bodySm" color={t.text3} style={{ marginBottom: 16 }}>{tr("Due")} {fmtDate(x.due)} · {x.assigneeId ? tr("Assigned to {name}", { name: ix.staffMember(x.assigneeId)?.name }) : tr("Unassigned")}</Txt>
      {office && canEdit && x.status !== "done" && (
        <View style={{ gap: 16, marginBottom: 16 }}>
          <Field label={tr("Priority")}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <Chip key={p} label={p === "high" ? tr("Urgent") : p === "medium" ? tr("Medium") : tr("Low")} on={x.priority === p} onPress={() => {
                  if (x.priority === p) return;
                  const before = db;
                  update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, priority: p } : y)) }), log(`Priority set to ${p === "high" ? "urgent" : p}: ${x.title}`));
                  toast(tr("Priority changed"), before);
                }} />
              ))}
            </View>
          </Field>
          <Field label={tr("Due")}>
            <DayChips days={[...(x.due < today() ? [x.due] : []), ...Array.from({ length: 60 }, (_, i) => addDays(today(), i))]} value={x.due} onChange={(due) => {
              const before = db;
              update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, due } : y)) }), log(`Due date set to ${fmtShort(due)}: ${x.title}`));
              toast(tr("Due {date}", { date: fmtShort(due) }), before);
            }} />
          </Field>
        </View>
      )}
      {office && canEdit && x.status !== "done" && (
        <View style={{ marginBottom: 16 }}>
          <Field label={tr("Assign to")} hint={tr("They see it under Mine in their app.")}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {db.staff.filter((s) => s.marinaId === x.marinaId && s.position !== "Marina Manager" && s.status === "active").map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  sub={tr(s.position)}
                  on={x.assigneeId === s.id}
                  onPress={() => {
                    if (x.assigneeId === s.id) return;
                    const before = db;
                    update((d) => ({ ...d, tasks: d.tasks.map((y) => (y.id === x.id ? { ...y, assigneeId: s.id } : y)) }), log(`Assigned to ${s.name}: ${x.title}`));
                    toast(tr("Assigned to {name}", { name: s.name }), before);
                  }}
                />
              ))}
            </ScrollView>
          </Field>
        </View>
      )}
      {(x.photos?.length ?? 0) > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {x.photos!.map((p, i) => <Image key={i} source={{ uri: p }} style={{ width: 96, height: 96, borderRadius: 12 }} accessibilityLabel={tr("Task photo {v}", { v: i + 1 })} />)}
        </View>
      )}
      {x.notes.map((n, i) => (
        <View key={i} style={{ borderStartWidth: 2, borderColor: t.border, paddingStart: 12, marginBottom: 12 }}>
          <Txt v="bodySm">{n.text}</Txt>
          <Txt v="caption" color={t.text3}>{n.by} · {fmtShort(n.at)}</Txt>
        </View>
      ))}
      {canEdit && (
        <View style={{ gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginTop: 4 }}>
          <Input multiline value={note} onChangeText={setNote} placeholder={tr("Add a note…")} accessibilityLabel={tr("Add a note")} />
          <PhotoPicker photos={photos} onChange={setPhotos} />
          <Button size="sm" label={tr("Add update")} disabled={!note.trim() && photos.length === 0} onPress={addUpdate} style={{ alignSelf: "flex-start" }} />
        </View>
      )}
      <TaskParts task={x} canEdit={canEdit && x.status !== "done"} />
    </Sheet>
  );
}

/** Parts used on a work order, and taking more from the marina's stock. */
function TaskParts({ task: x, canEdit }: { task: MaintenanceTask; canEdit: boolean }) {
  const { db, update, toast } = useStore();
  const { t } = useTheme();
  const tr = useTr();
  const items = (db.inventory ?? []).filter((i) => i.marinaId === x.marinaId);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const item = items.find((i) => i.id === itemId);
  if (!items.length) return null;
  const use = () => {
    if (!item) return;
    const before = db;
    update((d) => withPartsUsed(d, x.id, item.id, qty), { text: `Used ${qty} × ${item.name} on ${x.code}`, to: `/maintenance?open=${x.id}`, marinaId: x.marinaId });
    toast(tr("{qty} × {name} taken from stock", { qty: qty, name: item.name }), before);
    setItemId("");
    setQty(1);
  };
  return (
    <View style={{ gap: 8, marginTop: 16 }}>
      <Txt v="bodySm" weight="semibold">{tr("Parts used")}</Txt>
      {(x.parts ?? []).length === 0 ? <Txt v="caption" color={t.text3}>{tr("None yet.")}</Txt> : (x.parts ?? []).map((p) => <Txt key={p.itemId} v="bodySm">{p.qty} × {items.find((i) => i.id === p.itemId)?.name}</Txt>)}
      {canEdit && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {items.map((i) => <Chip key={i.id} label={i.name} sub={`${i.qty} ${i.unit} ${tr("left")}`} on={itemId === i.id} disabled={i.qty === 0} onPress={() => { setItemId(i.id); setQty(1); }} />)}
          </ScrollView>
          {item && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Stepper label={item.unit} value={qty} onChange={setQty} max={item.qty} />
              <Button size="sm" variant="primary" label={tr("Use part")} onPress={use} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Change arrival, departure, berth or guests. Unpaid invoices follow the new price (same rule as the web app). */
export function ChangeBookingSheet({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const { t } = useTheme();
  const tr = useTr();
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
  const amount = berth ? bookingAmount(start, end, berth, db.settings.monthlyFromNights, db.settings.pricing) : 0;
  const invoice = db.invoices.find((i) => i.bookingId === b.id && i.status !== "void");
  const changed = start !== b.start || end !== b.end || berthId !== b.berthId || guests !== b.guests;
  const days = Array.from({ length: 120 }, (_, i) => addDays(now, i));

  const save = () => {
    if (!fits) return setError(tr("Berth {code} isn't free for these dates. Choose another berth.", { code: berth?.code }));
    const before = db;
    update(
      (d) => ({
        ...d,
        bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, start, end, berthId, guests, price: amount } : x)),
        // Unpaid invoices follow the new price; paid ones are left as issued.
        invoices: d.invoices.map((i) => (i.bookingId === b.id && (i.status === "due" || i.status === "overdue") ? { ...i, amount: amount + linesTotal(i) } : i)),
      }),
      { text: `Changed ${b.code}: ${fmtShort(start)}–${fmtShort(end)}, berth ${berth?.code}`, to: `/bookings?q=${b.code}`, marinaId },
    );
    toast(tr("{name} updated", { name: b.code }), before);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={tr("Change {code}", { code: b.code })} subtitle={tr("{name} · {n} ft", { name: boat?.name, n: boat?.length })} footer={<Button variant="primary" size="lg" label={tr("Save · {amount}", { amount: money2(amount) })} disabled={!changed} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Arrival")} hint={started ? tr("Already arrived") : undefined}>
          {started ? <Txt>{fmtShort(start)}</Txt> : <DayChips days={b.start < now ? [b.start, ...days] : days} value={start} onChange={(d) => { setStart(d); setError(""); }} />}
        </Field>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
          <Field label={tr("Nights")} hint={tr("Leaves {date}", { date: fmtShort(end) })}><Stepper label={tr("nights")} value={nights} onChange={(n) => { setNights(n); setError(""); }} min={started ? Math.max(1, daysBetween(b.start, now)) : 1} max={365} /></Field>
          <Field label={tr("Guests")}><Stepper label={tr("guests")} value={guests} onChange={setGuests} max={20} /></Field>
        </View>
        <Field label={tr("Berth")} error={error} hint={fits ? tr("{n} free berths fit this boat", { n: free.length }) : tr("Berth {code} isn't free for these dates", { code: berth?.code })}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {free.slice(0, 16).map((x) => <Chip key={x.id} label={x.code} sub={`${x.maxLength} ft`} on={berthId === x.id} onPress={() => { setBerthId(x.id); setError(""); }} />)}
          </View>
        </Field>
        <Row label={tr("New total")} value={money2(amount)} sub={invoice ? (invoice.status === "paid" ? tr("The invoice is already paid. Adjust any difference in Billing.") : tr("Invoice {number} is updated to match.", { number: invoice.number })) : undefined} />
        {!fits && <Txt v="caption" color={t.error.fg}>{tr("Pick one of the free berths above to save.")}</Txt>}
      </View>
    </Sheet>
  );
}

/** Cancel (or decline, when pending). The berth frees up and any unpaid invoice is voided, as on the web. */
export function CancelBookingSheet({ booking: b, decline, onClose }: { booking: Booking; decline?: boolean; onClose: () => void }) {
  const tr = useTr();
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
    toast(decline ? tr("{code} declined", { code: b.code }) : tr("{code} cancelled", { code: b.code }), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`${decline ? "Decline" : "Cancel"} ${b.code}?`} subtitle={`${boat?.name} · ${fmtShort(b.start)} – ${fmtShort(b.end)}`} footer={<Button variant="danger" size="lg" label={decline ? tr("Decline booking") : tr("Cancel booking")} onPress={confirm} />}>
      <Txt v="bodySm" color={t.text2}>
        {(decline ? tr("Berth {code} becomes free for those nights. {name} isn't told automatically: call or email them from the booking.", { code: ix.berth(b.berthId)?.code, name: owner?.name }) : tr("Berth {code} becomes free for those nights and any unpaid invoice is voided. {name} isn't told automatically: call or email them from the booking.", { code: ix.berth(b.berthId)?.code, name: owner?.name }))}
      </Txt>
      {paid && <Txt v="bodySm" color={t.error.fg} style={{ marginTop: 12 }}>{tr("{name} has already paid {amount}. Refund it from Billing in the web app.", { name: owner?.name, amount: money2(ix.paidSoFar(paid)) })}</Txt>}
    </Sheet>
  );
}

/** Berth ready check before an arrival. Ticks are saved on the booking; a failed item can go straight to a repair report. */
export function PrepChecklist({ booking: b }: { booking: Booking }) {
  const { db, ix, update, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const [reporting, setReporting] = useState(false);
  const live = db.bookings.find((x) => x.id === b.id) ?? b;
  const berth = ix.berth(b.berthId);
  const items = prepChecklist(berth);
  const done = live.prep?.done ?? [];
  const ready = items.every((i) => done.includes(i.id));
  const toggle = (id: string) =>
    update((d) => ({
      ...d,
      bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, prep: { done: done.includes(id) ? done.filter((y) => y !== id) : [...done, id], by: me?.name ?? user?.name ?? "Staff", at: new Date().toISOString() } } : x)),
    }), items.every((i) => i.id === id || done.includes(i.id)) && !done.includes(id) ? { text: `Berth ${berth?.code} ready for ${ix.boat(b.boatId)?.name}`, marinaId: berth?.marinaId } : undefined);
  return (
    <View style={{ borderWidth: 1, borderColor: ready ? t.success.fg : t.border, borderRadius: 16, padding: 12, marginBottom: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Txt v="bodySm" weight="semibold">{tr("Berth {code} ready check", { code: berth?.code })}</Txt>
        {ready ? <Badge tone="success" icon={CircleCheck} label={tr("Ready")} /> : <Txt v="caption" num color={t.text3}>{done.filter((d) => items.some((i) => i.id === d)).length} {tr("of")} {items.length}</Txt>}
      </View>
      {items.map((i) => {
        const on = done.includes(i.id);
        return (
          <Pressable key={i.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(i.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.primary : t.borderStrong, backgroundColor: on ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {on && <CircleCheck size={14} color={t.onPrimary} />}
            </View>
            <Txt v="bodySm" style={{ flex: 1 }}>{tr(i.label)}</Txt>
          </Pressable>
        );
      })}
      {live.prep && <Txt v="caption" color={t.text3}>{tr("Last checked by {name}, {date}", { name: live.prep.by, date: fmtShort(live.prep.at.slice(0, 10)) })}</Txt>}
      {!ready && <Button size="sm" icon={TriangleAlert} label={tr("Something's wrong: report it")} onPress={() => setReporting(true)} style={{ alignSelf: "flex-start", marginTop: 4 }} />}
      {reporting && <ReportProblem berthId={b.berthId} onClose={() => setReporting(false)} />}
    </View>
  );
}

const CONDITIONS: { id: BoatCondition; label: string }[] = [
  { id: "good", label: "Good" },
  { id: "marks", label: "Minor marks" },
  { id: "damage", label: "Damage" },
];

/** Check a boat in with a condition record, photos and the owner's signature. */
export function CheckInSheet({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const owner = ix.ownerOfBooking(b);
  const [condition, setCondition] = useState<BoatCondition>("good");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<Signature | undefined>();
  const [absent, setAbsent] = useState(false);
  const [error, setError] = useState("");
  const boat = ix.boat(b.boatId);
  const save = () => {
    if (condition !== "good" && !notes.trim() && photos.length === 0) return setError(tr("Describe the marks or damage, or add a photo."));
    if (!signature && !absent) return setError(tr("Ask the owner to sign, or tick that they aren't here."));
    const before = db;
    const record: ArrivalRecord = { condition, notes: notes.trim(), photos, signature: absent ? undefined : signature, signedBy: absent ? undefined : owner?.name, unsigned: absent || undefined, by: me?.name ?? user?.name ?? "Staff", at: new Date().toISOString() };
    update(
      (d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "checked-in" as const, arrival: record } : x)) }),
      { text: `${boat?.name} checked in (${b.code})${condition !== "good" ? `, ${condition === "damage" ? "damage" : "minor marks"} noted` : ""}${absent ? ", not signed" : ", signed by owner"}`, to: `/bookings?q=${b.code}`, marinaId: ix.berth(b.berthId)?.marinaId },
    );
    toast(tr("{name} checked in", { name: boat?.name }), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Check in {name}", { name: boat?.name })} subtitle={tr("Berth {code} · {name}", { code: ix.berth(b.berthId)?.code, name: owner?.name })} footer={<Button variant="primary" size="lg" icon={LogIn} label={tr("Check in")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Boat condition on arrival")}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {CONDITIONS.map((c) => <Chip key={c.id} label={tr(c.label)} on={condition === c.id} onPress={() => { setCondition(c.id); setError(""); }} />)}
          </View>
        </Field>
        {condition !== "good" && (
          <Field label={tr("What did you see?")}>
            <Input multiline value={notes} onChangeText={(v) => { setNotes(v); setError(""); }} placeholder={tr("e.g. Scratch on the port bow, about 30 cm")} />
          </Field>
        )}
        <PhotoPicker photos={photos} onChange={setPhotos} max={4} />
        <Field label={tr("{name}'s signature", { name: owner?.name ?? tr("Owner") })} hint={tr("Confirms the boat's condition and the marina rules.")}>
          {absent ? (
            <Txt v="bodySm" color={t.text3}>{tr("Owner not here. The check-in is recorded without a signature.")}</Txt>
          ) : (
            <SignaturePad label={tr("{name}'s signature", { name: owner?.name ?? tr("Owner") })} value={signature} onChange={(s) => { setSignature(s); setError(""); }} />
          )}
        </Field>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: absent }} onPress={() => { setAbsent(!absent); setError(""); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: t.primary, backgroundColor: absent ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
            {absent && <CircleCheck size={14} color={t.onPrimary} />}
          </View>
          <Txt v="bodySm">{tr("The owner isn't here to sign")}</Txt>
        </Pressable>
        {error ? <Txt v="bodySm" weight="medium" color={t.error.fg}>{error}</Txt> : null}
      </View>
    </Sheet>
  );
}

/** The saved check-in record on a booking. */
function ArrivalSummary({ record }: { record: ArrivalRecord }) {
  const tr = useTr();
  const { t } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginBottom: 12, gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Txt v="bodySm" weight="semibold">{tr("Arrival record")}</Txt>
        <Badge tone={record.condition === "good" ? "success" : record.condition === "marks" ? "pending" : "maintenance"} label={tr(CONDITIONS.find((c) => c.id === record.condition)?.label ?? "")} />
      </View>
      {record.notes ? <Txt v="bodySm">{record.notes}</Txt> : null}
      {record.photos.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {record.photos.map((p, i) => <Image key={i} source={{ uri: p }} style={{ width: 72, height: 72, borderRadius: 10 }} accessibilityLabel={tr("Arrival photo {v}", { v: i + 1 })} />)}
        </View>
      )}
      {record.signature ? <SignatureView value={record.signature} /> : <Txt v="caption" color={t.text3}>{tr("Not signed: owner wasn't there.")}</Txt>}
      <Txt v="caption" color={t.text3}>{record.signedBy ? tr("Signed by {signedBy} · ", { signedBy: record.signedBy }) : ""}{tr("Checked in by {name}, {date}", { name: record.by, date: fmtShort(record.at.slice(0, 10)) })}</Txt>
    </View>
  );
}

/** Log a service for a boat staying with us (fuel, pump-out, ice…); the charge goes on the stay's invoice. */
export function ServiceSheet({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const [serviceId, setServiceId] = useState<(typeof SERVICES)[number]["id"]>("gas");
  const service = SERVICES.find((x) => x.id === serviceId)!;
  const [qty, setQty] = useState(20);
  const amount = Math.round(qty * service.price * 100) / 100;
  const boat = ix.boat(b.boatId);
  const pick = (id: (typeof SERVICES)[number]["id"]) => {
    const next = SERVICES.find((x) => x.id === id)!;
    setServiceId(id);
    setQty(next.unit === "gal" ? 20 : 1);
  };
  const save = () => {
    const before = db;
    const line = { label: service.label, qty, unit: service.unit, unitPrice: service.price, amount, at: new Date().toISOString(), by: me?.name ?? user?.name ?? "Staff" };
    update((d) => withServiceCharge(d, b.id, ix.amount(b), line), { text: `${service.label} for ${boat?.name}: ${qty} ${service.unit}, ${money2(amount)} added to the invoice`, to: `/bookings?q=${b.code}`, marinaId: ix.berth(b.berthId)?.marinaId });
    toast(tr("{amount} added to {name}'s invoice", { amount: money2(amount), name: boat?.name }), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Add a service")} subtitle={tr("{name} · berth {code}", { name: boat?.name, code: ix.berth(b.berthId)?.code })} footer={<Button variant="primary" size="lg" label={tr("Add {amount} to invoice", { amount: money2(amount) })} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Service")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SERVICES.map((x) => <Chip key={x.id} label={x.label} sub={`${money2(x.price)} / ${x.unit}`} on={serviceId === x.id} onPress={() => pick(x.id)} />)}
          </View>
        </Field>
        <Field label={service.unit === "gal" ? tr("Gallons") : tr("How many?")}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Stepper label={service.unit} value={qty} onChange={setQty} max={service.unit === "gal" ? 500 : 20} unit={service.unit} />
            {service.unit === "gal" && [10, 50, 100].map((n) => <Chip key={n} label={`+${n}`} on={false} onPress={() => setQty(Math.min(500, qty + n))} />)}
          </View>
        </Field>
        <Row label={tr("Charge")} value={money2(amount)} sub={`${qty} × ${money2(service.price)}`} />
        <Txt v="caption" color={t.text3}>{tr("Added to the stay's invoice. If it was already paid, the extra becomes due.")}</Txt>
      </View>
    </Sheet>
  );
}

/** Read the power and water meters on a berth; usage since the last reading goes on the boat's invoice. */
export function MeterSheet({ berth, onClose }: { berth: Berth; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const kinds = (["power", "water"] as MeterKind[]).filter((k) => (k === "power" ? berth.power : berth.water));
  const [values, setValues] = useState<Record<MeterKind, string>>({ power: "", water: "" });
  const [error, setError] = useState("");
  const cur = ix.currentBooking(berth.id);
  const rates = db.settings.utilities ?? DEFAULT_UTILITIES;
  const usageOf = (k: MeterKind) => {
    const prev = lastReading(db, berth.id, k);
    const v = Number(values[k]);
    return values[k] && prev && v >= prev.value ? v - prev.value : undefined;
  };
  const save = () => {
    for (const k of kinds) {
      const prev = lastReading(db, berth.id, k);
      if (values[k] && prev && Number(values[k]) < prev.value) return setError(tr("The {k} reading is lower than last time ({toLocaleString}). Check the meter.", { k: k, toLocaleString: prev.value.toLocaleString() }));
    }
    if (!kinds.some((k) => values[k])) return setError(tr("Enter at least one reading."));
    const before = db;
    let total = 0;
    update((d) => {
      let next = d;
      for (const k of kinds) {
        if (!values[k]) continue;
        const r = withMeterReading(next, { berthId: berth.id, kind: k, value: Number(values[k]), at: new Date().toISOString(), by: me?.name ?? user?.name ?? "Staff" }, cur ? { id: cur.id, amount: ix.amount(cur) } : undefined);
        next = r.db;
        total += r.charge;
      }
      return next;
    }, { text: `Meter readings for berth ${berth.code}${cur ? `, billed to ${ix.boat(cur.boatId)?.name}` : ""}`, marinaId: berth.marinaId });
    toast(cur && total > 0 ? tr("Saved. {amount} added to {name}'s invoice.", { amount: money2(total), name: ix.boat(cur.boatId)?.name }) : tr("Readings saved"), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Meters · berth {code}", { code: berth.code })} subtitle={cur ? tr("Usage is billed to {name}", { name: ix.boat(cur.boatId)?.name }) : tr("No boat here: this sets the starting point")} footer={<Button variant="primary" size="lg" icon={Gauge} label={tr("Save readings")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        {kinds.map((k) => {
          const prev = lastReading(db, berth.id, k);
          const usage = usageOf(k);
          const rate = k === "power" ? rates.powerPerKwh : rates.waterPerGallon;
          return (
            <Field key={k} label={`${k === "power" ? tr("Power") : tr("Water")} (${tr(METER_UNIT[k])})`} hint={usage !== undefined ? tr("{n} {unit} used · {amount}", { n: usage.toLocaleString(), unit: tr(METER_UNIT[k]), amount: money2(Math.round(usage * rate * 100) / 100) }) : prev ? tr("Last {n}, {date}", { n: prev.value.toLocaleString(), date: fmtShort(prev.at.slice(0, 10)) }) : tr("First reading")}>
              <Input value={values[k]} onChangeText={(v) => { setValues({ ...values, [k]: v.replace(/[^\d.]/g, "") }); setError(""); }} keyboardType="number-pad" placeholder={prev ? String(prev.value) : "0"} />
            </Field>
          );
        })}
        {error ? <Txt v="bodySm" weight="medium" color={t.error.fg}>{error}</Txt> : null}
      </View>
    </Sheet>
  );
}
