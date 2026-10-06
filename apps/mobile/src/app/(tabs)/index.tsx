// Today: shift, arrivals and departures with one-tap check in / check out, urgent repairs.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, LogIn, LogOut, Sailboat, Wrench } from "lucide-react-native";
import { fmtDate, fromISO, relative, SHIFT_HOURS, today, type Booking } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Screen, Section, Txt } from "@/components/ui";
import { BookingSheet, useBookingStatus } from "@/components/sheets";
import { useMe, useStore } from "@/store";
import { useTheme } from "@/theme";

function BookingRow({ bk, onOpen, action }: { bk: Booking; onOpen: () => void; action?: React.ReactNode }) {
  const { ix } = useStore();
  const { t } = useTheme();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.surface3, alignItems: "center", justifyContent: "center" }}>
          <Sailboat size={20} color={t.text2} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" numberOfLines={1}>{ix.boat(bk.boatId)?.name}</Txt>
          <Txt v="bodySm" color={t.text3} numberOfLines={1}>Berth {ix.berth(bk.berthId)?.code} · {ix.ownerOfBooking(bk)?.name}</Txt>
        </View>
      </Pressable>
      {action ?? <ChevronRight size={20} color={t.text3} />}
    </Card>
  );
}

export default function Today() {
  const { db, ix, user, can, marinaId } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const setStatus = useBookingStatus();
  const [open, setOpen] = useState<Booking | undefined>();
  const now = today();
  const all = ix.bookingsIn([marinaId]);
  const arrivals = all.filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending" || b.status === "checked-in"));
  const departures = all.filter((b) => b.end === now && b.status === "checked-in");
  const late = all.filter((b) => b.end < now && b.status === "checked-in");
  const myTasks = db.tasks.filter((x) => x.assigneeId === me?.id && x.status !== "done");
  const urgent = db.tasks.filter((x) => x.marinaId === marinaId && x.priority === "high" && x.status !== "done");
  const working = me && me.status === "active" && !me.daysOff.includes(fromISO(now).getDay());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canBook = can("bookings") !== "view";
  const m = ix.metrics([marinaId]);

  return (
    <Screen>
      <Txt v="bodySm" color={t.text3}>{fmtDate(now)}</Txt>
      <Txt v="h1">{greeting}, {user?.name.split(" ")[0]}</Txt>

      <View style={{ marginTop: 16, marginBottom: 24, borderRadius: 16, padding: 16, backgroundColor: working ? t.accentSoft : t.surface, borderWidth: working ? 0 : 1, borderColor: t.border }}>
        {me ? (
          working ? (
            <>
              <Txt><Txt weight="semibold">{me.shift} shift</Txt> · {SHIFT_HOURS[me.shift]}</Txt>
              <Txt v="bodySm" color={t.text2}>{ix.marina(me.marinaId)?.name} · {me.position}</Txt>
            </>
          ) : (
            <>
              <Txt weight="semibold">{me.status === "on-leave" ? "You're on leave" : "Day off today"}</Txt>
              <Txt v="bodySm" color={t.text3}>Your week is on the Me tab.</Txt>
            </>
          )
        ) : (
          <Txt v="bodySm" color={t.text3}>No shift schedule linked to your account.</Txt>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        {[
          { label: "Arriving", value: arrivals.filter((b) => b.status !== "checked-in").length },
          { label: "Leaving", value: departures.length + late.length },
          { label: "My tasks", value: myTasks.length, go: () => router.navigate("/(tabs)/tasks") },
        ].map((s) => (
          <Card key={s.label} onPress={s.go} style={{ flex: 1, alignItems: "center", padding: 12 }}>
            <Txt v="kpi" num>{s.value}</Txt>
            <Txt v="caption" color={t.text3}>{s.label}</Txt>
          </Card>
        ))}
      </View>

      {late.length > 0 && (
        <Section title="Past departure date" count={late.length}>
          {late.map((b) => (
            <BookingRow key={b.id} bk={b} onOpen={() => setOpen(b)} action={canBook ? <Button size="sm" label="Check out" onPress={() => setStatus(b, "completed")} /> : undefined} />
          ))}
        </Section>
      )}

      <Section title="Arriving today" count={arrivals.length}>
        {arrivals.length === 0 ? (
          <EmptyState icon={LogIn} title="No arrivals today" />
        ) : (
          arrivals.map((b) => (
            <BookingRow
              key={b.id}
              bk={b}
              onOpen={() => setOpen(b)}
              action={
                b.status === "checked-in" ? <Badge tone="success" label="In" />
                : b.status === "pending" ? <Badge tone="pending" label="Pending" />
                : canBook ? <Button size="sm" variant="primary" label="Check in" onPress={() => setStatus(b, "checked-in")} /> : undefined
              }
            />
          ))
        )}
      </Section>

      <Section title="Leaving today" count={departures.length}>
        {departures.length === 0 ? (
          <EmptyState icon={LogOut} title="No departures left today" />
        ) : (
          departures.map((b) => (
            <BookingRow key={b.id} bk={b} onOpen={() => setOpen(b)} action={canBook ? <Button size="sm" label="Check out" onPress={() => setStatus(b, "completed")} /> : undefined} />
          ))
        )}
      </Section>

      {urgent.length > 0 && (
        <Section title="Urgent repairs" count={urgent.length}>
          {urgent.slice(0, 3).map((x) => (
            <Card key={x.id} onPress={() => router.navigate({ pathname: "/(tabs)/tasks", params: { open: x.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.status.maintenance.bg, alignItems: "center", justifyContent: "center" }}>
                <Wrench size={20} color={t.status.maintenance.fg} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold" numberOfLines={1}>{x.title}</Txt>
                <Txt v="bodySm" color={t.text3}>{x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"} · due {relative(x.due).toLowerCase()}</Txt>
              </View>
              <ChevronRight size={20} color={t.text3} />
            </Card>
          ))}
        </Section>
      )}

      <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{m.occupied} of {m.berths} berths occupied · {m.available} free</Txt>
      {open && <BookingSheet booking={open} onClose={() => setOpen(undefined)} />}
    </Screen>
  );
}
