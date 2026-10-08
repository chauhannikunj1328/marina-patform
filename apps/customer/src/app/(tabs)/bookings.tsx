// The owner's bookings: upcoming, past and cancelled. Tap one for its details, the dock office's
// number and directions, its invoice, or to cancel a request the marina hasn't confirmed yet.
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, CircleCheck, Receipt, Search, X } from "lucide-react-native";
import { daysBetween, fmtDate, money, ownerBookings, tn, today, withRequestCancelled, type Booking } from "@marina/shared";
import { Button, Card, EmptyState, Row, Segmented, Sheet, Txt } from "@/components/ui";
import { BookingStatus, MarinaActions, Page, SignInPrompt } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { useOpenParam, useViewParam } from "@/lib/useOpenParam";

type Tab = "upcoming" | "past" | "cancelled";

function BookingSheet({ booking, onClose }: { booking?: Booking; onClose: () => void }) {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, update, toast } = useStore();
  const [confirming, setConfirming] = useState(false);
  if (!booking) return null;
  const marina = ix.marinaOfBerth(booking.berthId);
  const invoice = db.invoices.find((i) => i.bookingId === booking.id);
  const cancel = () => {
    update((d) => withRequestCancelled(d, booking.id, new Date().toISOString()));
    toast(tr("Booking request {code} cancelled", { code: booking.code }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={marina?.name ?? booking.code} subtitle={booking.code}>
      <View style={{ gap: 4 }}>
        <View style={{ marginBottom: 12 }}><BookingStatus b={booking} /></View>
        <Row label={tr("Arrive")} value={fmtDate(booking.start)} />
        <Row label={tr("date|Leave")} value={fmtDate(booking.end)} sub={tn(daysBetween(booking.start, booking.end), "{n} night", "{n} nights")} />
        <Row label={tr("Berth")} value={ix.berth(booking.berthId)?.code ?? ""} />
        <Row label={tr("Boat")} value={ix.boat(booking.boatId)?.name ?? ""} />
        <Row label={tr("People on board")} value={String(booking.guests)} />
        <Row label={tr("Total")} value={money(ix.amount(booking))} />
      </View>
      <View style={{ gap: 8, marginTop: 8 }}>
        {marina && <MarinaActions marina={marina} />}
        {invoice && <Button icon={Receipt} label={tr("View invoice")} onPress={() => { onClose(); router.push({ pathname: "/invoice/[id]", params: { id: invoice.id } }); }} />}
        {booking.status === "pending" && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Txt v="bodySm" color={t.text3}>{tr("{marina} hasn't confirmed this yet. The berth is held for you.", { marina: marina?.name })}</Txt>
            {confirming ? (
              <Card style={{ gap: 8 }}>
                <Txt weight="medium">{tr("Cancel booking request {code}?", { code: booking.code })}</Txt>
                <Txt v="bodySm" color={t.text3}>{tr("The berth is released for others. Nothing has been charged.")}</Txt>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button label={tr("Keep it")} onPress={() => setConfirming(false)} style={{ flex: 1 }} />
                  <Button variant="danger" label={tr("Cancel request")} onPress={cancel} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : (
              <Button icon={X} label={tr("Cancel request")} onPress={() => setConfirming(true)} />
            )}
          </View>
        )}
      </View>
    </Sheet>
  );
}

export default function Bookings() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix, owner } = useStore();
  const params = useLocalSearchParams<{ fresh?: string }>();
  // Links from Home (a booking) and from checkout (the new booking) open the Upcoming list.
  const [tab, setTab] = useViewParam<Tab>(["upcoming", "past", "cancelled"], "upcoming");
  const [openId, setOpenId] = useOpenParam();

  if (!owner) return <Page title={tr("Bookings")}><SignInPrompt icon={CalendarDays} title={tr("Your stays, in one place")} body={tr("Sign in to see your bookings, change requests and get directions to the marina.")} /></Page>;

  const now = today();
  const all = ownerBookings(db, owner.id);
  const groups: Record<Tab, Booking[]> = {
    upcoming: all.filter((b) => b.status !== "cancelled" && b.status !== "completed" && b.end > now).sort((a, b) => a.start.localeCompare(b.start)),
    past: all.filter((b) => b.status === "completed" || (b.status !== "cancelled" && b.end <= now)),
    cancelled: all.filter((b) => b.status === "cancelled"),
  };
  const list = groups[tab];
  const open = all.find((b) => b.id === openId);

  return (
    <Page title={tr("Bookings")} right={<Button size="sm" variant="primary" icon={Search} label={tr("Book")} onPress={() => router.navigate("/book")} />}>
      {params.fresh ? (
        <Card style={{ flexDirection: "row", gap: 10, backgroundColor: t.success.bg, borderColor: t.success.bg }}>
          <CircleCheck size={20} color={t.success.fg} />
          <Txt v="bodySm" color={t.success.fg} style={{ flex: 1 }}>{tr("Booking {code} is sent. The marina will confirm it, usually within one business day, and send the invoice.", { code: params.fresh })}</Txt>
        </Card>
      ) : null}
      <Segmented value={tab} onChange={setTab} items={[
        { value: "upcoming", label: tr("Upcoming"), count: groups.upcoming.length },
        { value: "past", label: tr("Past"), count: groups.past.length },
        { value: "cancelled", label: tr("Cancelled"), count: groups.cancelled.length },
      ]} />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarDays} title={tab === "upcoming" ? tr("No upcoming stays") : tr("Nothing here yet")} />
          {tab === "upcoming" && <Button variant="primary" label={tr("Book a berth")} onPress={() => router.navigate("/book")} />}
        </Card>
      ) : list.map((b) => {
        const marina = ix.marinaOfBerth(b.berthId);
        return (
          <Card key={b.id} onPress={() => setOpenId(b.id)} style={[{ gap: 4 }, b.code === params.fresh && { borderColor: t.green }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Txt weight="medium" style={{ flex: 1 }} numberOfLines={1}>{marina?.name}</Txt>
              <Txt num weight="semibold">{money(ix.amount(b))}</Txt>
            </View>
            <Txt v="bodySm" color={t.text2}>{fmtDate(b.start)} – {fmtDate(b.end)} · {tn(daysBetween(b.start, b.end), "{n} night", "{n} nights")}</Txt>
            <Txt v="caption" color={t.text3}>{b.code} · {tr("Berth {code}", { code: ix.berth(b.berthId)?.code })} · {ix.boat(b.boatId)?.name}</Txt>
            <View style={{ marginTop: 6 }}><BookingStatus b={b} /></View>
          </Card>
        );
      })}
      <BookingSheet key={open?.id} booking={open} onClose={() => setOpenId(undefined)} />
    </Page>
  );
}
