// One invoice or receipt: the stay, extras, payments and balance, and paying what's owed.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { CreditCard, Info, Receipt } from "lucide-react-native";
import { amountDue, daysBetween, decimalsOf, fmtDate, linesTotal, money2, roundMoney, ownerInvoices, today, withCardPayment } from "@marina/shared";
import { Button, Card, EmptyState, Field, Input, Sheet, StackHeader, Txt } from "@/components/ui";
import { Body, InvoiceStatus } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

function Line({ label, amount, strong, color }: { label: string; amount: string; strong?: boolean; color?: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: strong ? t.borderStrong : t.border }}>
      <Txt v={strong ? "body" : "bodySm"} weight={strong ? "semibold" : "regular"} color={color} style={{ flex: 1 }}>{label}</Txt>
      <Txt v={strong ? "body" : "bodySm"} num weight={strong ? "semibold" : "regular"} color={color}>{amount}</Txt>
    </View>
  );
}

function PaySheet({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, update, toast } = useStore();
  const inv = db.invoices.find((i) => i.id === invoiceId)!;
  const due = amountDue(inv);
  const cur = ix.curOfInvoice(inv);
  const [amount, setAmount] = useState(due.toFixed(decimalsOf(cur)));
  const [error, setError] = useState("");
  const value = roundMoney(Number(amount), cur);
  const pay = () => {
    if (!(value > 0)) return setError(tr("Enter an amount to pay."));
    if (value > due) return setError(tr("That's more than the {amount} still owed.", { amount: money2(due, cur) }));
    update((d) => withCardPayment(d, inv.id, value, { now: today(), at: new Date().toISOString() }));
    toast(value >= due ? tr("{number} is paid. Thank you!", { number: inv.number }) : tr("Payment of {amount} received", { amount: money2(value, cur) }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Pay {number}", { number: inv.number })} subtitle={tr("{amount} still owed", { amount: money2(due, cur) })}
      footer={<Button variant="primary" size="lg" icon={CreditCard} label={tr("Pay {amount}", { amount: money2(Math.max(0, value || 0), cur) })} onPress={pay} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Amount")} hint={tr("Pay the full balance or part of it.")} error={error}>
          <Input value={amount} keyboardType="decimal-pad" onChangeText={(v) => { setAmount(v.replace(/[^\d.]/g, "")); setError(""); }} invalid={!!error} />
        </Field>
        <View style={{ flexDirection: "row", gap: 8, backgroundColor: t.info.bg, borderRadius: 12, padding: 12 }}>
          <Info size={18} color={t.info.fg} />
          <Txt v="bodySm" color={t.info.fg} style={{ flex: 1 }}>{tr("Preview: no card is charged. Card payments go live when the app is connected to the payment provider.")}</Txt>
        </View>
      </View>
    </Sheet>
  );
}

export default function InvoiceScreen() {
  const { t } = useTheme();
  const tr = useTr();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, ix, owner } = useStore();
  const [paying, setPaying] = useState(false);
  if (!owner) return <Redirect href="/sign-in" />;
  const inv = ownerInvoices(db, owner.id).find((i) => i.id === id);
  if (!inv)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title={tr("Invoice")} />
        <Body><Card><EmptyState icon={Receipt} title={tr("We couldn't find that invoice")} /></Card></Body>
      </View>
    );
  const b = ix.booking(inv.bookingId);
  const marina = b ? ix.marinaOfBerth(b.berthId) : undefined;
  const due = amountDue(inv);
  const cur = ix.curOfInvoice(inv);
  const receipt = inv.status === "paid";
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={inv.number} subtitle={receipt ? tr("Receipt") : tr("Invoice")} />
      <Body>
        <Card style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt v="label">{receipt ? tr("Receipt") : tr("Invoice")}</Txt>
              <Txt v="h2">{inv.number}</Txt>
              <Txt v="caption" color={t.text3}>{tr("Issued {date}", { date: fmtDate(inv.issued) })} · {tr("due {date}", { date: fmtDate(inv.due) })}</Txt>
            </View>
            <InvoiceStatus inv={inv} />
          </View>
          <View style={{ marginTop: 12, gap: 2 }}>
            <Txt v="caption" color={t.text3}>{tr("From")}</Txt>
            <Txt v="bodySm" weight="medium">{db.settings.company}</Txt>
            <Txt v="caption" color={t.text3}>{marina?.name}</Txt>
          </View>
          {b && (
            <View style={{ marginTop: 12, gap: 2 }}>
              <Txt v="caption" color={t.text3}>{tr("Stay")}</Txt>
              <Txt v="bodySm" weight="medium">{ix.boat(b.boatId)?.name} · {tr("Berth {code}", { code: ix.berth(b.berthId)?.code })}</Txt>
              <Txt v="caption" color={t.text3}>{fmtDate(b.start)} – {fmtDate(b.end)} ({b.code})</Txt>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <Line label={b ? tr("Berth, {n} nights", { n: daysBetween(b.start, b.end) }) : tr("Berth")} amount={money2(inv.amount - linesTotal(inv), cur)} />
            {(inv.lines ?? []).map((l, i) => <Line key={i} label={`${tr(l.label)} · ${l.qty} ${tr(l.unit)} × ${money2(l.unitPrice, cur)}`} amount={money2(l.amount, cur)} />)}
            <Line strong label={tr("Total")} amount={money2(inv.amount, cur)} />
            {inv.payments.map((p, i) => <Line key={`p${i}`} label={tr("Paid {date} by {method}", { date: fmtDate(p.date), method: tr(p.method) })} amount={`−${money2(p.amount, cur)}`} color={t.success.fg} />)}
            <Line strong label={tr("Balance")} amount={money2(due, cur)} />
          </View>
          {inv.status === "void" && <Txt v="bodySm" color={t.text3}>{tr("This invoice was cancelled. Nothing is owed on it.")}</Txt>}
        </Card>
        {due > 0 && <Button variant="primary" size="lg" icon={CreditCard} label={tr("Pay {amount}", { amount: money2(due, cur) })} onPress={() => setPaying(true)} />}
      </Body>
      {paying && <PaySheet invoiceId={inv.id} onClose={() => setPaying(false)} />}
    </View>
  );
}
