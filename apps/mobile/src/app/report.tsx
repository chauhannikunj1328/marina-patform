// Day report (managers and admins): what happened today or yesterday, and the plan for the next day.
// Share sends it as text to email, WhatsApp or any other app.
import { Share, View } from "react-native";
import { Redirect } from "expo-router";
import { Share2 } from "lucide-react-native";
import { addDays, DAYS, fmtDate, fmtDuration, fromISO, localDay, minutesWorked, money2, planFor, pct, today, type PaymentMethod } from "@marina/shared";
import { gapsOn } from "@/components/schedule";
import { Button, Row, Screen, Section, Segmented, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useViewParam } from "@/lib/useOpenParam";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";

export default function DayReport() {
  const { db, ix, ids, user, marinaId, scope, toast } = useStore();
  const { office } = useRole();
  const { t } = useTheme();
  const [which, setWhich] = useViewParam(["today", "yesterday"] as const, "today");
  if (!user) return <Redirect href="/login" />;
  if (!office) return <Redirect href="/" />;

  const day = which === "today" ? today() : addDays(today(), -1);
  const next = addDays(day, 1);
  const inIds = new Set(ids);
  const bookings = ix.bookingsIn(ids);
  const arrived = bookings.filter((b) => b.start === day && (b.status === "checked-in" || b.status === "completed"));
  const left = bookings.filter((b) => b.end === day && b.status === "completed");
  const made = bookings.filter((b) => b.createdAt === day && b.status !== "cancelled");
  const berths = ix.berthsIn(ids);
  const occupied = berths.filter((b) => ix.berthStatus(b, day) === "occupied").length;
  const invoices = db.invoices.filter((i) => inIds.has(ix.marinaOfInvoice(i) ?? ""));
  const payments = invoices.flatMap((i) => i.payments.filter((p) => p.date === day));
  const taken = payments.reduce((s, p) => s + p.amount, 0);
  const byMethod = (["Card", "Cash", "Check", "Bank transfer"] as PaymentMethod[]).map((m) => ({ m, n: payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) })).filter((x) => x.n > 0);
  const services = invoices.flatMap((i) => (i.lines ?? []).filter((l) => localDay(l.at) === day));
  const servicesTotal = services.reduce((sum, l) => sum + l.amount, 0);
  const tasks = db.tasks.filter((x) => inIds.has(x.marinaId));
  const done = tasks.filter((x) => x.doneAt === day);
  const reported = tasks.filter((x) => x.created === day);
  const urgentOpen = tasks.filter((x) => x.priority === "high" && x.status !== "done");
  const staff = db.staff.filter((s) => inIds.has(s.marinaId));
  const minutes = staff.reduce((sum, s) => sum + minutesWorked(db.timeEntries, s.id, day, next), 0);
  const clockedIn = staff.filter((s) => db.timeEntries.some((e) => e.staffId === s.id && localDay(e.start) === day)).length;
  // Everything due on the next day, including boats that have already arrived or left by now.
  const arriving = bookings.filter((b) => b.start === next && b.status !== "cancelled");
  const leaving = bookings.filter((b) => b.end === next && b.status !== "cancelled");
  const scheduled = staff.filter((s) => s.position !== "Marina Manager" && planFor(s, next, db.requests).working).length;
  const gaps = ids.reduce((n, m) => n + gapsOn(db.staff, m, next, db.requests).length, 0);
  const pending = bookings.filter((b) => b.status === "pending").length;
  const where = marinaId === ALL ? `${ids.length} marinas` : ix.marina(marinaId)?.name ?? "";
  const nextLabel = `${which === "today" ? "Tomorrow" : "Today"}, ${DAYS[fromISO(next).getDay()]} ${fmtDate(next)}`;

  const text = [
    `${where}: day report for ${fmtDate(day)}`,
    "",
    `Boats: ${arrived.length} arrived, ${left.length} left, ${made.length} new bookings. ${occupied} of ${berths.length} berths occupied (${pct(berths.length ? occupied / berths.length : 0)}).`,
    `Money: ${money2(taken)} taken${byMethod.length ? ` (${byMethod.map((x) => `${x.m} ${money2(x.n)}`).join(", ")})` : ""}, ${money2(servicesTotal)} in services sold.`,
    `Work: ${done.length} work orders finished, ${reported.length} new problems reported, ${urgentOpen.length} urgent still open.`,
    `People: ${clockedIn} staff clocked in, ${fmtDuration(minutes)} worked.`,
    "",
    `${nextLabel}: ${arriving.length} arriving, ${leaving.length} leaving, ${scheduled} staff scheduled${gaps ? `, ${gaps} shift ${gaps === 1 ? "gap" : "gaps"}` : ""}${pending ? `. ${pending} bookings waiting for approval` : ""}.`,
  ].join("\n");

  const share = async () => {
    try {
      await Share.share({ message: text, title: `Day report ${fmtDate(day)}` });
    } catch {
      toast("Sharing isn't available here. Try it in the phone app.", undefined, "warning");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title="Day report" subtitle={`${where} · ${fmtDate(day)}`} />
      <Screen>
        <Segmented value={which} onChange={setWhich} items={[{ value: "today", label: "Today so far" }, { value: "yesterday", label: "Yesterday" }]} />
        <Section title="Boats">
          <View>
            <Row label="Arrived" value={String(arrived.length)} />
            <Row label="Left" value={String(left.length)} />
            <Row label="New bookings" value={String(made.length)} />
            <Row label="Berths occupied" value={`${occupied} of ${berths.length}`} sub={pct(berths.length ? occupied / berths.length : 0)} />
          </View>
        </Section>
        <Section title="Money">
          <View>
            <Row label="Taken" value={money2(taken)} sub={`${payments.length} ${payments.length === 1 ? "payment" : "payments"}`} />
            {byMethod.map((x) => <Row key={x.m} label={x.m} value={money2(x.n)} />)}
            <Row label="Services sold" value={money2(servicesTotal)} sub={services.length ? [...new Set(services.map((l) => l.label))].join(", ") : undefined} />
          </View>
        </Section>
        <Section title="Work">
          <View>
            <Row label="Work orders finished" value={String(done.length)} sub={done.slice(0, 3).map((x) => x.title).join(", ") || undefined} />
            <Row label="New problems reported" value={String(reported.length)} sub={reported.slice(0, 3).map((x) => x.title).join(", ") || undefined} />
            <Row label="Urgent still open" value={String(urgentOpen.length)} />
          </View>
        </Section>
        <Section title="People">
          <View>
            <Row label="Clocked in" value={`${clockedIn} staff`} />
            <Row label="Hours worked" value={fmtDuration(minutes)} />
          </View>
        </Section>
        <Section title={nextLabel}>
          <View>
            <Row label="Arriving" value={String(arriving.length)} />
            <Row label="Leaving" value={String(leaving.length)} />
            <Row label="Staff scheduled" value={String(scheduled)} sub={gaps ? `${gaps} shift ${gaps === 1 ? "gap" : "gaps"} to cover` : "Every shift covered"} />
            <Row label="Waiting for approval" value={`${pending} bookings`} />
          </View>
        </Section>
        <Button variant="primary" size="lg" icon={Share2} label="Share report" onPress={share} />
        {scope.length > 1 && marinaId !== ALL && <Txt v="caption" color={t.text3} style={{ marginTop: 12, textAlign: "center" }}>Choose All marinas at the top for a combined report.</Txt>}
      </Screen>
    </View>
  );
}
