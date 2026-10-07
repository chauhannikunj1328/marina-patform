// Account overview: next stay, what's owed, contracts to sign, recent bookings.
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, FileSignature, Receipt, Ship } from "lucide-react";
import { amountDue, daysBetween, fmtDate, money, ownerBookings, ownerInvoices, ownerWaitlist, t, tn, today } from "@marina/shared";
import { useStore } from "@/data/store";
import { Badge, ButtonLink, Card, EmptyState, flip, usePageTitle } from "@/components/ui";
import { BookingStatus } from "./status";

export function Overview() {
  const { db, ix, owner } = useStore();
  usePageTitle(t("My account"));
  if (!owner) return null;
  const now = today();
  const bookings = ownerBookings(db, owner.id);
  const live = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed" && b.end > now).sort((a, b) => a.start.localeCompare(b.start));
  const next = live[0];
  const owed = ownerInvoices(db, owner.id).filter((i) => amountDue(i) > 0);
  const balance = owed.reduce((s, i) => s + amountDue(i), 0);
  const toSign = db.contracts.filter((c) => c.ownerId === owner.id && c.status === "active" && c.end > now && !c.signed);
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  const waiting = ownerWaitlist(db, owner.email);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[13px] text-ink-3"><CalendarDays className="size-4" aria-hidden /> {next && next.start <= now ? t("Staying now") : t("Next stay")}</p>
          {next ? (
            <>
              <p className="mt-3 text-[17px] font-medium">{ix.marinaOfBerth(next.berthId)?.name}</p>
              <p className="mt-1 text-[13px] text-ink-2">{fmtDate(next.start)} – {fmtDate(next.end)} · {t("Berth {code}", { code: ix.berth(next.berthId)?.code })}</p>
              <div className="mt-3 flex items-center gap-2"><BookingStatus b={next} />{next.start > now && <span className="text-xs text-ink-3">{tn(daysBetween(now, next.start), "in {n} day", "in {n} days")}</span>}</div>
            </>
          ) : (
            <>
              <p className="mt-3 text-[15px] text-ink-2">{t("No stays booked.")}</p>
              <ButtonLink to="/book" variant="primary" size="sm" className="mt-4">{t("Book a berth")}</ButtonLink>
            </>
          )}
        </Card>
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[13px] text-ink-3"><Receipt className="size-4" aria-hidden /> {t("To pay")}</p>
          <p className="num mt-3 text-[32px] leading-10 font-medium">{money(balance)}</p>
          <p className="mt-1 text-[13px] text-ink-2">{owed.length ? tn(owed.length, "{n} open invoice", "{n} open invoices") : t("You're all paid up.")}</p>
          {owed.length > 0 && <ButtonLink to={owed.length === 1 ? `/account/invoices/${owed[0].id}` : "/account/invoices"} variant="primary" size="sm" className="mt-4">{t("Pay now")}</ButtonLink>}
        </Card>
      </div>

      {toSign.length > 0 && (
        <Card className="bg-promo flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="flex items-center gap-3 text-[15px] font-medium text-ink"><FileSignature className="size-5" aria-hidden /> {tn(toSign.length, "{n} contract is waiting for your signature", "{n} contracts are waiting for your signature")}</p>
          <ButtonLink to="/account/contracts" variant="primary" size="sm">{t("Read and sign")}</ButtonLink>
        </Card>
      )}

      {waiting.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 px-6 pt-5 pb-3 text-[17px] font-medium"><Clock className="size-4 text-ink-3" aria-hidden /> {t("On the waitlist")}</h2>
          <ul>
            {waiting.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3.5">
                <span><span className="font-medium">{ix.marina(w.marinaId)?.name}</span><span className="block text-xs text-ink-3">{fmtDate(w.start)} – {fmtDate(w.end)} · {w.boatName}</span></span>
                {w.status === "offered" ? <Badge tone="success">{t("Berth offered: the dock office will call you")}</Badge> : <Badge tone="pending">{t("Waiting")}</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[17px] font-medium">{t("Recent bookings")}</h2>
          <Link to="/account/bookings" className="inline-flex items-center gap-1 text-[13px] font-semibold text-green-text hover:underline">{t("View all")} <ArrowRight className={`size-3.5 ${flip(ArrowRight) ?? ""}`} aria-hidden /></Link>
        </div>
        {bookings.length === 0 ? <EmptyState icon={CalendarDays} title={t("No bookings yet")} body={t("Your stays will show here once you book.")} /> : (
          <ul>
            {bookings.slice(0, 4).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3.5">
                <span><span className="font-medium">{ix.marinaOfBerth(b.berthId)?.name}</span><span className="block text-xs text-ink-3"><bdi>{b.code}</bdi> · {fmtDate(b.start)} – {fmtDate(b.end)}</span></span>
                <BookingStatus b={b} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="flex items-center gap-3 text-[15px]"><Ship className="size-5 text-ink-3" aria-hidden /> {boats.length ? tn(boats.length, "{n} boat on your account", "{n} boats on your account") : t("No boats on your account yet")}</p>
        <ButtonLink to="/account/boats" size="sm">{t("Manage boats")}</ButtonLink>
      </Card>
    </div>
  );
}
