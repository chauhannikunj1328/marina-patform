// Manager and admin home: how the marinas are doing today, what needs a decision, and where to look.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CalendarCheck, CircleAlert, Clock, FileText, Receipt, ScanLine, TriangleAlert, UsersRound, Warehouse, Wrench } from "lucide-react-native";
import { fmtDate, fmtDateTime, lastMonths, money, moneyShort, openEntry, pct, today , tx , tn } from "@marina/shared";
import { AlertRow, Kpi, List, MarinaRow, MiniBars } from "@/components/office";
import { Button, Screen, Section, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { ALL, useStore } from "@/store";
import { alignEnd, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export function Overview() {
  const tr = useTr();
  const { db, ix, ids, user, marinaId, scope, can } = useStore();
  const { isAdmin } = useRole();
  const { t } = useTheme();
  const now = today();
  const m = ix.metrics(ids);
  const inIds = new Set(ids);
  const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
  const requests = db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId)).length;
  const overdue = db.invoices.filter((i) => i.status === "overdue" && inIds.has(ix.marinaOfInvoice(i) ?? ""));
  const overdueTotal = overdue.reduce((s, i) => s + ix.balance(i), 0);
  const urgent = db.tasks.filter((x) => inIds.has(x.marinaId) && x.priority === "high" && x.status !== "done");
  const openTasks = db.tasks.filter((x) => inIds.has(x.marinaId) && x.status !== "done");
  const late = ix.bookingsIn(ids).filter((b) => b.end < now && b.status === "checked-in");
  const needBerth = ix.serviceConflicts().filter((b) => inIds.has(ix.berth(b.berthId)?.marinaId ?? ""));
  const onClock = db.staff.filter((s) => staffIds.has(s.id) && openEntry(db, s.id)).length;
  const months = lastMonths(6, now);
  const revenue = ix.revenueByMonth(ids, months);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tr("Good morning") : hour < 18 ? tr("Good afternoon") : tr("Good evening");
  const occChange = (m.occupancy - m.occupancyPrev) * 100;
  const alerts = [
    m.pending + requests > 0 && { icon: CalendarCheck, tone: "neutral" as const, title: tr("{n} waiting for approval", { n: m.pending + requests }), body: [m.pending && tn(m.pending, "{n} booking", "{n} bookings"), requests && tn(requests, "{n} staff request", "{n} staff requests")].filter(Boolean).join(" · "), go: () => router.navigate({ pathname: "/approvals", params: { view: m.pending ? "bookings" : "staff", at: String(Date.now()) } }) },
    late.length > 0 && { icon: TriangleAlert, tone: "bad" as const, title: tn(late.length, "{n} boat past departure", "{n} boats past departure"), body: tr("Still checked in after their last night."), go: () => router.navigate({ pathname: "/bookings", params: { view: "in", at: String(Date.now()) } }) },
    needBerth.length > 0 && { icon: CircleAlert, tone: "bad" as const, title: tn(needBerth.length, "{n} upcoming booking needs a new berth", "{n} upcoming bookings need a new berth"), body: tr("Their berth is out of service. Move them in the web app."), go: undefined },
    urgent.length > 0 && { icon: Wrench, tone: "warn" as const, title: tn(urgent.length, "{n} urgent repair", "{n} urgent repairs"), body: tr("{n} open work orders in total", { n: openTasks.length }), go: () => router.navigate("/tasks") },
    overdue.length > 0 && { icon: Receipt, tone: "warn" as const, title: tr("{amount} overdue", { amount: money(overdueTotal) }), body: tn(overdue.length, "{n} invoice past due. Tap to remind or record payments.", "{n} invoices past due. Tap to remind or record payments."), go: can("billing") !== "none" ? () => router.push("/invoices") : undefined },
  ].filter(Boolean) as { icon: typeof Wrench; tone: "neutral" | "warn" | "bad"; title: string; body: string; go?: () => void }[];
  const activity = db.activity.filter((a) => !a.marinaId || inIds.has(a.marinaId)).slice(0, 6);

  return (
    <Screen>
      <Txt v="bodySm" color={t.text3}>{fmtDate(now)} · {marinaId === ALL ? (isAdmin ? tr("All {n} marinas", { n: scope.length }) : tr("Your {n} marinas", { n: scope.length })) : ix.marina(marinaId)?.name}</Txt>
      <Txt v="h1" style={{ marginBottom: 16 }}>{tr("{greeting}, {name}", { greeting, name: user?.name.split(" ")[0] })}</Txt>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <Kpi label={tr("Occupancy today")} value={pct(m.occupancy)} sub={tr("{occupied} of {berths}", { occupied: m.occupied, berths: m.berths })} trend={{ value: `${occChange >= 0 ? "+" : ""}${occChange.toFixed(1)} ${tr("pts")}`, up: occChange >= 0, good: occChange >= 0 }} onPress={() => router.navigate("/berths")} />
        <Kpi label={tr("Revenue this month")} value={moneyShort(m.revenue)} sub={tr("vs last month")} trend={{ value: `${m.revenueChange >= 0 ? "+" : ""}${(m.revenueChange * 100).toFixed(1)}%`, up: m.revenueChange >= 0, good: m.revenueChange >= 0 }} />
        <Kpi label={tr("Arriving · leaving today")} value={`${m.arrivalsToday} · ${m.departuresToday}`} sub={tr("{checkedIn} boats in now", { checkedIn: m.checkedIn })} onPress={() => router.navigate({ pathname: "/bookings", params: { view: "today", at: String(Date.now()) } })} />
        <Kpi label={tr("Staff on the clock")} value={String(onClock)} sub={tr("{size} on the team", { size: staffIds.size })} onPress={() => router.navigate("/team")} />
      </View>

      <Section title={tr("Needs attention")} count={alerts.length}>
        {alerts.length === 0 ? (
          <Txt v="bodySm" color={t.text3}>{tr("Nothing needs you right now.")}</Txt>
        ) : (
          <List>{alerts.map((a, i) => <AlertRow key={a.title} first={i === 0} icon={a.icon} tone={a.tone} title={a.title} body={a.body} onPress={a.go} />)}</List>
        )}
      </Section>

      <Section title={tr("Revenue")} action={<Txt v="caption" color={t.text3}>{tr("Last 6 months")}</Txt>}>
        <Pressable accessibilityRole="button" accessibilityHint={tr("Opens revenue by county, city and marina")} onPress={() => router.push("/revenue")} style={({ pressed }) => ({ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, backgroundColor: pressed ? t.sidebar : t.surface, gap: 8 })}>
          <MiniBars months={months} values={revenue} />
          <Txt v="bodySm" weight="semibold" color={t.greenText} style={{ textAlign: alignEnd() }}>{tr("By county, city and marina ›")}</Txt>
        </Pressable>
      </Section>

      {ids.length > 1 && (
        <Section title={tr("Marinas")} count={ids.length} action={<Pressable accessibilityRole="button" onPress={() => router.push("/compare")} hitSlop={8}><Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Compare")}</Txt></Pressable>}>
          <List>{[...ids].sort((a, b) => ix.metrics([b]).occupancy - ix.metrics([a]).occupancy).map((id, i) => <MarinaRow key={id} id={id} first={i === 0} />)}</List>
        </Section>
      )}

      <Section title={tr("Quick actions")}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} icon={Warehouse} label={tr("Berths")} onPress={() => router.navigate("/berths")} />
          <Button style={{ flex: 1 }} icon={Wrench} label={tr("Repairs")} onPress={() => router.navigate("/tasks")} />
          <Button style={{ flex: 1 }} icon={ScanLine} label={tr("Scan")} onPress={() => router.push("/scan")} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} icon={UsersRound} label={tr("Owners")} onPress={() => router.push("/owners")} />
          {can("billing") !== "none" && <Button style={{ flex: 1 }} icon={Receipt} label={tr("Invoices")} onPress={() => router.push("/invoices")} />}
        </View>
        <Button icon={FileText} label={tr("Day report")} onPress={() => router.push("/report")} />
      </Section>

      <Section title={tr("Recent activity")} action={<Pressable accessibilityRole="button" onPress={() => router.push("/activity")} hitSlop={8}><Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("See all")}</Txt></Pressable>}>
        <List>
          {activity.map((a, i) => (
            <View key={a.id} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
              <Clock size={16} color={t.text3} style={{ marginTop: 3 }} />
              <View style={{ flex: 1 }}>
                <Txt v="bodySm">{tx(a.text)}</Txt>
                <Txt v="caption" color={t.text3}>{tr(a.by)} · {fmtDateTime(a.at)}</Txt>
              </View>
            </View>
          ))}
        </List>
      </Section>
    </Screen>
  );
}
