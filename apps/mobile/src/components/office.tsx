// Building blocks for the manager and admin screens: KPI tiles, a small bar chart, alert rows,
// marina rows, the staff detail sheet and a marina picker for sheets opened on "All marinas".
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { CalendarCog, ChevronRight, Mail, MessageSquare, Phone, TrendingDown, TrendingUp } from "lucide-react-native";
import {
  addDays, DAYS, fmtDuration, fmtMonth, fmtTime, fromISO, minutesWorked, moneyShort, openEntry, pct, planFor, SHIFT_HOURS, today, type Staff,
} from "@marina/shared";
import { useStore } from "../store";
import { flipRtl, useTheme } from "../theme";
import { Badge, Button, Card, Chip, Field, Row, Sheet, Txt, type Icon } from "./ui";
import { EditScheduleSheet } from "./schedule";
import { useTr } from "@/lib/i18n";

export function Kpi({ label, value, sub, trend, onPress }: { label: string; value: string; sub?: string; trend?: { value: string; up: boolean; good: boolean }; onPress?: () => void }) {
  const { t } = useTheme();
  const TrendIcon = trend?.up ? TrendingUp : TrendingDown;
  return (
    <Card onPress={onPress} style={{ flex: 1, minWidth: 150, padding: 14, gap: 2 }}>
      <Txt v="caption" color={t.text3} numberOfLines={1}>{label}</Txt>
      <Txt v="kpi" num>{value}</Txt>
      {trend ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TrendIcon size={14} color={trend.good ? t.greenText : t.error.fg} />
          <Txt v="caption" num weight="semibold" color={trend.good ? t.greenText : t.error.fg}>{trend.value}</Txt>
          {sub ? <Txt v="caption" color={t.text3} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Txt> : null}
        </View>
      ) : sub ? <Txt v="caption" color={t.text3} numberOfLines={1}>{sub}</Txt> : null}
    </Card>
  );
}

/** Monthly bars, latest month highlighted. Values are labelled for screen readers. */
export function MiniBars({ months, values, format = moneyShort }: { months: string[]; values: number[]; format?: (n: number) => string }) {
  const { t } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View accessibilityLabel={months.map((m, i) => `${fmtMonth(m)}: ${format(values[i])}`).join(", ")} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 140 }}>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <View key={months[i]} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Txt v="caption" num color={last ? t.text : t.text3} style={{ fontSize: 10 }}>{format(v)}</Txt>
            <View style={{ width: "100%", height: Math.max(4, (v / max) * 92), borderRadius: 6, backgroundColor: last ? t.tealStrong : t.tealSoft }} />
            <Txt v="caption" color={t.text3} style={{ fontSize: 11 }}>{fmtMonth(months[i]).slice(0, 3)}</Txt>
          </View>
        );
      })}
    </View>
  );
}

export function AlertRow({ icon: IconCmp, title, body, tone = "neutral", onPress, first }: { icon: Icon; title: string; body?: string; tone?: "neutral" | "warn" | "bad"; onPress?: () => void; first?: boolean }) {
  const { t } = useTheme();
  const c = tone === "bad" ? t.error : tone === "warn" ? t.status.maintenance : { bg: t.surface3, fg: t.text2 };
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <IconCmp size={18} color={c.fg} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{title}</Txt>
        {body ? <Txt v="bodySm" color={t.text3} numberOfLines={2}>{body}</Txt> : null}
      </View>
      {onPress && <ChevronRight style={flipRtl()} size={18} color={t.text3} />}
    </Pressable>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>{children}</View>;
}

