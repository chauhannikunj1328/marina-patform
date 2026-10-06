// Team for managers and admins: who's working today, hours this week and messages with staff.
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, Clock, Mail, MessageSquare, MessagesSquare, Phone, Users } from "lucide-react-native";
import {
  addDays, DAYS, fmtDuration, fmtShort, fmtTime, fromISO, localDay, minutesWorked, openEntry, planFor, SHIFT_HOURS, today, type Staff,
} from "@marina/shared";
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Row, Screen, Section, Segmented, Sheet, Txt } from "@/components/ui";
import { useNow } from "@/lib/clock";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";

type View3 = "today" | "hours" | "messages";

function PersonRow({ s, right, sub, onPress }: { s: Staff; right?: React.ReactNode; sub: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
      <Avatar name={s.name} size={40} />
      <View style={{ flex: 1 }}>
        <Txt weight="semibold" numberOfLines={1}>{s.name}</Txt>
        <Txt v="bodySm" color={t.text3} numberOfLines={1}>{sub}</Txt>
      </View>
      {right}
    </Card>
  );
}

function PersonSheet({ s, onClose }: { s: Staff; onClose: () => void }) {
  const { db, ix } = useStore();
  const { t } = useTheme();
  const now = useNow();
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const entry = openEntry(db, s.id);
  const worked = minutesWorked(db.timeEntries, s.id, start, addDays(start, 7), now);
  const message = () => {
    onClose();
    router.push({ pathname: "/chat", params: { staff: s.id } });
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={s.name}
      subtitle={`${s.position} · ${ix.marina(s.marinaId)?.name}`}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} icon={Phone} label="Call" disabled={!s.phone} onPress={() => Linking.openURL(`tel:${s.phone.replace(/[^\d+]/g, "")}`)} />
          <Button style={{ flex: 1 }} icon={Mail} label="Email" onPress={() => Linking.openURL(`mailto:${s.email}`)} />
          {s.position !== "Marina Manager" && <Button style={{ flex: 1 }} variant="primary" icon={MessageSquare} label="Message" onPress={message} />}
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {entry ? <Badge tone="success" icon={Clock} label={`On the clock since ${fmtTime(entry.start)}`} /> : <Badge tone="neutral" label="Not clocked in" />}
        {s.status === "on-leave" && <Badge tone="pending" label="On leave" />}
      </View>
      <Txt v="label" style={{ marginBottom: 8 }}>This week</Txt>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
        {week.map((d, i) => {
          const plan = planFor(s, d, db.requests);
          const tag = plan.working ? (plan.covering ? "Cover" : "Work") : plan.why === "leave" ? "Leave" : plan.why === "swapped" ? "Swap" : "Off";
          const isToday = d === today();
          return (
            <View key={d} accessibilityLabel={`${DAYS[i]}: ${tag}`} style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 10, borderWidth: isToday ? 2 : 1, borderColor: isToday ? t.primary : t.border, backgroundColor: plan.working ? t.tealStrong : t.surface }}>
              <Txt v="label" color={plan.working ? t.onTealStrong : t.text3}>{DAYS[i]}</Txt>
              <Txt v="caption" color={plan.working ? t.onTealStrong : t.text3} style={{ fontSize: 10 }}>{tag}</Txt>
            </View>
          );
        })}
      </View>
      <Row label="Shift" value={`${s.shift} · ${SHIFT_HOURS[s.shift]}`} />
      <Row label="Worked this week" value={fmtDuration(worked)} />
      <Row label="Department" value={s.department} />
      <Row label="Phone" value={s.phone || "Not added"} />
      <Row label="Email" value={s.email} />
      <Row label="Started" value={fmtShort(s.hired)} sub={s.hired.slice(0, 4)} />
    </Sheet>
  );
}

