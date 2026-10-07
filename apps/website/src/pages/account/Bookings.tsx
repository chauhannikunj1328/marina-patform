// The owner's bookings: upcoming, past and cancelled. Requests not yet confirmed can be cancelled.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { cx, daysBetween, fmtDate, money, ownerBookings, t, tn, today, withRequestCancelled, type Booking } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, ButtonLink, Card, EmptyState, Modal, Notice, usePageTitle } from "@/components/ui";
import { BookingStatus } from "./status";

type Tab = "upcoming" | "past" | "cancelled";

export function MyBookings() {
  const { db, ix, owner, update, toast } = useStore();
  usePageTitle(t("Bookings"));
  const [params] = useSearchParams();
  const fresh = params.get("new");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<Booking | undefined>();
  if (!owner) return null;
  const now = today();
  const all = ownerBookings(db, owner.id);
  const groups: Record<Tab, Booking[]> = {
    upcoming: all.filter((b) => b.status !== "cancelled" && b.status !== "completed" && b.end > now).sort((a, b) => a.start.localeCompare(b.start)),
    past: all.filter((b) => b.status === "completed" || (b.status !== "cancelled" && b.end <= now)),
    cancelled: all.filter((b) => b.status === "cancelled"),
  };
  const labels: Record<Tab, string> = { upcoming: t("Upcoming"), past: t("Past"), cancelled: t("Cancelled") };
  const list = groups[tab];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[22px] leading-[30px] font-medium">{t("Bookings")}</h2>
        <ButtonLink to="/book" variant="primary" size="sm">{t("Book a berth")}</ButtonLink>
      </div>
      {fresh && <div className="mb-4"><Notice tone="success">{t("Booking {code} is sent. The marina will confirm it, usually within one business day, and send the invoice.", { code: fresh })}</Notice></div>}
      <div role="tablist" className="mb-4 flex gap-6 border-b border-line">
        {(Object.keys(groups) as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("-mb-px border-b-2 py-3 text-[15px] font-medium cursor-pointer", tab === k ? "border-primary text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
            {labels[k]} <span className="num ms-1 rounded-full bg-surface-3 px-2 text-xs text-ink-2">{groups[k].length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={CalendarDays} title={tab === "upcoming" ? t("No upcoming stays") : t("Nothing here yet")} action={tab === "upcoming" ? <ButtonLink to="/book" variant="primary">{t("Book a berth")}</ButtonLink> : undefined} /></Card>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => {
            const marina = ix.marinaOfBerth(b.berthId);
            const boat = ix.boat(b.boatId);
            return (
              <li key={b.id}>
                <Card className={cx("p-5", b.code === fresh && "border-accent-strong")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium">{marina?.name}</p>
                      <p className="mt-1 text-[13px] text-ink-2">{fmtDate(b.start)} – {fmtDate(b.end)} · {tn(daysBetween(b.start, b.end), "{n} night", "{n} nights")}</p>
                      <p className="mt-1 text-xs text-ink-3"><bdi>{b.code}</bdi> · {t("Berth {code}", { code: ix.berth(b.berthId)?.code })} · {boat?.name}</p>
                    </div>
                    <div className="text-end">
                      <BookingStatus b={b} />
                      <p className="num mt-2 text-[15px] font-semibold">{money(ix.amount(b))}</p>
                    </div>
                  </div>
                  {b.status === "pending" && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      <p className="text-[13px] text-ink-3">{t("{marina} hasn't confirmed this yet. The berth is held for you.", { marina: marina?.name })}</p>
                      <Button size="sm" onClick={() => setCancelling(b)}>{t("Cancel request")}</Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={!!cancelling} onClose={() => setCancelling(undefined)} title={t("Cancel booking request {code}?", { code: cancelling?.code })} description={t("The berth is released for others. Nothing has been charged.")}
        footer={<><Button onClick={() => setCancelling(undefined)}>{t("Keep it")}</Button><Button variant="primary" onClick={() => { update((d) => withRequestCancelled(d, cancelling!.id, new Date().toISOString())); toast(t("Booking request {code} cancelled", { code: cancelling!.code })); setCancelling(undefined); }}>{t("Cancel request")}</Button></>}>
        <p className="text-[13px] text-ink-2">{cancelling && `${ix.marinaOfBerth(cancelling.berthId)?.name} · ${fmtDate(cancelling.start)} – ${fmtDate(cancelling.end)}`}</p>
      </Modal>
    </div>
  );
}
