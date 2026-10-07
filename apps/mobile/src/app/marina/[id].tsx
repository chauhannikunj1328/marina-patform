// One marina at a glance (managers and admins): today's numbers, people, repairs, revenue and contacts.
import { useState } from "react";
import { Linking, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Ban, CircleCheck, Mail, Phone } from "lucide-react-native";
import { lastMonths, moneyShort, openEntry, pct, planFor, today } from "@marina/shared";
import { Kpi, MiniBars } from "@/components/office";
import { Badge, Button, Row, Screen, Section, Sheet, StackHeader, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function MarinaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, ix, user, scope, setMarinaId, update, toast } = useStore();
  const { t } = useTheme();
  const [confirming, setConfirming] = useState(false);
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
  const closed = marina.status === "inactive";
  const upcoming = ix.bookingsIn([id]).filter((b) => b.start > today() && (b.status === "confirmed" || b.status === "pending")).length;
  const toggle = () => {
    const before = db;
    update((d) => ({ ...d, marinas: d.marinas.map((x) => (x.id === id ? { ...x, status: closed ? "active" : "inactive" } : x)) }), { text: `${marina.name} ${closed ? "reopened" : "closed"} to new bookings`, to: `/marinas/${id}`, marinaId: id });
    toast(`${marina.name} ${closed ? "is open for bookings again" : "is closed to new bookings"}`, before);
    setConfirming(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={marina.name} subtitle={`${marina.address}, ${ix.cityOfMarina(id)?.name}`} right={closed ? <View style={{ paddingRight: 8 }}><Badge tone="maintenance" label="Closed" /></View> : undefined} />
      <Screen>
        {closed && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.status.maintenance.bg, borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Ban size={18} color={t.status.maintenance.fg} />
            <Txt v="bodySm" color={t.status.maintenance.fg} style={{ flex: 1 }}>Closed to new bookings. Boats already booked can still arrive and stay.</Txt>
          </View>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <Kpi label="Occupancy today" value={pct(m.occupancy)} sub={`${m.occupied} of ${m.berths} berths`} />
          <Kpi label="Revenue this month" value={moneyShort(m.revenue)} sub={`${m.revenueChange >= 0 ? "+" : ""}${(m.revenueChange * 100).toFixed(1)}% vs last month`} />
          <Kpi label="Arriving · leaving today" value={`${m.arrivalsToday} · ${m.departuresToday}`} sub={`${m.checkedIn} boats in now`} />
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
        {user.role === "admin" && (
          <Button size="lg" icon={closed ? CircleCheck : Ban} label={closed ? "Reopen for bookings" : "Close to new bookings"} onPress={() => setConfirming(true)} style={{ marginTop: 8 }} />
        )}
        {confirming && (
          <Sheet open onClose={() => setConfirming(false)} title={closed ? `Reopen ${marina.name}?` : `Close ${marina.name}?`}
            footer={<Button variant={closed ? "primary" : "danger"} size="lg" label={closed ? "Reopen for bookings" : "Close to new bookings"} onPress={toggle} />}>
            <Txt v="bodySm" color={t.text2}>
              {closed ? "Staff and managers can take new bookings here again." : `No new bookings can be made here, on the phone or the web. The ${upcoming} upcoming ${upcoming === 1 ? "booking stays" : "bookings stay"} as they are, and boats in the marina aren't affected.`}
            </Txt>
          </Sheet>
        )}
      </Screen>
    </View>
  );
}
