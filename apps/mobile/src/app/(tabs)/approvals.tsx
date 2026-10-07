// Approvals (managers and admins): pending bookings and staff time off / swap requests, decided in one tap.
import { useState } from "react";
import { View } from "react-native";
import { CalendarCheck, CircleCheck, TriangleAlert } from "lucide-react-native";
import { daysBetween, fmtShort, money2, relative, withInvoice, type Booking, type StaffRequest } from "@marina/shared";
import { Badge, Button, Card, EmptyState, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { useViewParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export default function Approvals() {
  const tr = useTr();
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
    toast(ok ? tr("{boat} approved and invoiced", { boat: boat }) : `${boat} declined`, before);
  };
  const approveAll = () => {
    const ok = bookings.filter((b) => !clashes(b));
    const before = db;
    update((d) => ok.reduce((acc, b) => withInvoice({ ...acc, bookings: acc.bookings.map((x) => (x.id === b.id ? { ...x, status: "confirmed" as const } : x)) }, b.id, ix.amount(b)), d), { text: `Approved ${ok.length} pending bookings` });
    toast(tr("{n} bookings approved and invoiced", { n: ok.length }), before);
  };
  const decideRequest = (r: StaffRequest, ok: boolean) => {
    const before = db;
    const who = ix.staffMember(r.staffId);
    update(
      (d) => ({ ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, status: ok ? ("approved" as const) : ("declined" as const), decidedBy: user?.name, decidedAt: new Date().toISOString() } : x)) }),
      { text: `${ok ? "Approved" : "Declined"} ${who?.name}'s ${r.kind === "leave" ? "time off" : "shift swap"} request`, to: "/staff?tab=requests", marinaId: who?.marinaId },
    );
    toast((ok ? tr("Approved. {name} sees it in the app.", { name: who?.name.split(" ")[0] }) : tr("Declined. {name} sees it in the app.", { name: who?.name.split(" ")[0] })), before);
  };

  return (
    <Screen title={tr("Approvals")} right={view === "bookings" && canBook && bookings.filter((b) => !clashes(b)).length > 1 ? <Button size="sm" variant="primary" icon={CircleCheck} label={tr("Approve all")} onPress={() => setConfirmAll(true)} /> : undefined}>
      <Segmented value={view} onChange={setView} items={[{ value: "bookings", label: tr("Bookings"), count: bookings.length }, { value: "staff", label: tr("Staff requests"), count: requests.length }]} />
      {view === "bookings" ? (
        bookings.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={tr("No bookings waiting")} body={tr("New online and phone bookings that need a yes or no show up here.")} />
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
                      <Txt v="bodySm" color={t.text3}>{ix.ownerOfBooking(b)?.name} · {ix.boat(b.boatId)?.length} {tr("ft")}</Txt>
                    </View>
                    <Txt num weight="semibold">{money2(ix.amount(b))}</Txt>
                  </View>
                  <Txt v="bodySm" color={t.text2}>
                    {fmtShort(b.start)} – {fmtShort(b.end)} · {tn(nights, "{n} night", "{n} nights")} · {tr("Berth {code}", { code: ix.berth(b.berthId)?.code })}{many ? ` · ${ix.marinaOfBerth(b.berthId)?.name}` : ""}
                  </Txt>
                  <Txt v="caption" color={t.text3}>{tr("{code} · arrives {when}", { code: b.code, when: relative(b.start).toLowerCase() })}</Txt>
                  {clash && (
                    <View style={{ flexDirection: "row", gap: 8, backgroundColor: t.error.bg, borderRadius: 12, padding: 10 }}>
                      <TriangleAlert size={16} color={t.error.fg} />
                      <Txt v="caption" color={t.error.fg} style={{ flex: 1 }}>{tr("Another booking already holds this berth for these dates. Move one of them in the web app first.")}</Txt>
                    </View>
                  )}
                  {canBook && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Button style={{ flex: 1 }} size="sm" label={tr("Decline")} onPress={() => decideBooking(b, false)} />
                      <Button style={{ flex: 1 }} size="sm" variant="primary" label={tr("Approve")} disabled={clash} onPress={() => decideBooking(b, true)} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )
      ) : requests.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={tr("No staff requests waiting")} body={tr("Time off and shift swaps sent from the app show up here.")} />
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
                    <Txt v="bodySm" color={t.text3}>{tr(s?.position)}{many ? ` · ${ix.marina(s?.marinaId ?? "")?.name}` : ""}</Txt>
                  </View>
                  <Badge tone={r.kind === "leave" ? "info" : "neutral"} label={r.kind === "leave" ? tr("Time off") : tr("Swap")} />
                </View>
                <Txt v="bodySm" weight="medium">
                  {r.kind === "leave" ? `${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""} · ${daysBetween(r.start, r.end) + 1} ${daysBetween(r.start, r.end) ? "days" : "day"}` : tr("{date}, {shift} shift · {name} covers", { date: fmtShort(r.start), shift: s?.shift, name: cover?.name })}
                </Txt>
                <Txt v="bodySm" color={t.text2}>“{r.reason}”</Txt>
                {canStaff && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <Button style={{ flex: 1 }} size="sm" label={tr("Decline")} onPress={() => decideRequest(r, false)} />
                    <Button style={{ flex: 1 }} size="sm" variant="primary" label={tr("Approve")} onPress={() => decideRequest(r, true)} />
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
            title={tr("Approve {n} bookings?", { n: ok.length })}
            subtitle={tr("{amount} will be invoiced to boat owners.", { amount: money2(total) })}
            footer={<Button variant="primary" size="lg" icon={CircleCheck} label={tr("Approve {n}", { n: ok.length })} onPress={() => { approveAll(); setConfirmAll(false); }} />}
          >
            <Txt v="bodySm" color={t.text2}>
              {bookings.length > ok.length ? tr("Each one is confirmed and invoiced. {n} that clash with another booking are skipped. You can undo straight after.", { n: bookings.length - ok.length }) : tr("Each one is confirmed and invoiced. You can undo straight after.")}
            </Txt>
          </Sheet>
        );
      })()}
    </Screen>
  );
}
