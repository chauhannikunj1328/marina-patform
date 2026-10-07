// Boat owner details: contact, boats, stays and money. Opened from Owners and from any booking.
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Mail, Phone } from "lucide-react-native";
import { fmtDate, fmtShort, money2, today, type BoatOwner } from "@marina/shared";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { BookingBadge } from "./status";
import { Button, Row, Section, Sheet, Txt } from "./ui";

export function OwnerSheet({ owner, onClose }: { owner: BoatOwner; onClose: () => void }) {
  const { db, ix, ids } = useStore();
  const { t } = useTheme();
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  const boatIds = new Set(boats.map((b) => b.id));
  // Stays at the marinas this person can see, newest first.
  const stays = db.bookings.filter((b) => boatIds.has(b.boatId) && ids.includes(ix.berth(b.berthId)?.marinaId ?? "")).sort((a, b) => b.start.localeCompare(a.start));
  const invoices = db.invoices.filter((i) => stays.some((b) => b.id === i.bookingId) && i.status !== "void");
  const paid = invoices.reduce((s, i) => s + ix.paidSoFar(i), 0);
  const owed = invoices.reduce((s, i) => s + ix.balance(i), 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const now = today();
  const current = stays.find((b) => b.status === "checked-in" || (b.start <= now && b.end > now && b.status === "confirmed"));
  const tel = owner.phone.replace(/[^\d+]/g, "");
  return (
    <Sheet open onClose={onClose} title={owner.name} subtitle={`Customer since ${fmtDate(owner.since)}`}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} size="lg" icon={Phone} label="Call" disabled={!tel} onPress={() => Linking.openURL(`tel:${tel}`)} />
          <Button style={{ flex: 1 }} size="lg" icon={Mail} label="Email" disabled={!owner.email} onPress={() => Linking.openURL(`mailto:${owner.email}`)} />
        </View>
      }
    >
      <Row label="Contact" value={owner.phone || "No phone"} sub={owner.email || undefined} />
      <Row label="Paid so far" value={money2(paid)} />
      <Row label="Owes" value={money2(owed)} sub={overdue ? `${overdue} overdue ${overdue === 1 ? "invoice" : "invoices"}` : owed ? "Not yet due" : undefined} />
      {current && <Row label="In the marina now" value={`${ix.boat(current.boatId)?.name} · berth ${ix.berth(current.berthId)?.code}`} sub={`Leaves ${fmtShort(current.end)}`} />}
      <Section title="Boats" count={boats.length}>
        {boats.map((b) => (
          <View key={b.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
            <Txt weight="medium">{b.name}</Txt>
            <Txt v="caption" color={t.text3}>{b.type} · {b.length} ft · {b.registration}</Txt>
          </View>
        ))}
      </Section>
      <Section title="Stays" count={stays.filter((b) => b.status !== "cancelled").length}>
        {stays.length === 0 && <Txt v="bodySm" color={t.text3}>No stays at your marinas yet.</Txt>}
        {stays.slice(0, 12).map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            onPress={() => { onClose(); router.navigate({ pathname: "/bookings", params: { open: b.id, at: String(Date.now()) } }); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            <View style={{ flex: 1 }}>
              <Txt v="bodySm" weight="medium">{fmtShort(b.start)} – {fmtShort(b.end)} · {ix.boat(b.boatId)?.name}</Txt>
              <Txt v="caption" color={t.text3}>{ix.marinaOfBerth(b.berthId)?.name} · berth {ix.berth(b.berthId)?.code} · {b.code}</Txt>
            </View>
            <BookingBadge status={b.status} />
            <ChevronRight size={16} color={t.text3} />
          </Pressable>
        ))}
      </Section>
    </Sheet>
  );
}
