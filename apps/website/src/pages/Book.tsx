// Booking: search results (free berths that fit the boat, with prices) and checkout.
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Droplets, Plug, Ruler, Ship } from "lucide-react";
import {
  availableBerths, berthIsFree, daysBetween, fmtDate, ftM, money, priceNote, quote, searchProblem, t, tn, today, withBoat, withOnlineBooking,
  type Berth, type BoatType,
} from "@marina/shared";
import { useStore } from "@/data/store";
import { SearchForm, defaultSearch } from "@/components/SearchForm";
import { WaitlistDialog } from "@/components/WaitlistDialog";
import { Badge, Button, ButtonLink, Card, Container, EmptyState, Field, Input, Notice, PageTitle, Select, flip, usePageTitle } from "@/components/ui";
import { stateOf } from "@/lib/marinas";
import { bookMeta } from "@/lib/seo";
import { TrustPoints } from "@/components/Trust";

const BOAT_TYPES: BoatType[] = ["Sailboat", "Motor Yacht", "Catamaran", "Center Console", "Trawler"];
const SHOWN_PER_MARINA = 4;
const stamp = () => new Date().toISOString();

function useSearch() {
  const [params] = useSearchParams();
  const d = defaultSearch();
  return { marina: params.get("marina") ?? "", start: params.get("start") ?? d.start, end: params.get("end") ?? d.end, length: params.get("length") ?? d.length };
}

function BerthRow({ berth, start, end, length, best }: { berth: Berth; start: string; end: string; length: string; best?: boolean }) {
  const { db, ix } = useStore();
  const price = quote(db, berth, start, end);
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
      <div>
        <p className="flex flex-wrap items-center gap-2 font-medium">{t("Berth {code}", { code: berth.code })} <span className="text-[13px] font-normal text-ink-3">· {t(berth.type)}</span>{best && <Badge tone="success">{t("Lowest price")}</Badge>}</p>
        <p className="mt-1 flex flex-wrap gap-3 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1"><Ruler className="size-3.5" aria-hidden />{t("Up to {length}", { length: ftM(berth.maxLength) })}</span>
          {berth.power && <span className="inline-flex items-center gap-1"><Plug className="size-3.5" aria-hidden />{t("Power")}</span>}
          {berth.water && <span className="inline-flex items-center gap-1"><Droplets className="size-3.5" aria-hidden />{t("Water")}</span>}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-end">
          <p className="num text-[17px] font-semibold">{money(price, ix.curOfBerth(berth.id))}</p>
          <p className="text-xs text-ink-3">{priceNote(start, end, db.settings.monthlyFromNights, db.settings.pricing)}</p>
        </div>
        <ButtonLink to={`/book/checkout?${new URLSearchParams({ berth: berth.id, start, end, length })}`} variant="primary" size="sm">{t("Book")}</ButtonLink>
      </div>
    </li>
  );
}

