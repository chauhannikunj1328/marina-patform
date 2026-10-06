// One marina at a glance for managers and admins: numbers, revenue, contacts and staff, with a
// button to switch the app to that marina.
import { Linking, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowRightLeft, Mail, MapPin, Phone, Warehouse } from "lucide-react-native";
import { fmtMonth, lastMonths, money, openEntry, pct, today } from "@marina/shared";
import { Button, Card, EmptyState, Row, Screen, Section, StackHeader, Txt } from "@/components/ui";
import { berthLabel } from "@/components/status";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function MarinaPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, ix, user, scope, isManager, marinaId, setMarinaId } = useStore();
  const { t } = useTheme();
  if (!user) return <Redirect href="/login" />;
  const marina = id && scope.includes(id) ? ix.marina(id) : undefined;
  if (!isManager || !marina) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title="Marina" />
        <EmptyState icon={MapPin} title="Marina not found" body="It isn't one of the marinas you can see." />
      </View>
    );
  }
  const now = today();
  const m = ix.metrics([marina.id]);
  const city = ix.city(marina.cityId);
  const county = ix.county(city?.countyId ?? "");
  const months = lastMonths(3, now);
  const revenue = ix.revenueByMonth([marina.id], months);
  const staff = db.staff.filter((s) => s.marinaId === marina.id);
  const managers = staff.filter((s) => s.position === "Marina Manager");
  const tasks = db.tasks.filter((x) => x.marinaId === marina.id && x.status !== "done");
  const bookings = ix.bookingsIn([marina.id]);
  const arrivals = bookings.filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending")).length;
  const departures = bookings.filter((b) => b.end === now && b.status === "checked-in").length;
  const overdue = db.invoices.filter((i) => i.status === "overdue" && ix.marinaOfInvoice(i) === marina.id);
  const switchTo = () => {
    setMarinaId(marina.id);
    router.dismissTo("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={marina.name} subtitle={`${city?.name}${county ? `, ${county.name}` : ""}${marina.status === "inactive" ? " · inactive" : ""}`} />
      <Screen>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {[
            { label: "Occupancy", value: pct(m.occupancy), sub: `${m.occupied} of ${m.berths} berths` },
            { label: "Revenue this month", value: money(m.revenue), sub: `${m.revenueChange >= 0 ? "+" : ""}${(m.revenueChange * 100).toFixed(1)}% on last month` },
            { label: "Still to arrive · leave", value: `${arrivals} · ${departures}`, sub: `${m.checkedIn} boats in now` },
            { label: "Staff on the clock", value: String(staff.filter((s) => openEntry(db, s.id)).length), sub: `of ${staff.length} staff` },
          ].map((k) => (
            <Card key={k.label} style={{ flexBasis: "48%", flexGrow: 1, padding: 12 }}>
              <Txt v="caption" color={t.text3}>{k.label}</Txt>
              <Txt v="kpi" num>{k.value}</Txt>
              <Txt v="caption" num color={t.text3}>{k.sub}</Txt>
            </Card>
          ))}
        </View>

        <Section title="Berths" action={<Button size="sm" icon={Warehouse} label="Dock map" onPress={() => { setMarinaId(marina.id); router.navigate("/berths"); }} />}>
          <Card>
            <Row label={berthLabel.available} value={String(m.available)} />
            <Row label={berthLabel.occupied} value={String(m.occupied)} />
            <Row label={berthLabel.reserved} value={String(m.reserved)} sub="Arriving within 7 days" />
            <Row label={berthLabel.maintenance} value={String(m.maintenance)} />
            <Txt v="caption" color={t.text3}>{m.pending} bookings waiting for approval · {tasks.length} open work orders · {overdue.length} overdue invoices</Txt>
          </Card>
        </Section>

        <Section title="Revenue">
          <Card>
            {months.map((mo, i) => <Row key={mo} label={fmtMonth(mo)} value={money(revenue[i])} sub={mo === months[months.length - 1] ? "So far, with confirmed bookings" : undefined} />)}
          </Card>
        </Section>

        <Section title="Contact">
          <Card>
            <Row label="Address" value={marina.address} />
            <Row label="Phone" value={marina.phone} />
            <Row label="Email" value={marina.email} />
            <Row label={managers.length > 1 ? "Managers" : "Manager"} value={managers.map((s) => s.name).join(", ") || "None assigned"} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button style={{ flex: 1 }} size="sm" icon={Phone} label="Call" onPress={() => Linking.openURL(`tel:${marina.phone.replace(/[^\d+]/g, "")}`)} />
              <Button style={{ flex: 1 }} size="sm" icon={Mail} label="Email" onPress={() => Linking.openURL(`mailto:${marina.email}`)} />
            </View>
          </Card>
        </Section>

        {marina.amenities.length > 0 && (
          <Section title="Amenities">
            <Txt v="bodySm" color={t.text2}>{marina.amenities.join(" · ")}</Txt>
          </Section>
        )}

        {marinaId !== marina.id && <Button variant="primary" size="lg" icon={ArrowRightLeft} label={`Switch the app to ${marina.name}`} onPress={switchTo} />}
      </Screen>
    </View>
  );
}
