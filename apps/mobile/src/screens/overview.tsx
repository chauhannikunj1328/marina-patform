// Overview for managers and admins: today's numbers, what needs attention, revenue, marinas
// and recent activity for the marina (or all marinas) chosen in the header.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CalendarCheck, CalendarClock, ChevronRight, CircleCheck, Receipt, TriangleAlert, Wrench, type LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { fmtDate, fmtDateTime, fmtMonth, fmtShort, lastMonths, money, money2, moneyShort, openEntry, pct, today } from "@marina/shared";
import { Card, EmptyState, Row, Screen, Section, Sheet, Txt } from "@/components/ui";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";

function Kpi({ label, value, sub, tone, onPress }: { label: string; value: string; sub?: string; tone?: "up" | "down"; onPress?: () => void }) {
  const { t } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexBasis: "48%", flexGrow: 1, padding: 12 }}>
      <Txt v="caption" color={t.text3}>{label}</Txt>
      <Txt v="kpi" num>{value}</Txt>
      {sub ? <Txt v="caption" num weight={tone ? "semibold" : "regular"} color={tone === "up" ? t.greenText : tone === "down" ? t.error.fg : t.text3}>{sub}</Txt> : null}
    </Card>
  );
}

function AttentionRow({ icon: IconCmp, title, sub, urgent, onPress }: { icon: ComponentType<LucideProps>; title: string; sub: string; urgent?: boolean; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: urgent ? t.status.maintenance.bg : t.surface3 }}>
        <IconCmp size={18} color={urgent ? t.status.maintenance.fg : t.text2} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="semibold">{title}</Txt>
        <Txt v="bodySm" color={t.text3} numberOfLines={1}>{sub}</Txt>
      </View>
      <ChevronRight size={20} color={t.text3} />
    </Card>
  );
}

