// Home: find a berth, what Marina is, the owner's account and app, stay lengths, our marinas,
// how booking works, reviews and questions people ask.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, ArrowRight, BadgeCheck, CalendarCheck, ChevronDown, CircleCheck, FileSignature, Receipt, Search, Wallet } from "lucide-react";
import { CONTACT, CONTRACT_TERMS, cx, ftM, lowestRate, marinaPoint, money, t, tn } from "@marina/shared";
import { useStore } from "@/data/store";
import { useReviews } from "@/data/reviews";
import { Map, type MapMarker } from "@/components/Map";
import { MarinaCard } from "@/components/MarinaCard";
import { SearchForm } from "@/components/SearchForm";
import { AppCard } from "@/components/GetTheApp";
import { BrowserFrame, PhoneFrame } from "@/components/Frames";
import { ReviewCard, ReviewsSection } from "@/components/Reviews";
import { freeTonight, TrustPoints } from "@/components/Trust";
import { ButtonLink, Container, Eyebrow, usePageTitle } from "@/components/ui";
import { Img, PHOTOS, Shot, type ShotName } from "@/lib/photos";
import { marinaFacts, openMarinas, termFee } from "@/lib/marinas";
import { faqs, homeMeta } from "@/lib/seo";

/** Section heading in the site's large style. */
function Heading({ id, eyebrow, title, intro, center }: { id?: string; eyebrow?: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-[32px] leading-10 font-medium tracking-[-0.01em] sm:text-[40px] sm:leading-[48px]">{title}</h2>
      {intro && <p className="mt-4 text-[15px] leading-6 text-ink-2">{intro}</p>}
    </div>
  );
}