export function Book() {
  const { db, ix } = useStore();
  usePageTitle(t("Book a berth"), bookMeta(db, window.location.origin));
  const q = useSearch();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [waitlist, setWaitlist] = useState(false);
  const problem = searchProblem({ ...q, length: Number(q.length) }, today());
  const results = useMemo(() => (problem ? [] : availableBerths(db, { start: q.start, end: q.end, length: Number(q.length), marinaId: q.marina || undefined })), [db, q.start, q.end, q.length, q.marina, problem]);
  const byMarina = useMemo(() => {
    const map = new Map<string, Berth[]>();
    for (const b of results) map.set(b.marinaId, [...(map.get(b.marinaId) ?? []), b]);
    // Marinas with the cheapest stay first.
    return [...map.entries()].sort((a, b) => quote(db, a[1][0], q.start, q.end) - quote(db, b[1][0], q.start, q.end));
  }, [results, db, q.start, q.end]);
  const nights = daysBetween(q.start, q.end);
  const cheapest = results.length ? results.reduce((a, b) => (quote(db, b, q.start, q.end) < quote(db, a, q.start, q.end) ? b : a)).id : undefined;

  return (
    <Container className="py-12">
      <PageTitle title={t("Book a berth")} intro={problem ? t("Choose your dates and boat length to see free berths.") : tn(nights, "{n} night, {from} to {to}, for a {ft} ft boat.", "{n} nights, {from} to {to}, for a {ft} ft boat.", { from: fmtDate(q.start), to: fmtDate(q.end), ft: q.length })} />
      <Card className="mb-4 p-5 sm:p-6">
        <SearchForm key={`${q.marina}|${q.start}|${q.end}|${q.length}`} initial={q} compact />
      </Card>
      <TrustPoints className="mb-8" />
      {problem ? (
        <Notice tone="warning">{t(problem)}</Notice>
      ) : byMarina.length === 0 ? (
        <Card><EmptyState icon={CalendarDays} title={t("No free berths for these dates")} body={t("Try other dates or another marina, or call a dock office: they can sometimes move bookings around.")} action={<div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={() => setWaitlist(true)}>{t("Join the waitlist")}</Button><ButtonLink to="/contact">{t("Contact us")}</ButtonLink></div>} /></Card>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-3" aria-live="polite">{tn(results.length, "{n} free berth at {m} marinas", "{n} free berths at {m} marinas", { m: byMarina.length })}</p>
          {byMarina.map(([marinaId, berths]) => {
            const m = ix.marina(marinaId)!;
            const open = expanded[marinaId];
            return (
              <Card key={marinaId} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <div>
                    <Link to={`/marinas/${m.id}`} className="text-[17px] font-medium hover:underline">{m.name}</Link>
                    <p className="text-xs text-ink-3">{ix.city(m.cityId)?.name}, {t(stateOf(db, m))}</p>
                  </div>
                  <Badge tone="success">{tn(berths.length, "{n} berth free", "{n} berths free")}</Badge>
                </div>
                <ul>{(open ? berths : berths.slice(0, SHOWN_PER_MARINA)).map((b) => <BerthRow key={b.id} berth={b} start={q.start} end={q.end} length={q.length} best={b.id === cheapest} />)}</ul>
                {berths.length > SHOWN_PER_MARINA && (
                  <button type="button" onClick={() => setExpanded((s) => ({ ...s, [marinaId]: !open }))} className="w-full border-t border-line px-5 py-3 text-[13px] font-semibold text-green-text hover:bg-row-hover cursor-pointer">
                    {open ? t("Show fewer") : tn(berths.length - SHOWN_PER_MARINA, "Show {n} more berth", "Show {n} more berths")}
                  </button>
                )}
              </Card>
            );
          })}
          <p className="pt-2 text-[13px] text-ink-3">{t("Is the marina you want full on these dates?")} <button type="button" onClick={() => setWaitlist(true)} className="font-semibold text-green-text hover:underline cursor-pointer">{t("Join its waitlist")}</button></p>
        </div>
      )}
      {waitlist && <WaitlistDialog marinaId={q.marina} start={q.start} end={q.end} length={Number(q.length)} onClose={() => setWaitlist(false)} />}
    </Container>
  );
}

