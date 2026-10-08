// Search results: free berths that fit the boat for the whole stay, grouped by marina, cheapest
// marina first, with the price. Booking needs an account; when nothing is free, owners can join
// the marina's waitlist.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Clock, Droplets, Plug, Ruler } from "lucide-react-native";
import {
  availableBerths, daysBetween, fmtDate, money, priceNote, quote, searchProblem, stateOf, tn, today, withWaitlistRequest, type Berth,
} from "@marina/shared";
import { Badge, Button, Card, EmptyState, StackHeader, Txt } from "@/components/ui";
import { Body } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

const SHOWN_PER_MARINA = 4;

function BerthRow({ berth, start, end, length, first }: { berth: Berth; start: string; end: string; length: string; first: boolean }) {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner } = useStore();
  const price = quote(db, berth, start, end);
  const book = () => {
    const checkout = { pathname: "/checkout" as const, params: { berth: berth.id, start, end, length } };
    if (owner) router.push(checkout);
    else router.push({ pathname: "/sign-in", params: { next: JSON.stringify(checkout) } });
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderColor: t.border }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight="medium">{tr("Berth {code}", { code: berth.code })} <Txt v="bodySm" color={t.text3}>· {tr(berth.type)}</Txt></Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ruler size={13} color={t.text3} /><Txt v="caption" color={t.text3}>{tr("Up to {ft} ft", { ft: berth.maxLength })}</Txt></View>
          {berth.power && <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Plug size={13} color={t.text3} /><Txt v="caption" color={t.text3}>{tr("Power")}</Txt></View>}
          {berth.water && <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Droplets size={13} color={t.text3} /><Txt v="caption" color={t.text3}>{tr("Water")}</Txt></View>}
        </View>
        <Txt v="caption" color={t.text3}>{tr(priceNote(start, end, db.settings.monthlyFromNights, db.settings.pricing))}</Txt>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Txt num weight="semibold">{money(price, ix.curOfBerth(berth.id))}</Txt>
        <Button size="sm" variant="primary" label={tr("Book")} onPress={book} />
      </View>
    </View>
  );
}

export default function Results() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner, update, toast } = useStore();
  const q = useLocalSearchParams<{ marina?: string; start: string; end: string; length: string }>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const problem = searchProblem({ start: q.start, end: q.end, length: Number(q.length), marinaId: q.marina || undefined }, today());
  const results = useMemo(() => (problem ? [] : availableBerths(db, { start: q.start, end: q.end, length: Number(q.length), marinaId: q.marina || undefined })), [db, q.start, q.end, q.length, q.marina, problem]);
  const byMarina = useMemo(() => {
    const map = new Map<string, Berth[]>();
    for (const b of results) map.set(b.marinaId, [...(map.get(b.marinaId) ?? []), b]);
    return [...map.entries()].sort((a, b) => quote(db, a[1][0], q.start, q.end) - quote(db, b[1][0], q.start, q.end));
  }, [results, db, q.start, q.end]);
  const nights = daysBetween(q.start, q.end);

  // Waitlist for the chosen marina when it's full (owners only: the request uses their details).
  const waitlistMarina = q.marina ? ix.marina(q.marina) : undefined;
  const joinWaitlist = () => {
    if (!owner) return router.push("/sign-in");
    if (!waitlistMarina) return;
    const boat = db.boats.find((b) => b.ownerId === owner.id && b.length >= Number(q.length)) ?? db.boats.find((b) => b.ownerId === owner.id);
    const r = withWaitlistRequest(db, { marinaId: waitlistMarina.id, start: q.start, end: q.end, boatLength: Number(q.length), name: owner.name, email: owner.email, phone: owner.phone, boatName: boat?.name ?? tr("My boat"), now: today(), at: new Date().toISOString() });
    update(() => r.db);
    toast(r.duplicate ? tr("You're already on the waitlist for these dates") : tr("You're on the waitlist at {marina}", { marina: waitlistMarina.name }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Free berths")} subtitle={problem ? undefined : tn(nights, "{n} night, {from} to {to}, for a {ft} ft boat.", "{n} nights, {from} to {to}, for a {ft} ft boat.", { from: fmtDate(q.start), to: fmtDate(q.end), ft: q.length })} />
      <Body>
        {problem ? (
          <Card><Txt color={t.text2}>{tr(problem)}</Txt></Card>
        ) : byMarina.length === 0 ? (
          <Card>
            <EmptyState icon={CalendarDays} title={tr("No free berths for these dates")} body={tr("Try other dates or another marina, or call a dock office: they can sometimes move bookings around.")} />
            {waitlistMarina && <Button variant="primary" icon={Clock} label={tr("Join the waitlist")} onPress={joinWaitlist} />}
            <Button label={tr("Change search")} onPress={() => router.back()} style={{ marginTop: 8 }} />
          </Card>
        ) : (
          <>
            <Txt v="bodySm" color={t.text3}>{tn(results.length, "{n} free berth at {m} marinas", "{n} free berths at {m} marinas", { m: byMarina.length })}</Txt>
            {byMarina.map(([marinaId, berths]) => {
              const m = ix.marina(marinaId)!;
              const open = expanded[marinaId];
              return (
                <Card key={marinaId} style={{ paddingBottom: 4 }}>
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/marina/[id]", params: { id: m.id } })} style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Txt v="h3">{m.name}</Txt>
                      <Txt v="caption" color={t.text3}>{ix.city(m.cityId)?.name}, {tr(stateOf(db, m))}</Txt>
                    </View>
                    <Badge tone="success" label={tn(berths.length, "{n} berth free", "{n} berths free")} />
                  </Pressable>
                  {(open ? berths : berths.slice(0, SHOWN_PER_MARINA)).map((b, i) => <BerthRow key={b.id} berth={b} start={q.start} end={q.end} length={q.length} first={i === 0} />)}
                  {berths.length > SHOWN_PER_MARINA && (
                    <Pressable accessibilityRole="button" onPress={() => setExpanded((s) => ({ ...s, [marinaId]: !open }))} style={{ borderTopWidth: 1, borderColor: t.border, paddingVertical: 12, alignItems: "center" }}>
                      <Txt v="bodySm" weight="semibold" color={t.greenText}>{open ? tr("Show fewer") : tn(berths.length - SHOWN_PER_MARINA, "Show {n} more berth", "Show {n} more berths")}</Txt>
                    </Pressable>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </Body>
    </View>
  );
}