/** Six months of revenue as simple bars; the current month is highlighted. */
function RevenueBars({ months, values }: { months: string[]; values: number[] }) {
  const { t } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <Card>
      <View accessibilityRole="image" accessibilityLabel={`Revenue by month: ${months.map((m, i) => `${fmtMonth(m)} ${money(values[i])}`).join(", ")}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 140 }}>
        {values.map((v, i) => {
          const current = i === values.length - 1;
          return (
            <View key={months[i]} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Txt v="caption" num color={current ? t.text : t.text3} style={{ fontSize: 10 }}>{moneyShort(v)}</Txt>
              <View style={{ width: "100%", height: Math.max(4, (v / max) * 96), borderRadius: 6, backgroundColor: current ? t.tealStrong : t.tealSoft }} />
              <Txt v="caption" color={current ? t.text : t.text3}>{fmtMonth(months[i])}</Txt>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default function Overview() {
  const { db, ix, user, ids, marinaId, scope } = useStore();
  const { t } = useTheme();
  const [overdueOpen, setOverdueOpen] = useState(false);
  const now = today();
  const m = ix.metrics(ids);
  const inIds = new Set(ids);
  const bookings = ix.bookingsIn(ids);
  const pending = bookings.filter((b) => b.status === "pending");
  const staffHere = db.staff.filter((s) => inIds.has(s.marinaId));
  const staffIds = new Set(staffHere.map((s) => s.id));
  const requests = db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId));
  const late = bookings.filter((b) => b.end < now && b.status === "checked-in");
  const urgent = db.tasks.filter((x) => inIds.has(x.marinaId) && x.priority === "high" && x.status !== "done");
  const overdue = db.invoices.filter((i) => i.status === "overdue" && inIds.has(ix.marinaOfInvoice(i) ?? ""));
  const overdueTotal = overdue.reduce((s, i) => s + ix.balance(i), 0);
  const clockedIn = staffHere.filter((s) => openEntry(db, s.id)).length;
  const arrivals = bookings.filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending")).length;
  const departures = bookings.filter((b) => b.end === now && b.status === "checked-in").length;
  const months = lastMonths(6, now);
  const revenue = ix.revenueByMonth(ids, months);
  const activity = db.activity.filter((a) => (a.marinaId ? inIds.has(a.marinaId) : user?.role === "admin" && marinaId === ALL)).slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const change = m.revenueChange;
  const occChange = m.occupancy - m.occupancyPrev;
  const nothing = !pending.length && !requests.length && !late.length && !urgent.length && !overdue.length;

  return (
    <Screen>
      <Txt v="bodySm" color={t.text3}>{fmtDate(now)} · {marinaId === ALL ? `${ids.length} marinas` : ix.marina(marinaId)?.name}</Txt>
      <Txt v="h1" style={{ marginBottom: 16 }}>{greeting}, {user?.name.split(" ")[0]}</Txt>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <Kpi label="Occupancy" value={pct(m.occupancy)} sub={`${m.occupied} of ${m.berths} berths · ${occChange >= 0 ? "+" : ""}${(occChange * 100).toFixed(1)} pts`} tone={occChange > 0 ? "up" : occChange < 0 ? "down" : undefined} />
        <Kpi label="Revenue this month" value={m.revenue >= 100_000 ? moneyShort(m.revenue) : money(m.revenue)} sub={m.prevRevenue ? `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}% on last month` : undefined} tone={change > 0 ? "up" : change < 0 ? "down" : undefined} />
        <Kpi label="Still to arrive · leave" value={`${arrivals} · ${departures}`} sub="Tap for today's list" onPress={() => router.navigate("/bookings")} />
        <Kpi label="On the clock" value={String(clockedIn)} sub={`of ${staffHere.length} staff`} onPress={() => router.navigate("/team")} />
      </View>

      <Section title="Needs attention">
        {nothing && <EmptyState icon={CircleCheck} title="All caught up" body="Nothing is waiting on you right now." />}
        {pending.length > 0 && <AttentionRow icon={CalendarCheck} title={`${pending.length} ${pending.length === 1 ? "booking" : "bookings"} to approve`} sub={pending.slice(0, 3).map((b) => ix.boat(b.boatId)?.name).join(", ")} onPress={() => router.navigate("/approvals")} />}
        {requests.length > 0 && <AttentionRow icon={CalendarClock} title={`${requests.length} staff ${requests.length === 1 ? "request" : "requests"}`} sub="Time off and shift swaps" onPress={() => router.navigate({ pathname: "/approvals", params: { view: "staff" } })} />}
        {late.length > 0 && <AttentionRow urgent icon={TriangleAlert} title={`${late.length} ${late.length === 1 ? "boat" : "boats"} past departure`} sub={late.slice(0, 3).map((b) => ix.boat(b.boatId)?.name).join(", ")} onPress={() => router.navigate({ pathname: "/bookings", params: { view: "in" } })} />}
        {urgent.length > 0 && <AttentionRow urgent icon={Wrench} title={`${urgent.length} urgent ${urgent.length === 1 ? "repair" : "repairs"}`} sub={urgent.slice(0, 2).map((x) => x.title).join(", ")} onPress={() => router.navigate("/tasks")} />}
        {overdue.length > 0 && <AttentionRow icon={Receipt} title={`${overdue.length} overdue ${overdue.length === 1 ? "invoice" : "invoices"}`} sub={`${money(overdueTotal)} still owed`} onPress={() => setOverdueOpen(true)} />}
      </Section>

      <Section title="Revenue" action={<Txt v="caption" color={t.text3}>Last 6 months</Txt>}>
        <RevenueBars months={months} values={revenue} />
      </Section>

      {scope.length > 1 && (
        <Section title={marinaId === ALL ? "Marinas" : "Your marinas"} count={scope.length}>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {scope.map((id, i) => {
              const mm = ix.metrics([id]);
              const marina = ix.marina(id);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${marina?.name}: ${pct(mm.occupancy)} occupied, ${money(mm.revenue)} this month`}
                  onPress={() => router.push({ pathname: "/marina", params: { id } })}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
                >
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium" numberOfLines={1}>{marina?.name}</Txt>
                    <Txt v="caption" color={t.text3}>{ix.city(marina?.cityId ?? "")?.name}{marina?.status === "inactive" ? " · inactive" : ""}</Txt>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Txt v="bodySm" num weight="semibold">{pct(mm.occupancy)}</Txt>
                    <Txt v="caption" num color={t.text3}>{moneyShort(mm.revenue)}</Txt>
                  </View>
                  <ChevronRight size={18} color={t.text3} />
                </Pressable>
              );
            })}
          </View>
        </Section>
      )}

      <Section title="Recent activity">
        {activity.length === 0 ? (
          <Txt v="bodySm" color={t.text3}>No changes yet today.</Txt>
        ) : (
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface }}>
            {activity.map((a, i) => (
              <View key={a.id} style={{ padding: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                <Txt v="bodySm">{a.text}</Txt>
                <Txt v="caption" color={t.text3}>{a.by} · {fmtDateTime(a.at)}{marinaId === ALL && a.marinaId ? ` · ${ix.marina(a.marinaId)?.name}` : ""}</Txt>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Sheet open={overdueOpen} onClose={() => setOverdueOpen(false)} title="Overdue invoices" subtitle={`${money2(overdueTotal)} still owed`}>
        {overdue.map((i) => {
          const bk = ix.booking(i.bookingId);
          return (
            <Row
              key={i.id}
              label={`${i.number} · due ${fmtShort(i.due)}`}
              value={money2(ix.balance(i))}
              sub={bk ? `${ix.boat(bk.boatId)?.name} · ${ix.ownerOfBooking(bk)?.name}${marinaId === ALL ? ` · ${ix.marinaOfBerth(bk.berthId)?.name}` : ""}` : undefined}
            />
          );
        })}
        <Txt v="caption" color={t.text3}>Send reminders from Billing in the web app.</Txt>
      </Sheet>
    </Screen>
  );
}
