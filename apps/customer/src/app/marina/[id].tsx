// One marina: what it costs, its berth sizes, amenities and dock office, and checking availability.
import { Linking, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Droplets, Mail, MapPin, Phone, Plug, Ruler, Search } from "lucide-react-native";
import { ftM, marinaFacts, money, stateOf } from "@marina/shared";
import { Button, Card, EmptyState, Section, StackHeader, Txt } from "@/components/ui";
import { Body, MarinaActions } from "@/components/parts";
import { useStore } from "@/store";
import { alignEnd, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { stamp } from "@/lib/useOpenParam";

export default function MarinaScreen() {
  const { t } = useTheme();
  const tr = useTr();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, ix } = useStore();
  const marina = ix.marina(id);
  if (!marina || marina.status !== "active")
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title={tr("Marina")} />
        <Body><Card><EmptyState icon={MapPin} title={tr("This marina isn't taking bookings")} body={tr("It may be closed for now. Have a look at our other marinas.")} /></Card></Body>
      </View>
    );
  const city = ix.city(marina.cityId);
  const f = marinaFacts(db, marina.id);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={marina.name} subtitle={`${city?.name}, ${tr(stateOf(db, marina))}`} />
      <Body>
        <Card style={{ gap: 6, backgroundColor: t.primary, borderColor: t.primary }}>
          <Txt v="caption" color={t.onPrimary} style={{ opacity: 0.8 }}>{city?.name}, {tr(stateOf(db, marina))}</Txt>
          <Txt v="h1" color={t.onPrimary}>{marina.name}</Txt>
          <Txt v="bodySm" color={t.onPrimary} style={{ opacity: 0.85 }}>{tr("{n} berths · boats up to {length} · from {price} a night", { n: f.berths, length: ftM(f.maxLength), price: money(f.fromDaily, f.currency) })}</Txt>
          <Button size="lg" icon={Search} label={tr("Check availability")} style={{ marginTop: 12 }} onPress={() => { router.dismissAll(); router.navigate({ pathname: "/book", params: { marina: marina.id, at: stamp() } }); }} />
        </Card>

        <Section title={tr("Berths and rates")}>
          <Txt v="caption" color={t.text3}>{tr("Nightly rates. Stays of {n} nights or more are charged at the monthly rate, prorated by the night.", { n: db.settings.monthlyFromNights })}</Txt>
          <Card style={{ paddingVertical: 4 }}>
            <View style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: t.border }}>
              <Txt v="caption" color={t.text3} style={{ flex: 1.2 }}>{tr("Boats up to")}</Txt>
              <Txt v="caption" color={t.text3} style={{ flex: 0.8 }}>{tr("Berths")}</Txt>
              <Txt v="caption" color={t.text3} style={{ flex: 1, textAlign: alignEnd() }}>{tr("Per night from")}</Txt>
              <Txt v="caption" color={t.text3} style={{ flex: 1, textAlign: alignEnd() }}>{tr("Per month from")}</Txt>
            </View>
            {f.sizes.map((s, i) => (
              <View key={s.maxLength} style={{ flexDirection: "row", paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                <Txt v="bodySm" weight="medium" style={{ flex: 1.2 }}>{tr("{ft} ft", { ft: s.maxLength })}</Txt>
                <Txt v="bodySm" num color={t.text2} style={{ flex: 0.8 }}>{s.count}</Txt>
                <Txt v="bodySm" num style={{ flex: 1, textAlign: alignEnd() }}>{money(s.daily, f.currency)}</Txt>
                <Txt v="bodySm" num style={{ flex: 1, textAlign: alignEnd() }}>{money(s.monthly, f.currency)}</Txt>
              </View>
            ))}
          </Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {f.power && <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Plug size={16} color={t.secondary} /><Txt v="bodySm" color={t.text2}>{tr("Shore power")}</Txt></View>}
            {f.water && <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Droplets size={16} color={t.secondary} /><Txt v="bodySm" color={t.text2}>{tr("Fresh water")}</Txt></View>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ruler size={16} color={t.secondary} /><Txt v="bodySm" color={t.text2}>{tr("Boats up to {ft} ft", { ft: f.maxLength })}</Txt></View>
          </View>
        </Section>

        <Section title={tr("Amenities")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {marina.amenities.map((a) => (
              <View key={a} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.surface }}>
                <Txt v="bodySm">{tr(a)}</Txt>
              </View>
            ))}
          </View>
        </Section>

        <Section title={tr("Dock office")}>
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}><MapPin size={16} color={t.text3} /><Txt v="bodySm" style={{ flex: 1 }}>{marina.address}</Txt></View>
            <View style={{ flexDirection: "row", gap: 8 }}><Phone size={16} color={t.text3} /><Txt v="bodySm">{marina.phone}</Txt></View>
            <View style={{ flexDirection: "row", gap: 8 }}><Mail size={16} color={t.text3} /><Txt v="bodySm" style={{ flex: 1 }} >{marina.email}</Txt></View>
            <MarinaActions marina={marina} />
            <Button size="sm" variant="ghost" icon={Mail} label={tr("Email the dock office")} onPress={() => void Linking.openURL(`mailto:${marina.email}`)} />
          </Card>
        </Section>
      </Body>
    </View>
  );
}
