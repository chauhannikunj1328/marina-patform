// The owner's bookings: upcoming, past and cancelled. Requests not yet confirmed can be cancelled.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Star } from "lucide-react";
import { cx, daysBetween, fmtDate, getLang, money, ownerBookings, t, tn, today, withRequestCancelled, type Booking } from "@marina/shared";
import { useStore } from "@/data/store";
import { saveReview, useReviews, type Review } from "@/data/reviews";
import { Stars } from "@/components/Reviews";
import { Button, ButtonLink, Card, EmptyState, Field, Modal, Notice, Textarea, usePageTitle } from "@/components/ui";
import { BookingStatus } from "./status";

/** Rate a past stay: 1–5 stars and a few words, shown on the marina's page. */
function RateStay({ booking, existing, onClose }: { booking: Booking; existing?: Review; onClose: () => void }) {
  const { ix, owner, toast } = useStore();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? "");
  const [error, setError] = useState("");
  const marina = ix.marinaOfBerth(booking.berthId);
  const boat = ix.boat(booking.boatId);
  const submit = () => {
    if (!rating) return setError(t("Choose from 1 to 5 stars."));
    if (text.trim().length < 20) return setError(t("Tell other boat owners a little more (at least 20 characters)."));
    const parts = (owner?.name ?? "").trim().split(/\s+/);
    saveReview({
      id: `rv-${booking.id}`, bookingId: booking.id, ownerId: owner?.id, marinaId: marina?.id ?? "",
      name: parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0],
      boat: boat ? `${boat.name}, ${boat.length} ft` : undefined,
      rating: rating as Review["rating"], stayed: booking.start.slice(0, 7), nights: daysBetween(booking.start, booking.end), text: text.trim(), lang: getLang(),
    });
    toast(t("Thanks for your review"));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Rate your stay at {marina}", { marina: marina?.name })} description={t("Your first name, last initial and boat are shown with your review on the marina's page.")}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={submit}>{existing ? t("Update review") : t("Post review")}</Button></>}>
      <div className="space-y-5">
        <fieldset>
          <legend className="text-[13px] leading-5 font-medium">{t("Your rating")}</legend>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("Your rating")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t("{n} out of 5 stars", { n })} onClick={() => { setRating(n); setError(""); }}
                className="rounded-full p-1.5 hover:bg-sidebar-hover cursor-pointer">
                <Star className={cx("size-7", n <= rating ? "fill-accent-strong text-accent-strong" : "text-line-strong")} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t("Your review")} hint={t("What was the berth, the dock office and the marina like?")}>
          {(id) => <Textarea id={id} rows={5} maxLength={600} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} />}
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Modal>
  );
}

type Tab = "upcoming" | "past" | "cancelled";

export function MyBookings() {
  const { db, ix, owner, update, toast } = useStore();
  usePageTitle(t("Bookings"));
  const [params] = useSearchParams();
  const fresh = params.get("new");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<Booking | undefined>();
  const [rating, setRating] = useState<Booking | undefined>();
  const reviews = useReviews();
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
                      <p className="num mt-2 text-[15px] font-semibold">{money(ix.amount(b), ix.curOfBooking(b))}</p>
                    </div>
                  </div>
                  {tab === "past" && (() => {
                    const mine = reviews.find((r) => r.bookingId === b.id);
                    return (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        {mine ? <p className="flex items-center gap-2 text-[13px] text-ink-3"><Stars value={mine.rating} />{t("You reviewed this stay.")}</p> : <p className="text-[13px] text-ink-3">{t("How was your stay? Your review helps other boat owners.")}</p>}
                        <Button size="sm" icon={Star} onClick={() => setRating(b)}>{mine ? t("Edit your review") : t("Rate your stay")}</Button>
                      </div>
                    );
                  })()}
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
      {rating && <RateStay booking={rating} existing={reviews.find((r) => r.bookingId === rating.id)} onClose={() => setRating(undefined)} />}
      <Modal open={!!cancelling} onClose={() => setCancelling(undefined)} title={t("Cancel booking request {code}?", { code: cancelling?.code })} description={t("The berth is released for others. Nothing has been charged.")}
        footer={<><Button onClick={() => setCancelling(undefined)}>{t("Keep it")}</Button><Button variant="primary" onClick={() => { update((d) => withRequestCancelled(d, cancelling!.id, new Date().toISOString())); toast(t("Booking request {code} cancelled", { code: cancelling!.code })); setCancelling(undefined); }}>{t("Cancel request")}</Button></>}>
        <p className="text-[13px] text-ink-2">{cancelling && `${ix.marinaOfBerth(cancelling.berthId)?.name} · ${fmtDate(cancelling.start)} – ${fmtDate(cancelling.end)}`}</p>
      </Modal>
    </div>
  );
}
