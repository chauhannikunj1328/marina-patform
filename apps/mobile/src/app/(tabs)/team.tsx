// Team (managers and admins): who's working and on the clock, hours this week, and staff messages.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Clock, Megaphone, MessagesSquare, Users } from "lucide-react-native";
import { addDays, fmtDateTime, fmtDuration, fmtShort, fmtTime, localDay, patrolCheckpoints, fromISO, minutesWorked, openEntry, planFor, today, type Staff, zoneOf } from "@marina/shared";
import { List, StaffSheet } from "@/components/office";
import { BroadcastSheet, WeekSchedule } from "@/components/schedule";
import { HandoverList } from "@/components/handover";
import { PatrolSummary } from "@/components/patrol";
import { Avatar, Badge, Button, EmptyState, Screen, Section, Segmented, Txt } from "@/components/ui";
import { useViewParam } from "@/lib/useOpenParam";
import { useNow } from "@/lib/clock";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

function PersonRow({ s, right, first, onPress }: { s: Staff; right?: React.ReactNode; first?: boolean; onPress: () => void }) {
  const { db, ix, ids } = useStore();
  const tr = useTr();
  const { t } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: first ? 0 : 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <Avatar name={s.name} size={40} dot={!!openEntry(db, s.id)} />
      <View style={{ flex: 1 }}>
        <Txt weight="medium" numberOfLines={1}>{s.name}</Txt>
        <Txt v="caption" color={t.text3} numberOfLines={1}>{tr(s.position)}{ids.length > 1 ? ` · ${ix.marina(s.marinaId)?.name}` : ""}</Txt>
      </View>
      {right}
    </Pressable>
  );
}

