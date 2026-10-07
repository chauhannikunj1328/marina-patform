// Invoices (anyone with billing access): overdue, due and recently paid; send reminders and record payments.
import { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { Banknote, Receipt, Send } from "lucide-react-native";
import { addDays, fmtShort, money2, today, withMessage, type Invoice } from "@marina/shared";
import { PaymentSheet } from "@/components/sheets";
import { Badge, Button, Card, EmptyState, Screen, Segmented, Sheet, StackHeader, Txt } from "@/components/ui";
import { useViewParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export default function Invoices() {
  const tr = useTr();
  const { db, ix, ids, user, can, update, toast } = useStore();
  const { t } = useTheme();
  const [view, setView] = useViewParam(["overdue", "due", "paid"] as const, "overdue");
  const [paying, setPaying] = useState<Invoice | undefined>();
  const [confirmAll, setConfirmAll] = useState(false);
  if (!user) return <Redirect href="/login" />;
  if (can("billing") === "none") return <Redirect href="/" />;
  const canEdit = can("billing") !== "view";
  const now = today();
  const mine = db.invoices.filter((i) => ids.includes(ix.marinaOfInvoice(i) ?? ""));
  const lists = {
    overdue: mine.filter((i) => i.status === "overdue").sort((a, b) => a.due.localeCompare(b.due)),
    due: mine.filter((i) => i.status === "due").sort((a, b) => a.due.localeCompare(b.due)),
    paid: mine.filter((i) => i.status === "paid" && (i.paidAt ?? "") >= addDays(now, -30)).sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? "")),
  };
  const rows = lists[view].slice(0, 60);
  const total = (l: Invoice[]) => l.reduce((s, i) => s + (view === "paid" ? i.amount : ix.balance(i)), 0);
  const remindedToday = (i: Invoice) => i.reminders.includes(now);

  // Reminders are recorded on the invoice and in Messages, as in the web app. Emails go out once there's a server.
  const remind = (list: Invoice[]) => {
    const todo = list.filter((i) => !remindedToday(i));
    if (!todo.length) return;
    update(
      (d) =>
        todo.reduce((acc, inv) => {
          const bk = ix.booking(inv.bookingId);
          const owner = bk && ix.ownerOfBooking(bk);
          const marked = { ...acc, invoices: acc.invoices.map((i) => (i.id === inv.id ? { ...i, reminders: [...i.reminders, now] } : i)) };
          return owner ? withMessage(marked, { to: owner.email, subject: `Payment reminder for ${inv.number}`, kind: "reminder", ref: inv.id }) : marked;
        }, d),
      { text: todo.length === 1 ? `Payment reminder for ${todo[0].number} recorded` : `${todo.length} payment reminders recorded`, to: "/billing?status=overdue", marinaId: ids.length === 1 ? ids[0] : undefined },
    );
    toast(todo.length === 1 ? tr("Reminder recorded for {name}", { name: ix.ownerOfBooking(ix.booking(todo[0].bookingId)!)?.name }) : tr("{n} reminders recorded", { n: todo.length }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Invoices")} subtitle={tr("{amount} overdue · {amount2} due", { amount: money2(total(lists.overdue)), amount2: money2(lists.due.reduce((s, i) => s + ix.balance(i), 0)) })} />
      <Screen>
        <Segmented value={view} onChange={setView} items={[{ value: "overdue", label: tr("Overdue"), count: lists.overdue.length }, { value: "due", label: tr("Due"), count: lists.due.length }, { value: "paid", label: tr("Paid") }]} />
        {view === "overdue" && canEdit && lists.overdue.some((i) => !remindedToday(i)) && (
          <Button icon={Send} label={tr("Remind all {n}", { n: lists.overdue.filter((i) => !remindedToday(i)).length })} onPress={() => setConfirmAll(true)} style={{ marginBottom: 12 }} />
        )}
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title={view === "overdue" ? tr("Nothing overdue") : view === "due" ? tr("No unpaid invoices") : tr("No payments in the last 30 days")} />
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map((i) => {
              const bk = ix.booking(i.bookingId);
              const owner = bk && ix.ownerOfBooking(bk);
              const owed = ix.balance(i);
              return (
                <Card key={i.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" numberOfLines={1}>{owner?.name}</Txt>
                      <Txt v="caption" color={t.text3} numberOfLines={1}>{i.number} · {bk && ix.boat(bk.boatId)?.name}{ids.length > 1 && bk ? ` · ${ix.marinaOfBerth(bk.berthId)?.name}` : ""}</Txt>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt num weight="semibold">{money2(view === "paid" ? i.amount : owed)}</Txt>
                      {view !== "paid" && ix.paidSoFar(i) > 0 && <Txt v="caption" num color={t.text3}>{tr("of")} {money2(i.amount)}</Txt>}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {i.status === "overdue" ? <Badge tone="cancelled" label={tr("Due {date}", { date: fmtShort(i.due) })} /> : i.status === "paid" ? <Badge tone="success" label={tr("Paid {date}", { date: fmtShort(i.paidAt ?? i.due) })} /> : <Badge tone="pending" label={tr("Due {date}", { date: fmtShort(i.due) })} />}
                    {i.reminders.length > 0 && <Txt v="caption" color={t.text3}>{tn(i.reminders.length, "{n} reminder, last {date}", "{n} reminders, last {date}", { date: fmtShort(i.reminders[i.reminders.length - 1]) })}</Txt>}
                  </View>
                  {canEdit && owed > 0 && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Button style={{ flex: 1 }} size="sm" icon={Send} label={remindedToday(i) ? tr("Reminded") : tr("Remind")} disabled={remindedToday(i)} onPress={() => remind([i])} />
                      <Button style={{ flex: 1 }} size="sm" variant="primary" icon={Banknote} label={tr("Payment")} onPress={() => setPaying(i)} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      {paying && <PaymentSheet invoice={paying} onClose={() => setPaying(undefined)} />}
      {confirmAll && (
        <Sheet open onClose={() => setConfirmAll(false)} title={tr("Remind {n} boat owners?", { n: lists.overdue.filter((i) => !remindedToday(i)).length })} subtitle={tr("{amount} is overdue.", { amount: money2(total(lists.overdue)) })}
          footer={<Button variant="primary" size="lg" icon={Send} label={tr("Record reminders")} onPress={() => { remind(lists.overdue); setConfirmAll(false); }} />}>
          <Txt v="bodySm" color={t.text2}>{tr("Each overdue invoice gets today's reminder date, and the reminder is added to Messages in the web app. Owners already reminded today are skipped.")}</Txt>
        </Sheet>
      )}
    </View>
  );
}
