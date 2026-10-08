// Checkout: pick the boat (or add one), people on board, agree to the berth rules and send the
// booking request. Nothing is charged: the marina confirms it and sends the invoice.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Send, Ship } from "lucide-react-native";
import {
  berthIsFree, daysBetween, fmtDate, money, priceNote, quote, searchProblem, stateOf, tn, today, withBoat, withOnlineBooking,
} from "@marina/shared";
import { Button, Card, Chip, EmptyState, Field, Input, Row, StackHeader, Stepper, Txt } from "@/components/ui";
import { Body, CheckRow, RadioRow } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { BOAT_TYPES } from "@/lib/boats";
import { stamp } from "@/lib/useOpenParam";

export default function Checkout() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner, update, toast } = useStore();
  const q = useLocalSearchParams<{ berth: string; start: string; end: string; length: string }>();
  const berth = ix.berth(q.berth ?? "");
  const length = Number(q.length) || 0;
  const boats = owner ? db.boats.filter((b) => b.ownerId === owner.id) : [];
  const fitting = berth ? boats.filter((b) => b.length <= berth.maxLength) : [];
  const [boatId, setBoatId] = useState(fitting[0]?.id ?? "new");
  const [boat, setBoat] = useState({ name: "", type: BOAT_TYPES[0], length: String(length || "") });
  const [registration, setRegistration] = useState("");
  const [guests, setGuests] = useState(2);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!owner) return <Redirect href="/sign-in" />;
  const problem = searchProblem({ start: q.start, end: q.end, length: length || 1 }, today());
  if (!berth || problem || !berthIsFree(db, berth.id, q.start, q.end))
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title={tr("Confirm your booking")} />
        <Body>
          <Card>
            <EmptyState icon={CalendarDays} title={tr("This berth isn't available any more")} body={problem ? tr(problem) : tr("Someone may have just booked it. Search again to see what's free.")} />
            <Button variant="primary" label={tr("Back to results")} onPress={() => router.back()} />
          </Card>
        </Body>
      </View>
    );

  const marina = ix.marina(berth.marinaId)!;
  const price = quote(db, berth, q.start, q.end);
  const nights = daysBetween(q.start, q.end);

  const submit = () => {
    const e: Record<string, string> = {};
    if (boatId === "new") {
      if (!boat.name.trim()) e.name = tr("Enter your boat's name.");
      const len = Number(boat.length);
      if (!(len > 0)) e.length = tr("Enter your boat's length in feet.");
      else if (len > berth.maxLength) e.length = tr("This berth takes boats up to {ft} ft.", { ft: berth.maxLength });
    }
    if (!agree) e.agree = tr("Please agree to the berth rules to book.");
    setErrors(e);
    if (Object.keys(e).length) return;
    let d = db;
    let id = boatId;
    if (boatId === "new") {
      const saved = withBoat(d, owner.id, { name: boat.name.trim(), type: boat.type, length: Number(boat.length), registration: registration.trim() });
      d = saved.db;
      id = saved.boat.id;
    }
    const r = withOnlineBooking(d, { boatId: id, berthId: berth.id, start: q.start, end: q.end, guests, now: today(), at: new Date().toISOString() });
    if (r.error || !r.booking) return setErrors({ form: tr(r.error ?? "Something went wrong. Try again.") });
    update(() => r.db);
    toast(tr("Booking {code} sent to {marina}", { code: r.booking.code, marina: marina.name }));
    router.dismissAll();
    router.navigate({ pathname: "/bookings", params: { fresh: r.booking.code, view: "upcoming", at: stamp() } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Confirm your booking")} subtitle={marina.name} />
      <Body>
        <Card style={{ gap: 2 }}>
          <Txt v="caption" color={t.text3}>{ix.city(marina.cityId)?.name}, {tr(stateOf(db, marina))}</Txt>
          <Txt v="h3" style={{ marginBottom: 12 }}>{marina.name}</Txt>
          <Row label={tr("Berth")} value={`${berth.code} · ${tr("up to {ft} ft", { ft: berth.maxLength })}`} />
          <Row label={tr("Arrive")} value={fmtDate(q.start)} />
          <Row label={tr("date|Leave")} value={fmtDate(q.end)} />
          <Row label={tr("Nights")} value={String(nights)} />
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Txt weight="medium">{tr("Total")}</Txt>
            <Txt v="h2" num weight="semibold">{money(price, ix.curOfBerth(berth.id))}</Txt>
          </View>
          <Txt v="caption" color={t.text3}>{tr(priceNote(q.start, q.end, db.settings.monthlyFromNights, db.settings.pricing))}</Txt>
          <Txt v="caption" color={t.text3}>{tr("Power, water and fuel you use are added to the invoice.")}</Txt>
        </Card>

        <Card style={{ gap: 8 }}>
          <Txt v="h3" style={{ marginBottom: 4 }}>{tr("Your boat")}</Txt>
          {fitting.map((b) => <RadioRow key={b.id} icon={Ship} on={boatId === b.id} onPress={() => setBoatId(b.id)} title={b.name} sub={`${tr(b.type)} · ${tr("{ft} ft", { ft: b.length })}`} />)}
          {boats.length > fitting.length && <Txt v="caption" color={t.text3}>{tn(boats.length - fitting.length, "{n} of your boats is too long for this berth.", "{n} of your boats are too long for this berth.")}</Txt>}
          <RadioRow on={boatId === "new"} onPress={() => setBoatId("new")} title={fitting.length ? tr("A different boat") : tr("Add your boat")} />
          {boatId === "new" && (
            <View style={{ gap: 14, marginTop: 8 }}>
              <Field label={tr("Boat name")} error={errors.name}><Input value={boat.name} onChangeText={(v) => setBoat((s) => ({ ...s, name: v }))} invalid={!!errors.name} /></Field>
              <Field label={tr("Type")}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {BOAT_TYPES.map((x) => <Chip key={x} label={tr(x)} on={boat.type === x} onPress={() => setBoat((s) => ({ ...s, type: x }))} />)}
                </View>
              </Field>
              <Field label={tr("Length (ft)")} error={errors.length}><Input value={boat.length} keyboardType="number-pad" onChangeText={(v) => setBoat((s) => ({ ...s, length: v.replace(/[^\d]/g, "") }))} invalid={!!errors.length} /></Field>
              <Field label={tr("Registration")} hint={tr("Optional")}><Input value={registration} onChangeText={setRegistration} autoCapitalize="characters" /></Field>
            </View>
          )}
        </Card>

        <Card style={{ gap: 16 }}>
          <Txt v="h3">{tr("Stay details")}</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt v="bodySm" weight="medium">{tr("People on board")}</Txt>
            <Stepper value={guests} onChange={setGuests} min={1} max={12} label={tr("People on board")} />
          </View>
          <CheckRow checked={agree} onChange={(v) => { setAgree(v); setErrors((s) => ({ ...s, agree: "" })); }} invalid={!!errors.agree}
            label={tr("I agree to the marina's berth rules: check in at the dock office on arrival, keep the berth clear on departure, and pay the invoice by its due date.")} />
          {errors.agree ? <Txt v="caption" weight="medium" color={t.error.fg}>{errors.agree}</Txt> : null}
        </Card>

        {errors.form ? <Txt v="bodySm" weight="medium" color={t.error.fg}>{errors.form}</Txt> : null}
        <Button variant="primary" size="lg" icon={Send} label={tr("Send booking request")} onPress={submit} />
        <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{tr("Nothing is charged now. {marina} confirms your booking and sends the invoice.", { marina: marina.name })}</Txt>
      </Body>
    </View>
  );
}