/** One marina with today's occupancy bar and this month's revenue. */
export function MarinaRow({ id, first }: { id: string; first?: boolean }) {
  const tr = useTr();
  const { ix } = useStore();
  const { t } = useTheme();
  const m = ix.metrics([id]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr("{name}, {occupancy} occupied, {revenue} this month", { name: ix.marina(id)?.name, occupancy: pct(m.occupancy), revenue: moneyShort(m.revenue) })} onPress={() => router.push({ pathname: "/marina/[id]", params: { id } })} style={({ pressed }) => ({ padding: 14, gap: 8, borderTopWidth: first ? 0 : 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Txt weight="medium" numberOfLines={1}>{ix.marina(id)?.name}</Txt>
          <Txt v="caption" color={t.text3}>{ix.marina(id)?.status === "inactive" ? tr("Closed to bookings · ") : ""}{ix.cityOfMarina(id)?.name} · {tr("{n} berths", { n: m.berths })}{m.pending ? tr(" · {pending} pending", { pending: m.pending }) : ""}</Txt>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Txt v="bodySm" num weight="semibold">{pct(m.occupancy)}</Txt>
          <Txt v="caption" num color={t.text3}>{moneyShort(m.revenue)}</Txt>
        </View>
        <ChevronRight style={flipRtl()} size={18} color={t.text3} />
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface3, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(m.occupancy * 100)}%`, height: "100%", backgroundColor: t.tealStrong }} />
      </View>
    </Pressable>
  );
}

/** For sheets opened on "All marinas": choose which marina the new record belongs to. */
export function MarinaPicker({ value, onChange, openOnly }: { value: string; onChange: (id: string) => void; openOnly?: boolean }) {
  const tr = useTr();
  const { ix, scope: all } = useStore();
  const scope = openOnly ? all.filter((id) => ix.marina(id)?.status !== "inactive") : all;
  return (
    <Field label={tr("Marina")}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {scope.map((id) => <Chip key={id} label={ix.marina(id)?.name ?? id} on={value === id} onPress={() => onChange(id)} />)}
      </ScrollView>
    </Field>
  );
}

export function StaffSheet({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, can } = useStore();
  const [editing, setEditing] = useState(false);
  const { t } = useTheme();
  const s = db.staff.find((x) => x.id === staff.id) ?? staff;
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const entry = openEntry(db, s.id);
  const tasks = db.tasks.filter((x) => x.assigneeId === s.id && x.status !== "done");
  const tel = s.phone.replace(/[^\d+]/g, "");
  return (
    <Sheet
      open
      onClose={onClose}
      title={s.name}
      subtitle={`${tr(s.position)} · ${ix.marina(s.marinaId)?.name}`}
      footer={<Button variant="primary" size="lg" icon={MessageSquare} label={tr("Message {v}", { v: s.name.split(" ")[0] })} onPress={() => { onClose(); router.push({ pathname: "/chat", params: { staff: s.id } }); }} />}
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {entry ? <Badge tone="success" label={tr("On the clock since {start}", { start: fmtTime(entry.start) })} /> : s.status === "on-leave" ? <Badge tone="neutral" label={tr("On leave")} /> : planFor(s, today(), db.requests).working ? <Badge tone="pending" label={tr("Not clocked in")} /> : <Badge tone="outline" label={tr("Off today")} />}
      </View>
      <Row label={tr("Shift")} value={`${tr(s.shift)} · ${tr(SHIFT_HOURS[s.shift])}`} sub={s.department} />
      <Row label={tr("This week")} value={tr("{time} worked", { time: fmtDuration(minutesWorked(db.timeEntries, s.id, start, addDays(start, 7))) })} sub={week.map((d, i) => (planFor(s, d, db.requests).working ? DAYS[i] : null)).filter(Boolean).join(", ") || tr("Not working")} />
      <Row label={tr("Open work orders")} value={tasks.length ? String(tasks.length) : "None"} sub={tasks.slice(0, 3).map((x) => x.title).join(", ") || undefined} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button style={{ flex: 1 }} icon={Phone} label={tr("Call")} disabled={!tel} onPress={() => Linking.openURL(`tel:${tel}`)} />
        <Button style={{ flex: 1 }} icon={Mail} label={tr("Email")} onPress={() => Linking.openURL(`mailto:${s.email}`)} />
      </View>
      {can("staff") !== "view" && s.position !== "Marina Manager" && <Button icon={CalendarCog} label={tr("Edit schedule")} onPress={() => setEditing(true)} style={{ marginTop: 8 }} />}
      <Txt v="caption" color={t.text3} style={{ marginTop: 12 }}>{s.email} · {s.phone}</Txt>
      {editing && <EditScheduleSheet staff={s} onClose={() => setEditing(false)} />}
    </Sheet>
  );
}