export default function Team() {
  const tr = useTr();
  const { db, ids } = useStore();
  const { t } = useTheme();
  const now = useNow();
  const [view, setView] = useViewParam(["today", "week", "hours", "messages"] as const, "today");
  const [open, setOpen] = useState<Staff | undefined>();
  const [broadcast, setBroadcast] = useState(false);
  const staff = db.staff.filter((s) => ids.includes(s.marinaId)).sort((a, b) => a.name.localeCompare(b.name));
  const day = today();
  const clocked = staff.filter((s) => openEntry(db, s.id));
  const working = staff.filter((s) => !openEntry(db, s.id) && planFor(s, day, db.requests).working);
  const off = staff.filter((s) => !openEntry(db, s.id) && !planFor(s, day, db.requests).working);
  const patrolsToday = (db.patrols ?? []).filter((p) => ids.includes(p.marinaId) && localDay(p.startedAt, zoneOf(p.marinaId)) === day).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const covering = (s: Staff) => {
    const p = planFor(s, day, db.requests);
    return p.working && !!p.covering;
  };
  const offLabel = (s: Staff) => {
    if (s.status === "on-leave") return tr("On leave");
    const p = planFor(s, day, db.requests);
    return !p.working && p.why === "leave" ? tr("Time off") : !p.working && p.why === "swapped" ? tr("Swapped") : tr("Day off");
  };
  const start = addDays(day, -fromISO(day).getDay());
  const hours = staff.map((s) => ({ s, m: minutesWorked(db.timeEntries, s.id, start, addDays(start, 7), now) })).filter((x) => x.m > 0).sort((a, b) => b.m - a.m);
  const staffIds = new Set(staff.map((s) => s.id));
  const threads = staff
    .filter((s) => db.chat.some((m) => m.staffId === s.id))
    .map((s) => ({ s, msgs: db.chat.filter((m) => m.staffId === s.id) }))
    .sort((a, b) => b.msgs[b.msgs.length - 1].at.localeCompare(a.msgs[a.msgs.length - 1].at));
  const unread = db.chat.filter((m) => m.fromStaff && !m.read && staffIds.has(m.staffId)).length;

  return (
    <Screen title={tr("Team")}>
      <Segmented value={view} onChange={setView} items={[{ value: "today", label: tr("Today") }, { value: "week", label: tr("Week") }, { value: "hours", label: tr("Hours") }, { value: "messages", label: tr("Chat"), count: unread || undefined }]} />

      {view === "today" && (
        <>
          <Section title={tr("Hand-over notes")}>
            <HandoverList marinaIds={ids} empty={tr("No notes from staff in the last 24 hours.")} />
          </Section>
          {patrolsToday.length > 0 && (
            <Section title={tr("Patrols today")} count={patrolsToday.length}>
              {patrolsToday.map((p) => <PatrolSummary key={p.id} patrol={p} total={patrolCheckpoints(db.berths.filter((b) => b.marinaId === p.marinaId)).length} />)}
            </Section>
          )}
          <Section title={tr("On the clock")} count={clocked.length}>
            {clocked.length === 0 ? <Txt v="bodySm" color={t.text3}>{tr("Nobody has clocked in yet.")}</Txt> : (
              <List>{clocked.map((s, i) => <PersonRow key={s.id} s={s} first={i === 0} onPress={() => setOpen(s)} right={<Badge tone="success" label={tr("Since {start}", { start: fmtTime(openEntry(db, s.id)!.start, zoneOf(s.marinaId)) })} />} />)}</List>
            )}
          </Section>
          <Section title={tr("Scheduled, not clocked in")} count={working.length}>
            {working.length === 0 ? <Txt v="bodySm" color={t.text3}>{tr("Everyone scheduled today is on the clock.")}</Txt> : (
              <List>{working.map((s, i) => <PersonRow key={s.id} s={s} first={i === 0} onPress={() => setOpen(s)} right={<Txt v="caption" color={t.text3}>{covering(s) ? tr("{shift} · cover", { shift: s.shift }) : tr(s.shift)}</Txt>} />)}</List>
            )}
          </Section>
          <Section title={tr("Off today")} count={off.length}>
            {off.length > 0 && <List>{off.map((s, i) => <PersonRow key={s.id} s={s} first={i === 0} onPress={() => setOpen(s)} right={<Txt v="caption" color={t.text3}>{offLabel(s)}</Txt>} />)}</List>}
          </Section>
        </>
      )}

      {view === "week" && <WeekSchedule onPerson={setOpen} />}

      {view === "hours" && (
        hours.length === 0 ? <EmptyState icon={Clock} title={tr("No hours this week yet")} body={tr("Staff clock in and out on the Today tab of their app.")} /> : (
          <Section title={tr("Week of {date}", { date: fmtShort(start) })} action={<Txt v="bodySm" num weight="semibold">{fmtDuration(hours.reduce((a, x) => a + x.m, 0))}</Txt>}>
            <List>{hours.map(({ s, m }, i) => <PersonRow key={s.id} s={s} first={i === 0} onPress={() => setOpen(s)} right={<Txt v="bodySm" num weight="semibold">{fmtDuration(m)}</Txt>} />)}</List>
          </Section>
        )
      )}

      {view === "messages" && <Button icon={Megaphone} label={tr("Message everyone")} onPress={() => setBroadcast(true)} style={{ marginBottom: 12 }} />}
      {view === "messages" && (
        threads.length === 0 ? <EmptyState icon={MessagesSquare} title={tr("No conversations yet")} body={tr("Open a team member and tap Message to start one.")} /> : (
          <List>
            {threads.map(({ s, msgs }, i) => {
              const last = msgs[msgs.length - 1];
              const n = msgs.filter((m) => m.fromStaff && !m.read).length;
              return (
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${s.name}${n ? `, ${n} unread` : ""}`} onPress={() => router.push({ pathname: "/chat", params: { staff: s.id } })} style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
                  <Avatar name={s.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Txt weight={n ? "semibold" : "medium"} numberOfLines={1} style={{ flex: 1 }}>{s.name}</Txt>
                      <Txt v="caption" color={t.text3}>{fmtDateTime(last.at, zoneOf(s.marinaId))}</Txt>
                    </View>
                    <Txt v="bodySm" color={n ? t.text : t.text3} numberOfLines={1}>{last.fromStaff ? "" : tr("You: ")}{last.text}</Txt>
                  </View>
                  {n > 0 && <View style={{ alignSelf: "center", minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: t.green, alignItems: "center", justifyContent: "center" }}><Txt v="caption" num weight="semibold" color="#FFFFFF">{n}</Txt></View>}
                </Pressable>
              );
            })}
          </List>
        )
      )}

      {staff.length === 0 && <EmptyState icon={Users} title={tr("No staff at this marina")} />}
      {open && <StaffSheet staff={open} onClose={() => setOpen(undefined)} />}
      {broadcast && <BroadcastSheet onClose={() => setBroadcast(false)} />}
    </Screen>
  );
}
