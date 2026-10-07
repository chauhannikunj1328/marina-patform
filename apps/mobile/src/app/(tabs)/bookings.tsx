// Bookings: search and the Today / Upcoming / In marina lists.
import { useState } from "react";
import { View } from "react-native";
import { CalendarClock, Plus, Search } from "lucide-react-native";
import { daysBetween, fmtShort, today } from "@marina/shared";
import { Button, Card, EmptyState, Screen, SearchBox, Segmented, Txt } from "@/components/ui";
import { BookingBadge } from "@/components/status";
import { BookingSheet, CheckInSheet, NewBookingSheet } from "@/components/sheets";
import { useOpenParam, useViewParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Bookings() {
  const { db, ix, ids, can } = useStore();
  const { t } = useTheme();
  const [view, setView] = useViewParam(["today", "upcoming", "in"] as const, "today");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useOpenParam();
  const open = db.bookings.find((b) => b.id === openId);
  const [creating, setCreating] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | undefined>();
  const now = today();
  const all = ix.bookingsIn(ids).filter((b) => b.status !== "cancelled");
  const lists = {
    today: all.filter((b) => (b.start === now || b.end === now) && b.status !== "completed").sort((a, b) => a.start.localeCompare(b.start)),
    upcoming: all.filter((b) => b.start > now && (b.status === "confirmed" || b.status === "pending")).sort((a, b) => a.start.localeCompare(b.start)),
    in: all.filter((b) => b.status === "checked-in").sort((a, b) => a.end.localeCompare(b.end)),
  };
  const s = q.trim().toLowerCase();
  const rows = (s
    ? all.filter((b) => b.code.toLowerCase().includes(s) || ix.boat(b.boatId)?.name.toLowerCase().includes(s) || ix.ownerOfBooking(b)?.name.toLowerCase().includes(s) || ix.berth(b.berthId)?.code.toLowerCase().includes(s))
    : lists[view]
  ).slice(0, 60);

  return (
    <Screen title="Bookings" right={can("bookings") !== "view" ? <Button size="sm" variant="primary" icon={Plus} label="New booking" onPress={() => setCreating(true)} /> : undefined}>
      <SearchBox value={q} onChange={setQ} placeholder="Boat, owner, berth or code" />
      {!s && (
        <Segmented
          value={view}
          onChange={setView}
          items={[
            { value: "today", label: "Today", count: lists.today.length },
            { value: "upcoming", label: "Upcoming", count: lists.upcoming.length },
            { value: "in", label: "In marina", count: lists.in.length },
          ]}
        />
      )}
      {rows.length === 0 ? (
        <EmptyState icon={s ? Search : CalendarClock} title={s ? `Nothing matches “${q}”` : "Nothing here"} body={s ? "Try a boat name, owner or berth number." : undefined} />
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((b) => (
            <Card key={b.id} onPress={() => setOpenId(b.id)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold" numberOfLines={1}>{ix.boat(b.boatId)?.name}</Txt>
                  <Txt v="bodySm" color={t.text3} numberOfLines={1}>Berth {ix.berth(b.berthId)?.code}{ids.length > 1 ? ` · ${ix.marinaOfBerth(b.berthId)?.name}` : ""} · {ix.ownerOfBooking(b)?.name}</Txt>
                </View>
                <BookingBadge status={b.status} />
              </View>
              <Txt v="bodySm" num color={t.text2} style={{ marginTop: 8 }}>{fmtShort(b.start)} – {fmtShort(b.end)} · {daysBetween(b.start, b.end)} {daysBetween(b.start, b.end) === 1 ? "night" : "nights"}</Txt>
            </Card>
          ))}
        </View>
      )}
      {open && <BookingSheet booking={open} onClose={() => setOpenId(undefined)} />}
      {creating && <NewBookingSheet onClose={() => setCreating(false)} onDone={(id, checkIn) => { setCreating(false); if (checkIn) setCheckingIn(id); else setOpenId(id); }} />}
      {checkingIn && db.bookings.find((b) => b.id === checkingIn) && <CheckInSheet booking={db.bookings.find((b) => b.id === checkingIn)!} onClose={() => setCheckingIn(undefined)} />}
    </Screen>
  );
}
