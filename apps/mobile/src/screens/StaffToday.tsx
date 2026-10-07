// Staff home (Today tab): shift, arrivals and departures with one-tap check in / check out, urgent repairs.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Clock, LogIn, LogOut, Sailboat, Wrench } from "lucide-react-native";
import { fmtDate, fmtDuration, fmtTime, planFor, prepChecklist, relative, SHIFT_HOURS, today, type Booking } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Screen, Section, Txt } from "@/components/ui";
import { BookingSheet, CheckInSheet, useBookingStatus } from "@/components/sheets";
import { HandoverList, HandoverSheet } from "@/components/handover";
import { PatrolLink } from "@/components/patrol";
import { useClock, useNow } from "@/lib/clock";
import { useOpenParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

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

export function StaffToday() {
  const { db, ix, user, can, marinaId } = useStore();
  const { me, entry, clockIn, clockOut } = useClock();
  const nowMs = useNow();
  const { t } = useTheme();
  const tr = useTr();
  const setStatus = useBookingStatus();
  const [openId, setOpenId] = useOpenParam();
  const open = db.bookings.find((b) => b.id === openId);
  const [checkingIn, setCheckingIn] = useState<Booking | undefined>();
  const [handover, setHandover] = useState<"clockout" | "note" | undefined>();
  const now = today();
  const all = ix.bookingsIn([marinaId]);
  const arrivals = all.filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending" || b.status === "checked-in"));
  const departures = all.filter((b) => b.end === now && b.status === "checked-in");
  const late = all.filter((b) => b.end < now && b.status === "checked-in");
  const myTasks = db.tasks.filter((x) => x.assigneeId === me?.id && x.status !== "done");
  const urgent = db.tasks.filter((x) => x.marinaId === marinaId && x.priority === "high" && x.status !== "done");
  const plan = me ? planFor(me, now, db.requests) : undefined;
  const working = plan?.working;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tr("Good morning") : hour < 18 ? tr("Good afternoon") : tr("Good evening");
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
              <Txt><Txt weight="semibold">{tr("{shift} shift", { shift: tr(me.shift) })}</Txt> · {SHIFT_HOURS[me.shift]}</Txt>
              <Txt v="bodySm" color={t.text2}>{ix.marina(me.marinaId)?.name} · {me.position}{plan?.working && plan.covering ? ` · covering for ${ix.staffMember(plan.covering.staffId)?.name}` : ""}</Txt>
            </>
          ) : (
            <>
              <Txt weight="semibold">{plan && !plan.working && plan.why === "leave" ? tr("You're on leave today") : plan && !plan.working && plan.why === "swapped" ? tr("A colleague is covering your shift") : tr("Day off today")}</Txt>
              <Txt v="bodySm" color={t.text3}>{tr("Your week is on the Me tab.")}</Txt>
            </>
          )
        ) : (
          <Txt v="bodySm" color={t.text3}>{tr("No shift schedule linked to your account.")}</Txt>
        )}
        {me && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: working ? "rgba(23,25,30,0.08)" : t.border }}>
            <Clock size={18} color={t.text2} />
            <Txt v="bodySm" color={t.text2} style={{ flex: 1 }}>
              {entry ? <>{tr("On the clock since {time}", { time: fmtTime(entry.start) })} · <Txt v="bodySm" num weight="semibold">{fmtDuration((nowMs - Date.parse(entry.start)) / 60_000)}</Txt></> : tr("Not clocked in")}
            </Txt>
            {entry ? <Button size="sm" label={tr("Clock out")} onPress={() => { clockOut(); setHandover("clockout"); }} /> : <Button size="sm" variant="primary" label={tr("Clock in")} onPress={clockIn} />}
          </View>
        )}
      </View>

      <PatrolLink />

      <Section title={tr("From the last shift")} action={<Button size="sm" label={tr("Leave a note")} onPress={() => setHandover("note")} />}>
        <HandoverList marinaIds={[marinaId]} empty={tr("No hand-over notes in the last 24 hours.")} />
      </Section>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        {[
          { label: tr("Arriving"), value: arrivals.filter((b) => b.status !== "checked-in").length },
          { label: tr("Leaving"), value: departures.length + late.length },
          { label: tr("My tasks"), value: myTasks.length, go: () => router.navigate("/(tabs)/tasks") },
        ].map((s) => (
          <Card key={s.label} onPress={s.go} style={{ flex: 1, alignItems: "center", padding: 12 }}>
            <Txt v="kpi" num>{s.value}</Txt>
            <Txt v="caption" color={t.text3}>{s.label}</Txt>
          </Card>
        ))}
      </View>

      {late.length > 0 && (
        <Section title={tr("Past departure date")} count={late.length}>
          {late.map((b) => (
            <BookingRow key={b.id} bk={b} onOpen={() => setOpenId(b.id)} action={canBook ? <Button size="sm" label={tr("Check out")} onPress={() => setStatus(b, "completed")} /> : undefined} />
          ))}
        </Section>
      )}

      <Section title={tr("Arriving today")} count={arrivals.length}>
        {arrivals.length === 0 ? (
          <EmptyState icon={LogIn} title={tr("No arrivals today")} />
        ) : (
          arrivals.map((b) => (
            <BookingRow
              key={b.id}
              bk={b}
              onOpen={() => setOpenId(b.id)}
              action={
                b.status === "checked-in" ? <Badge tone="success" label={tr("In")} />
                : b.status === "pending" ? <Badge tone="pending" label={tr("Pending")} />
                : canBook ? (
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {prepChecklist(ix.berth(b.berthId)).every((i) => b.prep?.done.includes(i.id)) && <Badge tone="success" label={tr("Berth ready")} />}
                    <Button size="sm" variant="primary" label={tr("Check in")} onPress={() => setCheckingIn(b)} />
                  </View>
                ) : undefined
              }
            />
          ))
        )}
      </Section>

      <Section title={tr("Leaving today")} count={departures.length}>
        {departures.length === 0 ? (
          <EmptyState icon={LogOut} title={tr("No departures left today")} />
        ) : (
          departures.map((b) => (
            <BookingRow key={b.id} bk={b} onOpen={() => setOpenId(b.id)} action={canBook ? <Button size="sm" label={tr("Check out")} onPress={() => setStatus(b, "completed")} /> : undefined} />
          ))
        )}
      </Section>

      {urgent.length > 0 && (
        <Section title={tr("Urgent repairs")} count={urgent.length}>
          {urgent.slice(0, 3).map((x) => (
            <Card key={x.id} onPress={() => router.navigate({ pathname: "/(tabs)/tasks", params: { open: x.id, at: String(Date.now()) } })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.status.maintenance.bg, alignItems: "center", justifyContent: "center" }}>
                <Wrench size={20} color={t.status.maintenance.fg} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold" numberOfLines={1}>{x.title}</Txt>
                <Txt v="bodySm" color={t.text3}>{x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : tr("Facility")} · due {relative(x.due).toLowerCase()}</Txt>
              </View>
              <ChevronRight size={20} color={t.text3} />
            </Card>
          ))}
        </Section>
      )}

      <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{m.occupied} of {m.berths} berths occupied · {m.available} free</Txt>
      {open && <BookingSheet booking={open} onClose={() => setOpenId(undefined)} />}
      {checkingIn && <CheckInSheet booking={checkingIn} onClose={() => setCheckingIn(undefined)} />}
      {handover && <HandoverSheet marinaId={marinaId} title={handover === "clockout" ? tr("Clocked out. Any notes?") : undefined} onClose={() => setHandover(undefined)} />}
    </Screen>
  );
}