export default function Team() {
  const { db, ix, ids, marinaId } = useStore();
  const { t } = useTheme();
  const nowMs = useNow();
  const params = useLocalSearchParams<{ view?: string }>();
  const fromParam = (v?: string): View3 | undefined => (v === "today" || v === "hours" || v === "messages" ? v : undefined);
  const [view, setView] = useState<View3>(fromParam(params.view) ?? "today");
  const [seenParam, setSeenParam] = useState(params.view);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    const v = fromParam(params.view);
    if (v) setView(v);
  }
  const [person, setPerson] = useState<Staff>();
  const [weekOffset, setWeekOffset] = useState(0);
  const now = today();
  const inIds = new Set(ids);
  const staff = db.staff.filter((s) => inIds.has(s.marinaId)).sort((a, b) => a.name.localeCompare(b.name));
  const where = (s: Staff) => `${s.position}${marinaId === ALL ? ` · ${ix.marina(s.marinaId)?.name}` : ""}`;

  // Today
  const onClock = staff.filter((s) => openEntry(db, s.id));
  const scheduled = staff.filter((s) => !openEntry(db, s.id) && planFor(s, now, db.requests).working);
  const off = staff.filter((s) => !openEntry(db, s.id) && !planFor(s, now, db.requests).working);

  // Hours
  const weekStart = addDays(addDays(now, -fromISO(now).getDay()), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  const hours = staff.map((s) => ({ s, mins: minutesWorked(db.timeEntries, s.id, weekStart, weekEnd, nowMs) })).filter((x) => x.mins > 0).sort((a, b) => b.mins - a.mins);
  const total = hours.reduce((sum, x) => sum + x.mins, 0);

  // Messages
  const threads = staff
    .map((s) => ({ s, msgs: db.chat.filter((m) => m.staffId === s.id) }))
    .filter((x) => x.msgs.length)
    .sort((a, b) => b.msgs[b.msgs.length - 1].at.localeCompare(a.msgs[a.msgs.length - 1].at));
  const unreadTotal = threads.reduce((sum, x) => sum + x.msgs.filter((m) => m.fromStaff && !m.read).length, 0);
  const [picking, setPicking] = useState(false);

  return (
    <Screen title="Team" right={view === "messages" ? <Button size="sm" variant="primary" icon={MessageSquare} label="New" onPress={() => setPicking(true)} /> : undefined}>
      <Segmented
        value={view}
        onChange={setView}
        items={[
          { value: "today", label: "Today", count: onClock.length + scheduled.length },
          { value: "hours", label: "Hours" },
          { value: "messages", label: "Messages", count: unreadTotal || undefined },
        ]}
      />

      {view === "today" && (
        <>
          {staff.length === 0 && <EmptyState icon={Users} title="No staff at this marina" body="Add staff from the Staff page in the web app." />}
          {onClock.length > 0 && (
            <Section title="On the clock" count={onClock.length}>
              {onClock.map((s) => {
                const e = openEntry(db, s.id)!;
                return <PersonRow key={s.id} s={s} sub={where(s)} onPress={() => setPerson(s)} right={<View style={{ alignItems: "flex-end" }}><Txt v="bodySm" num weight="semibold">{fmtDuration((nowMs - Date.parse(e.start)) / 60_000)}</Txt><Txt v="caption" num color={t.text3}>since {fmtTime(e.start)}</Txt></View>} />;
              })}
            </Section>
          )}
          {scheduled.length > 0 && (
            <Section title="Working today, not clocked in" count={scheduled.length}>
              {scheduled.map((s) => <PersonRow key={s.id} s={s} sub={`${where(s)} · ${SHIFT_HOURS[s.shift]}`} onPress={() => setPerson(s)} right={<ChevronRight size={20} color={t.text3} />} />)}
            </Section>
          )}
          {off.length > 0 && (
            <Section title="Off today" count={off.length}>
              {off.map((s) => {
                const plan = planFor(s, now, db.requests);
                const why = !plan.working && plan.why === "leave" ? "On leave" : !plan.working && plan.why === "swapped" ? "Swapped shift" : "Day off";
                return <PersonRow key={s.id} s={s} sub={where(s)} onPress={() => setPerson(s)} right={<Badge tone={why === "Day off" ? "neutral" : "pending"} label={why} />} />;
              })}
            </Section>
          )}
        </>
      )}

      {view === "hours" && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <IconButton icon={ChevronLeft} label="Previous week" onPress={() => setWeekOffset(weekOffset - 1)} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Txt weight="semibold">Week of {fmtShort(weekStart)}</Txt>
              <Txt v="caption" num color={t.text3}>{fmtDuration(total)} in total</Txt>
            </View>
            {weekOffset < 0 ? <IconButton icon={ChevronRight} label="Next week" onPress={() => setWeekOffset(weekOffset + 1)} /> : <View style={{ width: 44 }} />}
          </View>
          {hours.length === 0 ? (
            <EmptyState icon={Clock} title="No hours this week" body="Staff clock in and out from the app." />
          ) : (
            <View style={{ gap: 8 }}>
              {hours.map(({ s, mins }) => {
                const days = new Set(db.timeEntries.filter((e) => e.staffId === s.id && localDay(e.start) >= weekStart && localDay(e.start) < weekEnd).map((e) => localDay(e.start))).size;
                return <PersonRow key={s.id} s={s} sub={`${where(s)} · ${days} ${days === 1 ? "day" : "days"}`} onPress={() => setPerson(s)} right={<Txt num weight="semibold">{fmtDuration(mins)}</Txt>} />;
              })}
            </View>
          )}
        </>
      )}

      {view === "messages" &&
        (threads.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No conversations yet" body="Messages staff send from the app show up here." />
        ) : (
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {threads.map(({ s, msgs }, i) => {
              const unread = msgs.filter((m) => m.fromStaff && !m.read).length;
              const last = msgs[msgs.length - 1];
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}${unread ? `, ${unread} unread` : ""}. ${last.text}`}
                  onPress={() => router.push({ pathname: "/chat", params: { staff: s.id } })}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
                >
                  <Avatar name={s.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Txt weight={unread ? "semibold" : "medium"} numberOfLines={1} style={{ flex: 1 }}>{s.name}</Txt>
                      <Txt v="caption" num color={t.text3}>{localDay(last.at) === now ? fmtTime(last.at) : fmtShort(localDay(last.at))}</Txt>
                    </View>
                    <Txt v="bodySm" color={unread ? t.text : t.text3} numberOfLines={1}>{last.fromStaff ? "" : "You: "}{last.text}</Txt>
                  </View>
                  {unread > 0 && (
                    <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: t.green, alignItems: "center", justifyContent: "center" }}>
                      <Txt v="caption" num weight="semibold" color="#FFFFFF">{unread}</Txt>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

      <Sheet open={picking} onClose={() => setPicking(false)} title="Message a staff member">
        {staff.filter((s) => s.position !== "Marina Manager").map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            onPress={() => { setPicking(false); router.push({ pathname: "/chat", params: { staff: s.id } }); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            <Avatar name={s.name} size={36} />
            <View style={{ flex: 1 }}>
              <Txt weight="medium">{s.name}</Txt>
              <Txt v="caption" color={t.text3}>{where(s)}</Txt>
            </View>
          </Pressable>
        ))}
      </Sheet>
      {person && <PersonSheet s={person} onClose={() => setPerson(undefined)} />}
    </Screen>
  );
}
