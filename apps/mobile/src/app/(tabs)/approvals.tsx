// Approvals (managers and admins): pending bookings and staff time off / swap requests, decided in one tap.
import { useState } from "react";
import { View } from "react-native";
import { CalendarCheck, CircleCheck, TriangleAlert } from "lucide-react-native";
import { daysBetween, fmtShort, money2, relative, withInvoice, type Booking, type StaffRequest } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { useViewParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Approvals() {
  const { db, ix, ids, update, toast, can, user } = useStore();
  const { t } = useTheme();
  const [view, setView] = useViewParam(["bookings", "staff"] as const, "bookings");
  const [confirmAll, setConfirmAll] = useState(false);
  const inIds = new Set(ids);
  const bookings = ix.bookingsIn(ids).filter((b) => b.status === "pending").sort((a, b) => a.start.localeCompare(b.start));
  const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
  const requests = db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId)).sort((a, b) => a.start.localeCompare(b.start));
  const canBook = can("bookings") !== "view";
  const canStaff = can("staff") !== "view";
  const clashes = (b: Booking) => !ix.isFree(b.berthId, b.start, b.end, b.id);
  const many = ids.length > 1;

  const decideBooking = (b: Booking, ok: boolean) => {
    const before = db;
    const boat = ix.boat(b.boatId)?.name;
    update(
      (d) => {
        const next = { ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: ok ? ("confirmed" as const) : ("cancelled" as const) } : x)) };
        return ok ? withInvoice(next, b.id, ix.amount(b)) : next;
      },
      { text: `${ok ? "Approved" : "Declined"} booking ${b.code} for ${boat}`, to: `/bookings?q=${b.code}`, marinaId: ix.berth(b.berthId)?.marinaId },
    );
    toast(ok ? `${boat} approved and invoiced` : `${boat} declined`, before);
  };
  const approveAll = () => {
    const ok = bookings.filter((b) => !clashes(b));
    const before = db;
    update((d) => ok.reduce((acc, b) => withInvoice({ ...acc, bookings: acc.bookings.map((x) => (x.id === b.id ? { ...x, status: "confirmed" as const } : x)) }, b.id, ix.amount(b)), d), { text: `Approved ${ok.length} pending bookings` });
    toast(`${ok.length} bookings approved and invoiced`, before);
  };
  const decideRequest = (r: StaffRequest, ok: boolean) => {
    const before = db;
    const who = ix.staffMember(r.staffId);
    update(
      (d) => ({ ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, status: ok ? ("approved" as const) : ("declined" as const), decidedBy: user?.name, decidedAt: new Date().toISOString() } : x)) }),
      { text: `${ok ? "Approved" : "Declined"} ${who?.name}'s ${r.kind === "leave" ? "time off" : "shift swap"} request`, to: "/staff?tab=requests", marinaId: who?.marinaId },
    );
    toast(`${ok ? "Approved" : "Declined"}. ${who?.name.split(" ")[0]} sees it in the app.`, before);
  };

  return (
    <Screen title="Approvals" right={view === "bookings" && canBook && bookings.filter((b) => !clashes(b)).length > 1 ? <Button size="sm" variant="primary" icon={CircleCheck} label="Approve all" onPress={() => setConfirmAll(true)} /> : undefined}>
      <Segmented value={view} onChange={setView} items={[{ value: "bookings", label: "Bookings", count: bookings.length }, { value: "staff", label: "Staff requests", count: requests.length }]} />
      {view === "bookings" ? (
        bookings.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No bookings waiting" body="New online and phone bookings that need a yes or no show up here." />
        ) : (
          <View style={{ gap: 8 }}>
            {bookings.map((b) => {
              const clash = clashes(b);
              const nights = daysBetween(b.start, b.end);
              return (
                <Card key={b.id} style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold">{ix.boat(b.boatId)?.name}</Txt>
                      <Txt v="bodySm" color={t.text3}>{ix.ownerOfBooking(b)?.name} · {ix.boat(b.boatId)?.length} ft</Txt>
                    </View>
                    <Txt num weight="semibold">{money2(ix.amount(b))}</Txt>
                  </View>
                  <Txt v="bodySm" color={t.text2}>
                    {fmtShort(b.start)} – {fmtShort(b.end)} · {nights} {nights === 1 ? "night" : "nights"} · Berth {ix.berth(b.berthId)?.code}{many ? ` · ${ix.marinaOfBerth(b.berthId)?.name}` : ""}
                  </Txt>
                  <Txt v="caption" color={t.text3}>{b.code} · arrives {relative(b.start).toLowerCase()}</Txt>
                  {clash && (
                    <View style={{ flexDirection: "row", gap: 8, backgroundColor: t.error.bg, borderRadius: 12, padding: 10 }}>
                      <TriangleAlert size={16} color={t.error.fg} />
                      <Txt v="caption" color={t.error.fg} style={{ flex: 1 }}>Another booking already holds this berth for these dates. Move one of them in the web app first.</Txt>
                    </View>
                  )}
                  {canBook && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Button style={{ flex: 1 }} size="sm" label="Decline" onPress={() => decideBooking(b, false)} />
                      <Button style={{ flex: 1 }} size="sm" variant="primary" label="Approve" disabled={clash} onPress={() => decideBooking(b, true)} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )
      ) : requests.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No staff requests waiting" body="Time off and shift swaps sent from the app show up here." />
      ) : (
        <View style={{ gap: 8 }}>
          {requests.map((r) => {
            const s = ix.staffMember(r.staffId);
            const cover = ix.staffMember(r.swapWithId);
            return (
              <Card key={r.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="semibold">{s?.name}</Txt>
                    <Txt v="bodySm" color={t.text3}>{s?.position}{many ? ` · ${ix.marina(s?.marinaId ?? "")?.name}` : ""}</Txt>
                  </View>
                  <Badge tone={r.kind === "leave" ? "info" : "neutral"} label={r.kind === "leave" ? "Time off" : "Swap"} />
                </View>
                <Txt v="bodySm" weight="medium">
                  {r.kind === "leave" ? `${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""} · ${daysBetween(r.start, r.end) + 1} ${daysBetween(r.start, r.end) ? "days" : "day"}` : `${fmtShort(r.start)}, ${s?.shift} shift · ${cover?.name} covers`}
                </Txt>
                <Txt v="bodySm" color={t.text2}>“{r.reason}”</Txt>
                {canStaff && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <Button style={{ flex: 1 }} size="sm" label="Decline" onPress={() => decideRequest(r, false)} />
                    <Button style={{ flex: 1 }} size="sm" variant="primary" label="Approve" onPress={() => decideRequest(r, true)} />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}
      {confirmAll && (() => {
        const ok = bookings.filter((b) => !clashes(b));
        const total = ok.reduce((sum, b) => sum + ix.amount(b), 0);
        return (
          <Sheet
            open
            onClose={() => setConfirmAll(false)}
            title={`Approve ${ok.length} bookings?`}
            subtitle={`${money2(total)} will be invoiced to boat owners.`}
            footer={<Button variant="primary" size="lg" icon={CircleCheck} label={`Approve ${ok.length}`} onPress={() => { approveAll(); setConfirmAll(false); }} />}
          >
            <Txt v="bodySm" color={t.text2}>
              Each one is confirmed and invoiced{bookings.length > ok.length ? `. ${bookings.length - ok.length} that clash with another booking are skipped` : ""}. You can undo straight after.
            </Txt>
          </Sheet>
        );
      })()}
    </Screen>
  );
}
