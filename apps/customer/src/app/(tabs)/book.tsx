// Book: choose a marina (or any), the arrival day, how many nights and the boat, then see the free
// berths. Visitors can search; they sign in when they book.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, MapPin, Search, Ship } from "lucide-react-native";
import { addDays, fmtDate, MAX_ONLINE_NIGHTS, openMarinas, searchProblem, stateOf, tn, today } from "@marina/shared";
import { Button, Card, Chip, DayChips, Field, Input, Section, Sheet, Stepper, Txt } from "@/components/ui";
import { Page } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

/** Arrival days offered: today and the next 90 days. */
const DAYS = 91;

export default function Book() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner } = useStore();
  const params = useLocalSearchParams<{ marina?: string; at?: string }>();
  const boats = useMemo(() => (owner ? db.boats.filter((b) => b.ownerId === owner.id) : []), [db.boats, owner]);
  const [marinaId, setMarinaId] = useState(params.marina ?? "");
  const [start, setStart] = useState(addDays(today(), 1));
  const [nights, setNights] = useState(3);
  const [boatId, setBoatId] = useState(boats[0]?.id ?? "");
  const [length, setLength] = useState(boats[0] ? String(boats[0].length) : "30");
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");

  // Opened from a marina's page ("Check availability"): search that marina.
  const link = `${params.marina ?? ""}:${params.at ?? ""}`;
  const [seen, setSeen] = useState(link);
  if (link !== seen) {
    setSeen(link);
    if (params.marina !== undefined) setMarinaId(params.marina);
  }

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(today(), i)), []);
  const marinas = openMarinas(db);
  const marina = ix.marina(marinaId);
  const end = addDays(start, nights);

  const search = () => {
    const problem = searchProblem({ start, end, length: Number(length), marinaId: marinaId || undefined }, today());
    if (problem) return setError(tr(problem));
    router.push({ pathname: "/results", params: { marina: marinaId, start, end, length } });
  };

  return (
    <Page title={tr("Book a berth")}>
      <Txt color={t.text2} style={{ marginTop: -8 }}>{tr("See which berths are free for your dates and boat, and the price.")}</Txt>

      <Card style={{ gap: 20 }}>
        <Field label={tr("Marina")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Marina: {name}. Change", { name: marina?.name ?? tr("Any marina") })}
            onPress={() => setChoosing(true)}
            style={({ pressed }) => ({ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: t.borderStrong, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pressed ? t.sidebar : t.surface })}
          >
            <MapPin size={18} color={t.text3} />
            <Txt style={{ flex: 1 }} numberOfLines={1}>{marina?.name ?? tr("Any marina")}</Txt>
            <ChevronDown size={18} color={t.text3} />
          </Pressable>
        </Field>

        <Field label={tr("Arrive")}>
          <DayChips days={days} value={start} onChange={(d) => { setStart(d); setError(""); }} />
        </Field>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="bodySm" weight="medium">{tr("Nights")}</Txt>
            <Txt v="caption" color={t.text3}>{tr("Leave {date}", { date: fmtDate(end) })}</Txt>
          </View>
          <Stepper value={nights} onChange={(n) => { setNights(n); setError(""); }} min={1} max={MAX_ONLINE_NIGHTS} label={tr("Nights")} />
        </View>

        <Field label={tr("Your boat")}>
          {boats.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
              {boats.map((b) => <Chip key={b.id} label={b.name} sub={tr("{ft} ft", { ft: b.length })} on={boatId === b.id} onPress={() => { setBoatId(b.id); setLength(String(b.length)); setError(""); }} />)}
              <Chip label={tr("Other")} sub={tr("Enter length")} on={!boatId} onPress={() => setBoatId("")} />
            </View>
          )}
          {(!boats.length || !boatId) && (
            <Input value={length} onChangeText={(v) => { setLength(v.replace(/[^\d]/g, "")); setError(""); }} keyboardType="number-pad" accessibilityLabel={tr("Boat length (ft)")} placeholder={tr("Boat length (ft)")} />
          )}
        </Field>

        {error ? <Txt v="bodySm" weight="medium" color={t.error.fg}>{error}</Txt> : null}
        <Button variant="primary" size="lg" icon={Search} label={tr("Search")} onPress={search} />
        <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginTop: -8 }}>{tn(nights, "{n} night, {from} to {to}, for a {ft} ft boat.", "{n} nights, {from} to {to}, for a {ft} ft boat.", { from: fmtDate(start), to: fmtDate(end), ft: length || "?" })}</Txt>
      </Card>

      <Section title={tr("Not sure where to stay?")}>
        <Card onPress={() => router.push("/marinas")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ship size={20} color={t.text3} />
          <Txt style={{ flex: 1 }}>{tr("Explore our marinas")}</Txt>
        </Card>
      </Section>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title={tr("Choose marina")}>
        {["", ...marinas.map((m) => m.id)].map((id) => {
          const m = ix.marina(id);
          return (
            <Pressable
              key={id || "any"}
              accessibilityRole="radio"
              accessibilityState={{ checked: id === marinaId }}
              onPress={() => { setMarinaId(id); setChoosing(false); setError(""); }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
            >
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{m ? m.name : tr("Any marina")}</Txt>
                <Txt v="caption" color={t.text3}>{m ? `${ix.city(m.cityId)?.name}, ${tr(stateOf(db, m))}` : tr("Search them all")}</Txt>
              </View>
              {id === marinaId && <Check size={20} color={t.green} />}
            </Pressable>
          );
        })}
      </Sheet>
    </Page>
  );
}