export function Checkout() {
  const { db, ix, owner, update, toast } = useStore();
  usePageTitle(t("Confirm your booking"));
  const nav = useNavigate();
  const [params] = useSearchParams();
  const berth = ix.berth(params.get("berth") ?? "");
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const length = Number(params.get("length")) || 0;
  const boats = db.boats.filter((b) => b.ownerId === owner?.id);
  const fitting = berth ? boats.filter((b) => b.length <= berth.maxLength) : [];
  const [boatId, setBoatId] = useState(fitting[0]?.id ?? "new");
  const [newBoat, setNewBoat] = useState({ name: "", type: BOAT_TYPES[0], length: String(length || ""), registration: "" });
  const [guests, setGuests] = useState("2");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const back = `/book?${new URLSearchParams({ marina: berth?.marinaId ?? "", start, end, length: String(length) })}`;
  const problem = searchProblem({ start, end, length: length || 1 }, today());
  if (!berth || !owner || problem || !berthIsFree(db, berth.id, start, end))
    return (
      <Container className="py-16">
        <EmptyState icon={CalendarDays} title={t("This berth isn't available any more")} body={problem ? t(problem) : t("Someone may have just booked it. Search again to see what's free.")} action={<ButtonLink to={back} variant="primary">{t("Back to results")}</ButtonLink>} />
      </Container>
    );
  const marina = ix.marina(berth.marinaId)!;
  const price = quote(db, berth, start, end);
  const nights = daysBetween(start, end);

  const submit = () => {
    const e: Record<string, string> = {};
    if (boatId === "new") {
      if (!newBoat.name.trim()) e.name = t("Enter your boat's name.");
      const len = Number(newBoat.length);
      if (!(len > 0)) e.length = t("Enter your boat's length in feet.");
      else if (len > berth.maxLength) e.length = t("This berth takes boats up to {ft} ft.", { ft: berth.maxLength });
    }
    const g = Number(guests);
    if (!(g >= 1 && g <= 12)) e.guests = t("Between 1 and 12 people.");
    if (!agree) e.agree = t("Please agree to the berth rules to book.");
    setErrors(e);
    if (Object.keys(e).length) return;
    let d = db;
    let id = boatId;
    if (boatId === "new") {
      const saved = withBoat(d, owner.id, { name: newBoat.name.trim(), type: newBoat.type, length: Number(newBoat.length), registration: newBoat.registration.trim() });
      d = saved.db;
      id = saved.boat.id;
    }
    const r = withOnlineBooking(d, { boatId: id, berthId: berth.id, start, end, guests: g, now: today(), at: stamp() });
    if (r.error || !r.booking) return setError(t(r.error ?? "Something went wrong. Try again."));
    update(() => r.db);
    toast(t("Booking {code} sent to {marina}", { code: r.booking.code, marina: marina.name }));
    nav(`/account/bookings?new=${r.booking.code}`);
  };

  return (
    <Container className="py-12">
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"><ArrowLeft className={`size-4 ${flip(ArrowLeft) ?? ""}`} aria-hidden /> {t("Back to results")}</Link>
      <h1 className="mt-6 mb-8 text-[32px] leading-10 font-medium">{t("Confirm your booking")}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-[17px] font-medium">{t("Your boat")}</h2>
            <div role="radiogroup" aria-label={t("Your boat")} className="mt-4 space-y-2">
              {fitting.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-line px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-sidebar">
                  <input type="radio" name="boat" checked={boatId === b.id} onChange={() => setBoatId(b.id)} className="accent-[var(--primary)]" />
                  <Ship className="size-4 text-ink-3" aria-hidden />
                  <span className="flex-1"><span className="font-medium">{b.name}</span> <span className="text-[13px] text-ink-3">· {t(b.type)} · <span className="num">{ftM(b.length)}</span></span></span>
                </label>
              ))}
              {boats.length > fitting.length && <p className="px-1 text-xs text-ink-3">{tn(boats.length - fitting.length, "{n} of your boats is too long for this berth.", "{n} of your boats are too long for this berth.")}</p>}
              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-line px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-sidebar">
                <input type="radio" name="boat" checked={boatId === "new"} onChange={() => setBoatId("new")} className="accent-[var(--primary)]" />
                <span className="font-medium">{fitting.length ? t("A different boat") : t("Add your boat")}</span>
              </label>
            </div>
            {boatId === "new" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("Boat name")} error={errors.name}>{(id) => <Input id={id} value={newBoat.name} onChange={(e) => setNewBoat((s) => ({ ...s, name: e.target.value }))} />}</Field>
                <Field label={t("Type")}>{(id) => <Select id={id} value={newBoat.type} onChange={(e) => setNewBoat((s) => ({ ...s, type: e.target.value as BoatType }))}>{BOAT_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}</Select>}</Field>
                <Field label={t("Length (ft)")} error={errors.length}>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} value={newBoat.length} onChange={(e) => setNewBoat((s) => ({ ...s, length: e.target.value }))} />}</Field>
                <Field label={t("Registration")} hint={t("Optional")}>{(id) => <Input id={id} value={newBoat.registration} onChange={(e) => setNewBoat((s) => ({ ...s, registration: e.target.value }))} />}</Field>
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-[17px] font-medium">{t("Stay details")}</h2>
            <div className="mt-4 max-w-48">
              <Field label={t("People on board")} error={errors.guests}>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={12} value={guests} onChange={(e) => setGuests(e.target.value)} />}</Field>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-ink-2">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" aria-invalid={!!errors.agree} />
              <span>{t("I agree to the marina's berth rules: check in at the dock office on arrival, keep the berth clear on departure, and pay the invoice by its due date.")}</span>
            </label>
            {errors.agree && <p className="mt-2 text-xs font-medium text-error-fg">{errors.agree}</p>}
            <p className="mt-3 text-xs text-ink-3">
              <Link to="/terms" target="_blank" className="font-medium text-ink-2 underline">{t("Terms of use and booking")}</Link> · <Link to="/privacy" target="_blank" className="font-medium text-ink-2 underline">{t("Privacy policy")}</Link>
            </p>
          </Card>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">{t("Send booking request")}</Button>
          <p className="text-xs text-ink-3">{t("Nothing is charged now. {marina} confirms your booking and sends the invoice.", { marina: marina.name })}</p>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <p className="text-xs text-ink-3">{ix.city(marina.cityId)?.name}, {t(stateOf(db, marina))}</p>
            <p className="mt-1 text-[17px] font-medium">{marina.name}</p>
            <dl className="mt-5 space-y-3 text-[13px]">
              <div className="flex justify-between gap-4"><dt className="text-ink-3">{t("Berth")}</dt><dd className="font-medium">{berth.code} · {t("up to {ft} ft", { ft: berth.maxLength })}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">{t("Arrive")}</dt><dd>{fmtDate(start)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">{t("date|Leave")}</dt><dd>{fmtDate(end)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">{t("Nights")}</dt><dd className="num">{nights}</dd></div>
            </dl>
            <div className="mt-5 border-t border-line pt-5">
              <div className="flex items-baseline justify-between"><span className="text-[15px] font-medium">{t("Total")}</span><span className="num text-[22px] font-semibold">{money(price, ix.curOfBerth(berth.id))}</span></div>
              <p className="mt-1 text-xs text-ink-3">{priceNote(start, end, db.settings.monthlyFromNights, db.settings.pricing)}</p>
              <p className="mt-3 text-xs text-ink-3">{t("Power, water and fuel you use are added to the invoice.")}</p>
            </div>
          </Card>
          <Card className="mt-4 p-6">
            <h2 className="text-[15px] font-medium">{t("What happens next")}</h2>
            <ol className="mt-3 space-y-2 text-[13px] leading-5 text-ink-2">
              <li className="flex gap-2"><span className="num font-semibold text-ink">1.</span>{t("{marina} checks the berth is right for your boat and confirms, usually within one business day.", { marina: marina.name })}</li>
              <li className="flex gap-2"><span className="num font-semibold text-ink">2.</span>{t("You get the invoice by email and in your account. Pay online or at the dock office.")}</li>
              <li className="flex gap-2"><span className="num font-semibold text-ink">3.</span>{t("Check in at the dock office when you arrive.")}</li>
            </ol>
            <TrustPoints compact className="mt-4 flex-col" />
            {marina.phone && <p className="mt-4 text-xs text-ink-3">{t("Questions? Call the dock office on {phone}.", { phone: marina.phone })}</p>}
          </Card>
        </aside>
      </div>
    </Container>
  );
}
