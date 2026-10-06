// One marina at a glance (managers and admins): today's numbers, people, repairs, revenue and contacts.
import { Linking, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Mail, Phone } from "lucide-react-native";
import { lastMonths, money, openEntry, pct, planFor, today } from "@marina/shared";
import { Kpi, MiniBars } from "@/components/office";
import { Button, Row, Screen, Section, StackHeader, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function MarinaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, ix, user, scope, setMarinaId } = useStore();
  const { t } = useTheme();
  if (!user) return <Redirect href="/login" />;
  const marina = ix.marina(id);
  if (!marina || !scope.includes(id)) return <Redirect href="/" />;
  const m = ix.metrics([id]);
  const staff = db.staff.filter((s) => s.marinaId === id);
  const manager = staff.find((s) => s.position === "Marina Manager");
  const working = staff.filter((s) => planFor(s, today(), db.requests).working).length;
  const onClock = staff.filter((s) => openEntry(db, s.id)).length;
  const repairs = db.tasks.filter((x) => x.marinaId === id && x.status !== "done");
  const months = lastMonths(6);
  const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={marina.name} subtitle={`${marina.address}, ${ix.cityOfMarina(id)?.name}`} />
      <Screen>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <Kpi label="Occupancy today" value={pct(m.occupancy)} sub={`${m.occupied} of ${m.berths} berths`} />
          <Kpi label="Revenue this month" value={money(m.revenue)} sub={`${m.revenueChange >= 0 ? "+" : ""}${(m.revenueChange * 100).toFixed(1)}% vs last month`} />
          <Kpi label="Today" value={`${m.arrivalsToday} in · ${m.departuresToday} out`} sub={`${m.checkedIn} boats in`} />
          <Kpi label="Waiting for approval" value={String(m.pending)} sub="bookings" />
        </View>

        <Section title="Berths">
          <View>
            <Row label="Available" value={String(m.available)} />
            <Row label="Occupied" value={String(m.occupied)} />
            <Row label="Reserved" value={String(m.reserved)} />
            <Row label="Out of service" value={String(m.maintenance)} sub={repairs.length ? `${repairs.length} open work orders, ${repairs.filter((x) => x.priority === "high").length} urgent` : undefined} />
          </View>
        </Section>

        <Section title="Revenue" action={<Txt v="caption" color={t.text3}>Last 6 months</Txt>}>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, backgroundColor: t.surface }}>
            <MiniBars months={months} values={ix.revenueByMonth([id], months)} />
          </View>
        </Section>

        <Section title="People">
          <View>
            <Row label="Staff" value={`${staff.length}`} sub={`${working} working today · ${onClock} on the clock`} />
            {manager && <Row label="Manager" value={manager.name} sub={manager.phone} />}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button style={{ flex: 1 }} icon={Phone} label="Call marina" onPress={() => Linking.openURL(tel(marina.phone))} />
            <Button style={{ flex: 1 }} icon={Mail} label="Email" onPress={() => Linking.openURL(`mailto:${marina.email}`)} />
          </View>
          {manager && manager.phone && <Button icon={Phone} label={`Call ${manager.name.split(" ")[0]} (manager)`} onPress={() => Linking.openURL(tel(manager.phone))} />}
        </Section>

        <Button variant="primary" size="lg" icon={ArrowRight} label="Show this marina in the app" onPress={() => { setMarinaId(id); router.navigate("/"); }} />
      </Screen>
    </View>
  );
}
