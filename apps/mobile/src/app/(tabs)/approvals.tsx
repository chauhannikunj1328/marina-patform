// Approvals for managers and admins: pending bookings, and staff time off and shift swaps.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CalendarCheck, CalendarClock, CircleCheck, TriangleAlert } from "lucide-react-native";
import { daysBetween, fmtDateTime, fmtShort, money, today } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Screen, Segmented, Txt } from "@/components/ui";
import { BookingSheet } from "@/components/sheets";
import { clashFor, useApprovals } from "@/lib/approvals";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Approvals() {
  const { db, ix, ids, marinaId, can } = useStore();
  const { t } = useTheme();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<"bookings" | "staff">(params.view === "staff" ? "staff" : "bookings");
  const [seenParam, setSeenParam] = useState(params.view);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    if (params.view === "staff" || params.view === "bookings") setView(params.view);
  }
  const [openId, setOpenId] = useState<string>();
  const { approve, decline, approveAll, decide } = useApprovals();
  const canBook = can("bookings") !== "view";
  const canStaff = can("staff") !== "view";
  const now = today();
  const pending = ix.bookingsIn(ids).filter((b) => b.status === "pending").sort((a, b) => a.start.localeCompare(b.start));
  const inIds = new Set(ids);
  const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
  const requests = db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId)).sort((a, b) => a.start.localeCompare(b.start));
  const open = db.bookings.find((b) => b.id === openId);

  return (
    <Screen
      title="Approvals"
      right={view === "bookings" && canBook && pending.length > 1 ? <Button size="sm" variant="primary" icon={CircleCheck} label={`Approve all ${pending.length}`} onPress={() => approveAll(pending)} /> : undefined}
    >
      <Segmented
        value={view}
        onChange={setView}
        items={[
          { value: "bookings", label: "Bookings", count: pending.length },
          { value: "staff", label: "Staff requests", count: requests.length },
        ]}
      />

      {view === "bookings" &&
        (pending.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No bookings waiting" body="New bookings that need a decision show up here." />
        ) : (
          <View style={{ gap: 8 }}>
            {pending.map((b) => {
              const clash = clashFor(ix, b);
              const nights = daysBetween(b.start, b.end);
              return (
                <Card key={b.id}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${ix.boat(b.boatId)?.name}, booking details`} onPress={() => setOpenId(b.id)}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Txt weight="semibold" numberOfLines={1}>{ix.boat(b.boatId)?.name}</Txt>
                        <Txt v="bodySm" color={t.text3} numberOfLines={1}>
                          Berth {ix.berth(b.berthId)?.code}{marinaId === ALL ? ` · ${ix.marinaOfBerth(b.berthId)?.name}` : ""} · {ix.ownerOfBooking(b)?.name}
                        </Txt>
                      </View>
                      <Txt weight="semibold" num>{money(ix.amount(b))}</Txt>
                    </View>
                    <Txt v="bodySm" num color={t.text2} style={{ marginTop: 8 }}>
                      {fmtShort(b.start)} – {fmtShort(b.end)} · {nights} {nights === 1 ? "night" : "nights"}{b.start === now ? " · arriving today" : b.start < now ? " · start date has passed" : ""}
                    </Txt>
                    {clash && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <TriangleAlert size={14} color={t.error.fg} />
                        <Txt v="caption" weight="medium" color={t.error.fg} style={{ flex: 1 }}>{clash}</Txt>
                      </View>
                    )}
                  </Pressable>
                  {canBook && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Button size="sm" style={{ flex: 1 }} label="Decline" onPress={() => decline(b)} />
                      <Button size="sm" style={{ flex: 1 }} variant="primary" label="Approve" disabled={!!clash} onPress={() => approve(b)} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        ))}

      {view === "staff" &&
        (requests.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No requests waiting" body="Staff ask for time off and shift swaps from the app." />
        ) : (
          <View style={{ gap: 8 }}>
            {requests.map((r) => {
              const s = ix.staffMember(r.staffId);
              const cover = ix.staffMember(r.swapWithId);
              return (
                <Card key={r.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" numberOfLines={1}>{s?.name}</Txt>
                      <Txt v="bodySm" color={t.text3} numberOfLines={1}>{s?.position}{marinaId === ALL ? ` · ${ix.marina(s?.marinaId ?? "")?.name}` : ""}</Txt>
                    </View>
                    <Badge tone={r.kind === "leave" ? "info" : "outline"} label={r.kind === "leave" ? "Time off" : "Swap"} />
                  </View>
                  <Txt v="bodySm" num style={{ marginTop: 8 }}>
                    {r.kind === "leave"
                      ? `${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""} · ${daysBetween(r.start, r.end) + 1} ${daysBetween(r.start, r.end) === 0 ? "day" : "days"}`
                      : `${fmtShort(r.start)}, ${s?.shift} shift · ${cover?.name ?? "a colleague"} covers`}
                  </Txt>
                  {r.reason ? <Txt v="bodySm" color={t.text2}>“{r.reason}”</Txt> : null}
                  <Txt v="caption" color={t.text3} style={{ marginTop: 4 }}>Sent {fmtDateTime(r.createdAt)}</Txt>
                  {canStaff && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Button size="sm" style={{ flex: 1 }} label="Decline" onPress={() => decide(r, "declined")} />
                      <Button size="sm" style={{ flex: 1 }} variant="primary" label="Approve" onPress={() => decide(r, "approved")} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        ))}

      {open && <BookingSheet booking={open} onClose={() => setOpenId(undefined)} />}
    </Screen>
  );
}
