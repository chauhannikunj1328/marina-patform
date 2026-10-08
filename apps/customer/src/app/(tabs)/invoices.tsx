// The owner's invoices and receipts, newest first, with what's still owed. Tap one to see it and pay.
import { View } from "react-native";
import { router } from "expo-router";
import { Receipt } from "lucide-react-native";
import { amountDue, fmtDate, money2, ownerInvoices } from "@marina/shared";
import { Card, EmptyState, Txt } from "@/components/ui";
import { InvoiceStatus, Page, SignInPrompt } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Invoices() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner } = useStore();
  if (!owner) return <Page title={tr("Invoices")}><SignInPrompt icon={Receipt} title={tr("Pay invoices from your phone")} body={tr("Sign in to see what you owe, pay in full or in part, and keep your receipts.")} /></Page>;
  const invoices = ownerInvoices(db, owner.id);
  const open = invoices.filter((i) => amountDue(i) > 0);
  return (
    <Page title={tr("Invoices")}>
      <Txt color={t.text2} style={{ marginTop: -8 }}>{open.length ? tr("{amount} to pay across your open invoices.", { amount: money2(open.reduce((s, i) => s + amountDue(i), 0)) }) : tr("You're all paid up.")}</Txt>
      {invoices.length === 0 ? (
        <Card><EmptyState icon={Receipt} title={tr("No invoices yet")} body={tr("The marina sends an invoice once it confirms a booking.")} /></Card>
      ) : invoices.map((inv) => {
        const b = ix.booking(inv.bookingId);
        return (
          <Card key={inv.id} onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: inv.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="medium">{inv.number} <Txt v="bodySm" color={t.text3}>· {b && ix.marinaOfBerth(b.berthId)?.name}</Txt></Txt>
              <Txt v="caption" color={t.text3}>{tr("Issued {date}", { date: fmtDate(inv.issued) })} · {tr("due {date}", { date: fmtDate(inv.due) })}</Txt>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Txt num weight="semibold">{money2(amountDue(inv) || inv.amount)}</Txt>
              <InvoiceStatus inv={inv} />
            </View>
          </Card>
        );
      })}
    </Page>
  );
}