function Hero() {
  const { db, ix } = useStore();
  const marinas = openMarinas(db);
  const countries = new Set(marinas.map((m) => ix.countyOfCity(m.cityId)?.country ?? "US"));
  const from = lowestRate(db, marinas);
  // Three marinas with the most berths free tonight, from the bookings.
  const free = marinas.map((m) => ({ m, n: freeTonight(db, m.id) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  return (
    <section className="hero-bg overflow-hidden border-b border-line">
      <Container className="pt-14 text-center sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1 text-xs font-medium text-ink-2 backdrop-blur">
          <span className="size-1.5 rounded-full bg-green" aria-hidden />
          {t("{n} marinas in {c} countries", { n: marinas.length, c: countries.size })}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-[44px] leading-[50px] font-medium tracking-[-0.03em] text-balance sm:text-[64px] sm:leading-[70px] lg:text-[76px] lg:leading-[82px]">{t("Your berth, booked in minutes.")}</h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-7 text-ink-2">{t("See which berths are free for your dates and boat, check the price, and book online. Stay a night, a season or the whole year.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/book" variant="primary" size="lg" icon={ArrowRight}>{t("Book a berth")}</ButtonLink>
          <ButtonLink to="/marinas" size="lg">{t("See all marinas")}</ButtonLink>
        </div>
      </Container>

      <Container className="mt-12 text-start">
        <div className="mx-auto max-w-5xl rounded-[20px] border border-line bg-surface p-5 shadow-e2 sm:p-6">
          <SearchForm />
          <TrustPoints className="mt-4" />
        </div>
      </Container>

      <Container className="relative mt-12 pb-16 sm:pb-20">
        <div className="relative mx-auto max-w-6xl">
          <div className="aspect-[4/3] overflow-hidden rounded-[28px] border border-line shadow-e2 sm:aspect-[16/8]">
            <Img photo={PHOTOS.dawn} eager sizes="(min-width: 1152px) 1152px, 100vw" />
          </div>
          {free.length > 0 && (
            <div className="float-slow absolute start-4 top-4 w-[250px] rounded-[16px] border border-line bg-surface/95 p-4 text-start shadow-e3 backdrop-blur sm:start-6 sm:top-6 lg:-start-8 lg:top-10">
              <p className="text-label text-ink-3">{t("Free tonight")}</p>
              <ul className="mt-3 space-y-2.5">
                {free.map(({ m, n }) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block text-xs text-ink-3">{ix.city(m.cityId)?.name}</span></span>
                    <span className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-fg">{tn(n, "{n} free", "{n} free")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="float-slower absolute end-4 bottom-4 hidden w-[240px] rounded-[16px] border border-line bg-surface/95 p-4 text-start shadow-e3 backdrop-blur sm:block sm:end-6 sm:bottom-6 lg:end-auto lg:start-[32%] lg:-bottom-8">
            <p className="flex items-center gap-2 text-[13px] font-medium"><span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-accent"><Wallet className="size-4" aria-hidden /></span>{t("Nightly rates from")}</p>
            <p className="num mt-2 text-[28px] leading-9 font-medium">{money(from.amount, from.currency)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><CircleCheck className="size-3.5 text-green" aria-hidden />{t("No booking fees")}</p>
          </div>
          <PhoneFrame className="float-slower absolute -end-6 top-10 hidden w-[210px] lg:block xl:-end-12">
            <Shot name="appBook" />
          </PhoneFrame>
        </div>
      </Container>
    </section>
  );
}

/** The places we have marinas, in large muted type (like a logo strip). */
function Places() {
  const { db, ix } = useStore();
  const cities = [...new Set(openMarinas(db).map((m) => ix.city(m.cityId)?.name ?? ""))].filter(Boolean);
  return (
    <section aria-labelledby="places" className="border-b border-line">
      <Container className="py-10">
        <h2 id="places" className="text-label text-center text-ink-3">{t("Berths in")}</h2>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[18px] font-medium tracking-[-0.01em] text-ink-3 sm:text-[22px]">
          {cities.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </Container>
    </section>
  );
}

function About() {
  const { db } = useStore();
  const marinas = openMarinas(db);
  const berths = db.berths.filter((b) => marinas.some((m) => m.id === b.marinaId)).length;
  const from = lowestRate(db, marinas);
  const longest = Math.max(...marinas.map((m) => marinaFacts(db, m.id).maxLength));
  const stats: [string, string, string][] = [
    ["01", t("Marinas"), String(marinas.length)],
    ["02", t("Berths"), String(berths)],
    ["03", t("Boats up to"), ftM(longest)],
  ];
  return (
    <section aria-labelledby="about" className="py-20 sm:py-28">
      <Container>
        <Eyebrow>{t("About Marina")}</Eyebrow>
        <h2 id="about" className="sr-only">{t("About Marina")}</h2>
        <p className="max-w-4xl text-[28px] leading-9 font-medium tracking-[-0.02em] sm:text-[40px] sm:leading-[50px]">
          <span className="text-ink-3">{t("Marina looks after {n} marinas in the United States, the UAE and across the Gulf.", { n: marinas.length })}</span>{" "}
          <span className="text-ink">{t("Find a berth that fits your boat, book it online and keep every stay, invoice and contract in one place.")}</span>
        </p>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-footer bg-squares-dark relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-[20px] p-6 text-on-footer">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/10"><Anchor className="size-5" aria-hidden /></span>
            <p className="text-[20px] leading-7 font-medium">{t("A berth for a night, a season or the whole year.")}</p>
          </div>
          {stats.map(([n, label, value]) => (
            <div key={n} className="flex min-h-[240px] flex-col justify-between rounded-[20px] border border-line bg-surface p-6">
              <p className="text-[13px] text-ink-3"><span className="num me-2 rounded-[6px] bg-success-bg px-1.5 py-0.5 text-xs font-semibold text-success-fg">{n}</span>{label}</p>
              <p className="num text-[48px] leading-[56px] font-medium tracking-[-0.02em]">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-ink-3">{t("Nightly rates from {price}. No booking fees.", { price: money(from.amount, from.currency) })}</p>
      </Container>
    </section>
  );
}

interface Feature { id: string; label: string; title: string; body: string; shot: ShotName; pills: string[] }

const features = (): Feature[] => [
  { id: "search", label: t("Search and book"), title: t("Only berths your boat fits"), body: t("Enter your dates and boat length. You'll see every berth that's free for the whole stay, with the exact price, and book it in a minute."), shot: "results", pills: [t("Free for your whole stay"), t("Exact price before you book")] },
  { id: "account", label: t("Your account"), title: t("Every stay in one place"), body: t("Your next stay, what you owe, contracts to sign and your booking history, always up to date."), shot: "account", pills: [t("Next stay and directions"), t("Bookings, past and upcoming")] },
  { id: "pay", label: t("Pay online"), title: t("Pay invoices when it suits you"), body: t("The marina sends the invoice once your booking is confirmed. Pay it online in full or in part, and download the receipt."), shot: "invoice", pills: [t("Pay in full or in part"), t("Receipts straight away")] },
  { id: "sign", label: t("Sign contracts"), title: t("Seasonal and annual contracts, signed online"), body: t("Read your berth contract and sign it from your account. We'll remind you before it's time to renew."), shot: "contract", pills: [t("Signed in a minute"), t("Renewal reminders")] },
];

function Features() {
  const [tab, setTab] = useState(0);
  const FEATURES = features();
  const f = FEATURES[tab];
  const onKey = (e: React.KeyboardEvent) => {
    const rtl = document.documentElement.dir === "rtl";
    const step = { ArrowDown: 1, ArrowRight: rtl ? -1 : 1, ArrowUp: -1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (tab + step + FEATURES.length) % FEATURES.length;
    setTab(next);
    document.getElementById(`feature-tab-${FEATURES[next].id}`)?.focus();
  };
  return (
    <section aria-labelledby="features" className="pb-20 sm:pb-28">
      <Container>
        <Heading id="features" eyebrow={t("For boat owners")} title={t("Everything about your stay, in one place")} intro={t("Book online, then keep your bookings, invoices and contracts together in your account.")} center />
        <div role="tablist" aria-label={t("For boat owners")} onKeyDown={onKey} className="no-scrollbar mx-auto mt-10 flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface-2 p-1 sm:w-fit">
          {FEATURES.map((x, i) => (
            <button key={x.id} id={`feature-tab-${x.id}`} role="tab" type="button" aria-selected={tab === i} aria-controls={`feature-panel-${x.id}`} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)}
              className={cx("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer", tab === i ? "bg-primary text-on-primary" : "text-ink-2 hover:text-ink")}>
              {x.label}
            </button>
          ))}
        </div>
        <div id={`feature-panel-${f.id}`} role="tabpanel" aria-labelledby={`feature-tab-${f.id}`} className="bg-squares mt-8 grid items-center gap-10 overflow-hidden rounded-[28px] border border-line bg-surface-2 p-6 sm:p-10 lg:grid-cols-[1fr_1.6fr] lg:p-14">
          <div>
            <h3 className="text-[24px] leading-8 font-medium">{f.title}</h3>
            <p className="mt-3 text-[15px] leading-6 text-ink-2">{f.body}</p>
            <ul className="mt-6 space-y-2">
              {f.pills.map((p) => <li key={p} className="flex items-center gap-2 text-[13px] font-medium"><CircleCheck className="size-4 text-green" aria-hidden />{p}</li>)}
            </ul>
          </div>
          <BrowserFrame key={f.id} className="animate-in">
            <Shot name={f.shot} />
          </BrowserFrame>
        </div>
      </Container>
    </section>
  );
}

function Promos() {
  const { owner } = useStore();
  return (
    <Container className="grid gap-4 pb-20 sm:pb-28 lg:grid-cols-2">
      <section aria-labelledby="owners" className="bg-footer bg-squares-dark relative flex flex-col overflow-hidden rounded-[28px] p-8 text-on-footer sm:p-10">
        <p className="text-label mb-3 text-on-footer-2">{t("Your account")}</p>
        <h2 id="owners" className="max-w-sm text-[28px] leading-9 font-medium sm:text-[32px] sm:leading-10">{t("Everything about your stays, in one place")}</h2>
        <p className="mt-3 max-w-md text-[15px] text-on-footer-2">{t("Your account keeps your bookings, invoices and receipts together. Pay online, sign your berth contract and keep your boat's details up to date.")}</p>
        <ul className="mt-6 grid gap-2 text-[13px] sm:grid-cols-2">
          {[[Receipt, t("Invoices and receipts")], [FileSignature, t("Sign contracts")]].map(([Icon, text]) => {
            const I = Icon as typeof Receipt;
            return <li key={text as string} className="flex items-center gap-2"><I className="size-4 text-on-footer-2" aria-hidden />{text as string}</li>;
          })}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          {owner ? (
            <ButtonLink to="/account" className="border-transparent bg-on-footer text-footer hover:bg-on-footer/90">{t("Go to my account")}</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/register" className="border-transparent bg-on-footer text-footer hover:bg-on-footer/90">{t("Create an account")}</ButtonLink>
              <ButtonLink to="/sign-in" className="border-footer-line bg-transparent text-on-footer hover:bg-white/5">{t("Sign in")}</ButtonLink>
            </>
          )}
        </div>
        <div className="mt-10 -mb-24 sm:-me-24">
          <BrowserFrame><Shot name="account" /></BrowserFrame>
        </div>
      </section>
      <AppCard />
    </Container>
  );
}

function StayLengths() {
  const { db } = useStore();
  const marinas = openMarinas(db);
  const fromDaily = lowestRate(db, marinas);
  const fromMonthly = lowestRate(db, marinas, "monthly");
  const items = [
    { photo: PHOTOS.dock, title: t("A night or a week"), price: t("from {price} a night", { price: money(fromDaily.amount, fromDaily.currency) }), body: t("Pay the berth's nightly rate. Stays of {n} nights or more are charged at the monthly rate.", { n: db.settings.monthlyFromNights }), to: "/book", cta: t("Find a berth") },
    { photo: PHOTOS.aerial, title: t("A season"), price: t("from {price} a month", { price: money(termFee(fromMonthly.amount, "seasonal"), fromMonthly.currency) }), body: t("Keep the same berth for six months for {pct}% off the monthly rate.", { pct: CONTRACT_TERMS.seasonal.discount * 100 }), to: "/contact?topic=contract", cta: t("Ask about a contract") },
    { photo: PHOTOS.harbor, title: t("The whole year"), price: t("from {price} a month", { price: money(termFee(fromMonthly.amount, "annual"), fromMonthly.currency) }), body: t("Our best value: twelve months in the same berth for {pct}% off.", { pct: CONTRACT_TERMS.annual.discount * 100 }), to: "/pricing", cta: t("See rates and contracts") },
  ];
  return (
    <section aria-labelledby="stays" className="border-t border-line py-20 sm:py-28">
      <Container>
        <Heading id="stays" eyebrow={t("Rates and fees")} title={t("Stay a night, a season or the whole year")} />
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line rtl:md:divide-x-reverse">
          {items.map((x, i) => (
            <li key={x.title} className={cx("flex flex-col", i > 0 && "md:ps-8", i < 2 && "md:pe-8")}>
              <div className="aspect-[4/3] overflow-hidden rounded-[20px]"><Img photo={x.photo} sizes="(min-width: 768px) 33vw, 100vw" /></div>
              <h3 className="mt-6 text-[20px] leading-7 font-medium">{x.title}</h3>
              <p className="num mt-1 text-[15px] font-semibold text-green-text">{x.price}</p>
              <p className="mt-3 flex-1 text-[14px] leading-6 text-ink-2">{x.body}</p>
              <ButtonLink to={x.to} icon={ArrowRight} size="sm" className="mt-6 self-start">{x.cta}</ButtonLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function OurMarinas() {
  const { db, ix } = useStore();
  const nav = useNavigate();
  const marinas = openMarinas(db);
  const markers: MapMarker[] = marinas.flatMap((m) => {
    const p = marinaPoint(m, ix.city(m.cityId));
    return p ? [{ id: m.id, ...p, label: `${m.name}, ${ix.city(m.cityId)?.name}` }] : [];
  });
  return (
    <section aria-labelledby="marinas" className="border-t border-line py-20 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Heading id="marinas" eyebrow={t("Where to stay")} title={t("Our marinas")} />
          <ButtonLink to="/marinas" icon={ArrowRight}>{t("See all marinas")}</ButtonLink>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marinas.slice(0, 6).map((m) => <MarinaCard key={m.id} marina={m} />)}
        </div>
        <div className="mt-6">
          <Map label={t("Map of marinas")} markers={markers} height={420} zoom={11} onSelect={(id) => nav(`/marinas/${id}`)} />
          <p className="mt-2 text-xs text-ink-3">{t("Click a marina to see its berths and rates. Numbered pins hold several marinas.")}</p>
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps: [typeof Search, string, string][] = [
    [Search, t("Search"), t("Pick your dates and enter your boat's length. You'll only see berths your boat fits and that are free the whole time.")],
    [CalendarCheck, t("Book"), t("Choose a berth and send the request. The marina confirms it, usually within one business day, and emails your invoice.")],
    [Anchor, t("Arrive"), t("Check in at the dock office. Your bookings, invoices and receipts are always in your account.")],
  ];
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 border-t border-line py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.25fr]">
        <div>
          <Heading id="how-title" eyebrow={t("How it works")} title={t("Three steps to the water")} />
          <ol className="mt-10 space-y-8">
            {steps.map(([Icon, title, body], i) => (
              <li key={title} className="flex gap-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent"><Icon className="size-5" aria-hidden /></span>
                <span>
                  <span className="block text-[17px] font-medium"><span className="num me-1.5 text-ink-3">{String(i + 1).padStart(2, "0")}</span>{title}</span>
                  <span className="mt-1.5 block text-[14px] leading-6 text-ink-2">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <figure className="bg-squares rounded-[28px] border border-line bg-surface-2 p-5 sm:p-8">
          <BrowserFrame>
            <Shot name="office" />
          </BrowserFrame>
          <figcaption className="mt-4 flex items-start gap-2 text-[13px] text-ink-2"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-green" aria-hidden />{t("Your request goes straight to the dock office, where the team confirms it and sends your invoice.")}</figcaption>
        </figure>
      </Container>
    </section>
  );
}

function Faq() {
  const { db } = useStore();
  return (
    <section aria-labelledby="faq" className="border-t border-line py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>{t("Before you book")}</Eyebrow>
          <h2 id="faq" className="scroll-mt-24 text-[32px] leading-10 font-medium tracking-[-0.01em] sm:text-[40px] sm:leading-[48px]">{t("Questions people ask")}</h2>
          <p className="mt-4 max-w-sm text-[15px] text-ink-2">{t("Still not sure? Call us on {phone} and we'll find you a berth.", { phone: CONTACT.phone })}</p>
          <ButtonLink to="/book" variant="primary" icon={Search} className="mt-6">{t("Find a berth")}</ButtonLink>
        </div>
        <div className="divide-y divide-line rounded-[20px] border border-line bg-surface">
          {faqs(db).map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-[14px] leading-6 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCta() {
  const review = useReviews().find((r) => r.rating === 5);
  return (
    <Container className="pb-20 sm:pb-28">
      <section aria-labelledby="cta" className="hero-bg grid overflow-hidden rounded-[28px] border border-line lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <h2 id="cta" className="text-[36px] leading-[44px] font-medium tracking-[-0.02em] sm:text-[48px] sm:leading-[56px]">{t("Ready for the water?")}</h2>
          <p className="mt-4 max-w-md text-[15px] text-ink-2">{t("Find a free berth for your dates in under a minute. Nothing to pay until the marina confirms.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/book" variant="primary" size="lg" icon={ArrowRight}>{t("Book a berth")}</ButtonLink>
            <ButtonLink to="/contact" size="lg">{t("Contact us")}</ButtonLink>
          </div>
        </div>
        <div className="relative min-h-[320px]">
          <Img photo={PHOTOS.jetty} sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0" />
          {review && (
            <div className="float-slow absolute inset-x-4 bottom-4 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-[320px] [&_figure]:shadow-e3">
              <ReviewCard review={review} />
            </div>
          )}
        </div>
      </section>
    </Container>
  );
}

export function Home() {
  const { db } = useStore();
  usePageTitle(undefined, homeMeta(db, window.location.origin));
  return (
    <>
      <Hero />
      <Places />
      <About />
      <Features />
      <Promos />
      <StayLengths />
      <OurMarinas />
      <HowItWorks />
      <section className="border-t border-line py-20 sm:py-28">
        <Container>
          <ReviewsSection eyebrow={t("Reviews")} title={t("What boat owners say")} />
        </Container>
      </section>
      <Faq />
      <FinalCta />
    </>
  );
}
