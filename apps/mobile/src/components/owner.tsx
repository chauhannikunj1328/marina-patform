// Boat owner details: contact, boats, stays and money. Opened from Owners and from any booking.
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Mail, Phone } from "lucide-react-native";
import { fmtDate, fmtShort, moneyTotal, today, type BoatOwner, ftM } from "@marina/shared";
import { useStore } from "../store";
import { flipRtl, useTheme } from "../theme";
import { BookingBadge } from "./status";
import { Button, Row, Section, Sheet, Txt } from "./ui";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export function OwnerSheet({ owner, onClose }: { owner: BoatOwner; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, ids } = useStore();
  const { t } = useTheme();
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  const boatIds = new Set(boats.map((b) => b.id));
  // Stays at the marinas this person can see, newest first.
  const stays = db.bookings.filter((b) => boatIds.has(b.boatId) && ids.includes(ix.berth(b.berthId)?.marinaId ?? "")).sort((a, b) => b.start.localeCompare(a.start));
  const invoices = db.invoices.filter((i) => stays.some((b) => b.id === i.bookingId) && i.status !== "void");
  const paid = moneyTotal(invoices.map((i) => ({ amount: ix.paidSoFar(i), currency: ix.curOfInvoice(i) })), true);
  const owedBy = invoices.map((i) => ({ amount: ix.balance(i), currency: ix.curOfInvoice(i) }));
  const owed = owedBy.reduce((s, x) => s + x.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const now = today();
  const current = stays.find((b) => b.status === "checked-in" || (b.start <= now && b.end > now && b.status === "confirmed"));
  const tel = owner.phone.replace(/[^\d+]/g, "");
  return (
    <Sheet open onClose={onClose} title={owner.name} subtitle={tr("Customer since {date}", { date: fmtDate(owner.since) })}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} size="lg" icon={Phone} label={tr("Call")} disabled={!tel} onPress={() => Linking.openURL(`tel:${tel}`)} />
          <Button style={{ flex: 1 }} size="lg" icon={Mail} label={tr("Email")} disabled={!owner.email} onPress={() => Linking.openURL(`mailto:${owner.email}`)} />
        </View>
      }
    >
      <Row label={tr("Contact")} value={owner.phone || "No phone"} sub={owner.email || undefined} />
      <Row label={tr("Paid so far")} value={paid} />
      <Row label={tr("Owes")} value={moneyTotal(owedBy, true)} sub={overdue ? tn(overdue, "{n} overdue invoice", "{n} overdue invoices") : owed ? tr("Not yet due") : undefined} />
      {current && <Row label={tr("In the marina now")} value={`${ix.boat(current.boatId)?.name} · berth ${ix.berth(current.berthId)?.code}`} sub={tr("Leaves {date}", { date: fmtShort(current.end) })} />}
      <Section title={tr("Boats")} count={boats.length}>
        {boats.map((b) => (
          <View key={b.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
            <Txt weight="medium">{b.name}</Txt>
            <Txt v="caption" color={t.text3}>{tr(b.type)} · {ftM(b.length)} · {b.registration}</Txt>
          </View>
        ))}
      </Section>
      <Section title={tr("Stays")} count={stays.filter((b) => b.status !== "cancelled").length}>
        {stays.length === 0 && <Txt v="bodySm" color={t.text3}>{tr("No stays at your marinas yet.")}</Txt>}
        {stays.slice(0, 12).map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            onPress={() => { onClose(); router.navigate({ pathname: "/bookings", params: { open: b.id, at: String(Date.now()) } }); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            <View style={{ flex: 1 }}>
              <Txt v="bodySm" weight="medium">{fmtShort(b.start)} – {fmtShort(b.end)} · {ix.boat(b.boatId)?.name}</Txt>
              <Txt v="caption" color={t.text3}>{tr("{marina} · berth {berth} · {code}", { marina: ix.marinaOfBerth(b.berthId)?.name, berth: ix.berth(b.berthId)?.code, code: b.code })}</Txt>
            </View>
            <BookingBadge status={b.status} />
            <ChevronRight style={flipRtl()} size={16} color={t.text3} />
          </Pressable>
        ))}
      </Section>
    </Sheet>
  );
}
