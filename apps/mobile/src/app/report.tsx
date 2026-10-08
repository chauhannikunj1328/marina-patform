// Day report (managers and admins): what happened today or yesterday, and the plan for the next day.
// Share sends it as text to email, WhatsApp or any other app.
import { Share, View } from "react-native";
import { Redirect } from "expo-router";
import { Share2 } from "lucide-react-native";
import { addDays, weekday, fmtDate, fmtDuration, fromISO, localDay, minutesWorked, money2, planFor, pct, today, type PaymentMethod } from "@marina/shared";
import { gapsOn } from "@/components/schedule";
import { Button, Row, Screen, Section, Segmented, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useViewParam } from "@/lib/useOpenParam";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export default function DayReport() {
  const tr = useTr();
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
  // Totals in the reporting currency: each payment or charge is converted from its marina's currency.
  const payments = invoices.flatMap((i) => i.payments.filter((p) => p.date === day).map((p) => ({ ...p, amount: ix.invoiceToReporting(i, p.amount) })));
  const taken = payments.reduce((s, p) => s + p.amount, 0);
  const byMethod = (["Card", "Cash", "Check", "Bank transfer"] as PaymentMethod[]).map((m) => ({ m, n: payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) })).filter((x) => x.n > 0);
  const services = invoices.flatMap((i) => (i.lines ?? []).filter((l) => localDay(l.at) === day));
  const servicesTotal = invoices.reduce((sum, i) => sum + (i.lines ?? []).filter((l) => localDay(l.at) === day).reduce((s, l) => s + ix.invoiceToReporting(i, l.amount), 0), 0);
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
  const where = marinaId === ALL ? tr("{n} marinas", { n: ids.length }) : ix.marina(marinaId)?.name ?? "";
  const nextDay = `${weekday(fromISO(next).getDay())} ${fmtDate(next)}`;
  const nextLabel = which === "today" ? tr("Tomorrow, {day}", { day: nextDay }) : tr("Today, {day}", { day: nextDay });
  const methods = byMethod.map((x) => `${tr(x.m)} ${money2(x.n)}`).join(", ");

  const text = [
    tr("{where}: day report for {date}", { where, date: fmtDate(day) }),
    "",
    tr("Boats: {arrived} arrived, {left} left, {made} new bookings. {occupied} of {berths} berths occupied ({pct}).", { arrived: arrived.length, left: left.length, made: made.length, occupied, berths: berths.length, pct: pct(berths.length ? occupied / berths.length : 0) }),
    byMethod.length
      ? tr("Money: {taken} taken ({methods}), {services} in services sold.", { taken: money2(taken), methods, services: money2(servicesTotal) })
      : tr("Money: {taken} taken, {services} in services sold.", { taken: money2(taken), services: money2(servicesTotal) }),
    tr("Work: {done} work orders finished, {reported} new problems reported, {urgent} urgent still open.", { done: done.length, reported: reported.length, urgent: urgentOpen.length }),
    tr("People: {n} staff clocked in, {time} worked.", { n: clockedIn, time: fmtDuration(minutes) }),
    "",
    [
      tr("{label}: {arriving} arriving, {leaving} leaving, {scheduled} staff scheduled", { label: nextLabel, arriving: arriving.length, leaving: leaving.length, scheduled }),
      gaps ? tn(gaps, ", {n} shift gap", ", {n} shift gaps") : "",
      pending ? tr(". {n} bookings waiting for approval", { n: pending }) : "",
      ".",
    ].join(""),
  ].join("\n");

  const share = async () => {
    try {
      await Share.share({ message: text, title: tr("Day report {date}", { date: fmtDate(day) }) });
    } catch {
      toast(tr("Sharing isn't available here. Try it in the phone app."), undefined, "warning");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Day report")} subtitle={`${where} · ${fmtDate(day)}`} />
      <Screen>
        <Segmented value={which} onChange={setWhich} items={[{ value: "today", label: tr("Today so far") }, { value: "yesterday", label: tr("Yesterday") }]} />
        <Section title={tr("Boats")}>
          <View>
            <Row label={tr("Arrived")} value={String(arrived.length)} />
            <Row label={tr("Left")} value={String(left.length)} />
            <Row label={tr("New bookings")} value={String(made.length)} />
            <Row label={tr("Berths occupied")} value={`${occupied} of ${berths.length}`} sub={pct(berths.length ? occupied / berths.length : 0)} />
          </View>
        </Section>
        <Section title={tr("Money")}>
          <View>
            <Row label={tr("Taken")} value={money2(taken)} sub={tn(payments.length, "{n} payment", "{n} payments")} />
            {byMethod.map((x) => <Row key={x.m} label={tr(x.m)} value={money2(x.n)} />)}
            <Row label={tr("Services sold")} value={money2(servicesTotal)} sub={services.length ? [...new Set(services.map((l) => tr(l.label)))].join(", ") : undefined} />
          </View>
        </Section>
        <Section title={tr("Work")}>
          <View>
            <Row label={tr("Work orders finished")} value={String(done.length)} sub={done.slice(0, 3).map((x) => x.title).join(", ") || undefined} />
            <Row label={tr("New problems reported")} value={String(reported.length)} sub={reported.slice(0, 3).map((x) => x.title).join(", ") || undefined} />
            <Row label={tr("Urgent still open")} value={String(urgentOpen.length)} />
          </View>
        </Section>
        <Section title={tr("People")}>
          <View>
            <Row label={tr("Clocked in")} value={tr("{n} staff", { n: clockedIn })} />
            <Row label={tr("Hours worked")} value={fmtDuration(minutes)} />
          </View>
        </Section>
        <Section title={nextLabel}>
          <View>
            <Row label={tr("Arriving")} value={String(arriving.length)} />
            <Row label={tr("Leaving")} value={String(leaving.length)} />
            <Row label={tr("Staff scheduled")} value={String(scheduled)} sub={gaps ? tn(gaps, "{n} shift gap to cover", "{n} shift gaps to cover") : tr("Every shift covered")} />
            <Row label={tr("Waiting for approval")} value={tr("{n} bookings", { n: pending })} />
          </View>
        </Section>
        <Button variant="primary" size="lg" icon={Share2} label={tr("Share report")} onPress={share} />
        {scope.length > 1 && marinaId !== ALL && <Txt v="caption" color={t.text3} style={{ marginTop: 12, textAlign: "center" }}>{tr("Choose All marinas at the top for a combined report.")}</Txt>}
      </Screen>
    </View>
  );
}
