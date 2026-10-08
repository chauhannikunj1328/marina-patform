// Home: find a berth, the marinas on a map, how booking works, and the owner portal.
import { useNavigate } from "react-router-dom";
import { Anchor, ArrowRight, CalendarCheck, ChevronDown, CreditCard, FileSignature, Receipt, Search, Ship } from "lucide-react";
import { CONTACT, CONTRACT_TERMS, marinaPoint, money, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Map, type MapMarker } from "@/components/Map";
import { MarinaCard } from "@/components/MarinaCard";
import { SearchForm } from "@/components/SearchForm";
import { GetTheApp } from "@/components/GetTheApp";
import { TrustPoints } from "@/components/Trust";
import { ButtonLink, Card, Container, Eyebrow, usePageTitle } from "@/components/ui";
import { marinaFacts, openMarinas, stateOf } from "@/lib/marinas";
import { faqs, homeMeta } from "@/lib/seo";

export function Home() {
  const { db, ix, owner } = useStore();
  const nav = useNavigate();
  usePageTitle(undefined, homeMeta(db, window.location.origin));
  const marinas = openMarinas(db);
  const states = [...new Set(marinas.map((m) => stateOf(db, m)))];
  const berths = db.berths.filter((b) => marinas.some((m) => m.id === b.marinaId)).length;
  const from = Math.min(...marinas.map((m) => marinaFacts(db, m.id).fromDaily));
  const markers: MapMarker[] = marinas.flatMap((m) => {
    const p = marinaPoint(m, ix.city(m.cityId));
    return p ? [{ id: m.id, ...p, label: `${m.name}, ${ix.city(m.cityId)?.name}` }] : [];
  });
  const annual = CONTRACT_TERMS.annual.discount * 100;

  return (
    <>
      <section className="hero-bg border-b border-line">
        <Container className="pt-16 pb-12 sm:pt-24 sm:pb-16">
          <Eyebrow>{t("{n} marinas · {states}", { n: marinas.length, states: states.map((s) => t(s)).join(" · ") })}</Eyebrow>
          <h1 className="max-w-3xl text-[40px] leading-[48px] font-medium tracking-[-0.02em] sm:text-[56px] sm:leading-[64px]">{t("Your berth, booked in minutes.")}</h1>
          <p className="mt-5 max-w-xl text-[17px] leading-7 text-ink-2">{t("See which berths are free for your dates and boat, check the price, and book online. Stay a night, a season or the whole year.")}</p>
          <Card className="mt-10 p-5 shadow-e2 sm:p-6">
            <SearchForm />
          </Card>
          <TrustPoints className="mt-5" />
        </Container>
      </section>

      <Container>
        <dl className="grid grid-cols-2 gap-6 border-b border-line py-10 sm:grid-cols-4">
          {[
            [t("Marinas"), String(marinas.length)],
            [t("Berths"), String(berths)],
            [t("States"), String(states.length)],
            [t("Nightly rates from"), money(from)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] text-ink-3">{label}</dt>
              <dd className="num mt-1 text-[32px] leading-10 font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{t("Where to stay")}</Eyebrow>
              <h2 className="text-[28px] leading-9 font-medium">{t("Our marinas")}</h2>
            </div>
            <ButtonLink to="/marinas" icon={ArrowRight}>{t("See all marinas")}</ButtonLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {marinas.slice(0, 6).map((m) => <MarinaCard key={m.id} marina={m} />)}
          </div>
          <div className="mt-6">
            <Map label={t("Map of marinas")} markers={markers} height={420} zoom={11} onSelect={(id) => nav(`/marinas/${id}`)} />
            <p className="mt-2 text-xs text-ink-3">{t("Click a marina to see its berths and rates. Numbered pins hold several marinas.")}</p>
          </div>
        </section>

        <section className="border-t border-line py-16">
          <Eyebrow>{t("How it works")}</Eyebrow>
          <h2 className="text-[28px] leading-9 font-medium">{t("Three steps to the water")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [Search, t("Search"), t("Pick your dates and enter your boat's length. You'll only see berths your boat fits and that are free the whole time.")],
              [CalendarCheck, t("Book"), t("Choose a berth and send the request. The marina confirms it, usually within one business day, and emails your invoice.")],
              [Anchor, t("Arrive"), t("Check in at the dock office. Your bookings, invoices and receipts are always in your account.")],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof Search;
              return (
                <li key={i} className="rounded-[16px] border border-line p-6">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-on-accent"><I className="size-5" aria-hidden /></span>
                  <p className="mt-5 text-[17px] font-medium"><span className="num text-ink-3">{i + 1}.</span> {title as string}</p>
                  <p className="mt-2 text-[13px] leading-5 text-ink-2">{body as string}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </Container>

      <section className="bg-promo border-y border-line">
        <Container className="grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("For boat owners")}</Eyebrow>
            <h2 className="text-[28px] leading-9 font-medium text-ink">{t("Everything about your stays, in one place")}</h2>
            <p className="mt-3 max-w-md text-[15px] text-ink-2">{t("Your account keeps your bookings, invoices and receipts together. Pay online, sign your berth contract and keep your boat's details up to date.")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {owner ? <ButtonLink to="/account" variant="primary">{t("Go to my account")}</ButtonLink> : (
                <>
                  <ButtonLink to="/register" variant="primary">{t("Create an account")}</ButtonLink>
                  <ButtonLink to="/sign-in">{t("Sign in")}</ButtonLink>
                </>
              )}
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [Receipt, t("Invoices and receipts"), t("See what you owe and download receipts.")],
              [CreditCard, t("Pay online"), t("Pay an invoice in full or in part.")],
              [FileSignature, t("Sign contracts"), t("Read and sign your berth contract online.")],
              [Ship, t("Your boats"), t("Keep names, lengths and registrations current.")],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Receipt;
              return (
                <li key={title as string} className="rounded-[16px] bg-surface p-5 shadow-e1">
                  <I className="size-5 text-secondary" aria-hidden />
                  <p className="mt-3 text-[15px] font-medium">{title as string}</p>
                  <p className="mt-1 text-[13px] leading-5 text-ink-3">{body as string}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <GetTheApp />

      <Container className="pt-16">
        <section aria-labelledby="faq" className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>{t("Before you book")}</Eyebrow>
            <h2 id="faq" className="text-[28px] leading-9 font-medium">{t("Questions people ask")}</h2>
            <p className="mt-3 max-w-sm text-[15px] text-ink-2">{t("Still not sure? Call us on {phone} and we'll find you a berth.", { phone: CONTACT.phone })}</p>
            <ButtonLink to="/book" variant="primary" icon={Search} className="mt-6">{t("Find a berth")}</ButtonLink>
          </div>
          <div className="divide-y divide-line rounded-[16px] border border-line">
            {faqs(db).map((f) => (
              <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 text-[13px] leading-6 text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Container>

      <Container className="py-16">
        <Card className="flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="max-w-xl">
            <h2 className="text-[22px] leading-[30px] font-medium">{t("Staying longer?")}</h2>
            <p className="mt-2 text-[15px] text-ink-2">{t("Stays of {n} nights or more are charged at the monthly rate. Seasonal and annual contracts save up to {pct}%.", { n: db.settings.monthlyFromNights, pct: annual })}</p>
          </div>
          <ButtonLink to="/pricing" variant="primary" icon={ArrowRight}>{t("See rates and contracts")}</ButtonLink>
        </Card>
      </Container>
    </>
  );
}
