// Company pages: About us, Services and amenities, Long-term berths and the Help centre.
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Anchor, ArrowRight, BadgeCheck, CalendarRange, ChevronDown, Droplet, FileSignature, Fuel, Mail, MessageSquare, Phone, Plug, Recycle, RefreshCw, Search, ShieldCheck, ShowerHead, SquareParking, WashingMachine, Wifi } from "lucide-react";
import { CONTRACT_TERMS, DEFAULT_UTILITIES, lowestRate, money, money2, officesFor, RENEWAL_NOTICE_DAYS, SERVICES, t, telLink, type ContractTerm } from "@marina/shared";
import { useStore } from "@/data/store";
import { Badge, ButtonLink, Card, Container, Eyebrow, PageHero, usePageTitle } from "@/components/ui";
import { openMarinas, stateOf, termFee } from "@/lib/marinas";
import { aboutMeta, helpMeta, helpTopics, longTermMeta, servicesMeta } from "@/lib/seo";

const h2 = "text-[28px] leading-9 font-medium tracking-[-0.01em] sm:text-[32px] sm:leading-10";

/** A closing band: book or get in touch. */
function NextSteps({ title, body }: { title: string; body: string }) {
  return (
    <Container className="pb-20">
      <section className="hero-bg flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[28px] border border-line p-8 sm:p-12">
        <div className="max-w-xl">
          <h2 className={h2}>{title}</h2>
          <p className="mt-3 text-[15px] text-ink-2">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/book" variant="primary" size="lg" icon={ArrowRight}>{t("Book a berth")}</ButtonLink>
          <ButtonLink to="/contact" size="lg">{t("Contact us")}</ButtonLink>
        </div>
      </section>
    </Container>
  );
}

function Offices() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {officesFor().map((o) => (
        <Card key={o.id} className="p-6">
          <p className="text-label text-ink-3">{t(o.region)}</p>
          <a href={telLink(o.phone)} className="mt-3 flex items-center gap-2 text-[17px] font-medium hover:underline"><Phone className="size-4 text-ink-3" aria-hidden /><bdi className="num">{o.phone}</bdi></a>
          <a href={`mailto:${o.email}`} className="mt-2 flex items-center gap-2 text-[14px] text-ink-2 hover:underline"><Mail className="size-4 text-ink-3" aria-hidden /><bdi>{o.email}</bdi></a>
          <p className="mt-2 text-[13px] text-ink-3">{t(o.hours)}</p>
        </Card>
      ))}
    </div>
  );
}

// ---- About us ---------------------------------------------------------------------------------

export function About() {
  const { db, ix } = useStore();
  usePageTitle(t("About us"), aboutMeta(db, window.location.origin));
  const marinas = openMarinas(db);
  const ids = new Set(marinas.map((m) => m.id));
  const berths = db.berths.filter((b) => ids.has(b.marinaId)).length;
  const countries = new Set(marinas.map((m) => ix.countyOfCity(m.cityId)?.country ?? "US"));
  const places = [...new Set(marinas.map((m) => stateOf(db, m)))].map((s) => ({ name: s, n: marinas.filter((m) => stateOf(db, m) === s).length }));
  const stats: [string, number][] = [[t("Marinas"), marinas.length], [t("Berths"), berths], [t("Countries"), countries.size], [t("Booking offices"), officesFor().length]];
  const values: [LucideIcon, string, string][] = [
    [BadgeCheck, t("Clear prices"), t("You see the exact price before you book. No booking fees, and nothing to pay until the marina confirms.")],
    [Anchor, t("A dock office at every marina"), t("Every marina has its own team on the water. Call them directly about your berth, your boat or your stay.")],
    [RefreshCw, t("One account everywhere"), t("The same account works at every marina, on the website and in the Marina Berths app.")],
  ];
  return (
    <>
      <PageHero eyebrow={t("About us")} title={t("Berths made simple, from California to the Gulf")} intro={t("{company} runs {n} marinas in the United States, the UAE and across the Gulf. We want booking a berth to be as easy as booking a room.", { company: db.settings.company, n: marinas.length })} />
      <Container className="py-12">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([label, n]) => (
            <Card key={label} className="p-6">
              <dt className="text-label text-ink-3">{label}</dt>
              <dd className="num mt-6 text-[40px] leading-none font-medium">{n}</dd>
            </Card>
          ))}
        </dl>

        <section className="mt-20" aria-labelledby="values">
          <Eyebrow>{t("How we work")}</Eyebrow>
          <h2 id="values" className={h2}>{t("What you can count on")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {values.map(([Icon, title, body]) => (
              <Card key={title} className="p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent"><Icon className="size-5" aria-hidden /></span>
                <h3 className="mt-5 text-[17px] font-medium">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-ink-2">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="where">
          <div>
            <Eyebrow>{t("Where we are")}</Eyebrow>
            <h2 id="where" className={h2}>{t("{n} marinas in {c} countries", { n: marinas.length, c: countries.size })}</h2>
            <p className="mt-4 max-w-sm text-[15px] text-ink-2">{t("From the Pacific coast and Florida to Dubai, Doha and Muscat. Each marina charges in its own currency and keeps its own local time.")}</p>
            <ButtonLink to="/marinas" className="mt-6" icon={ArrowRight}>{t("All marinas")}</ButtonLink>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {places.map((p) => (
              <li key={p.name}>
                <Link to={`/marinas?state=${encodeURIComponent(p.name)}`} className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-3 text-[14px] font-medium hover:bg-sidebar-hover">
                  {t(p.name)}<span className="num text-ink-3">{p.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20" aria-labelledby="offices">
          <Eyebrow>{t("Talk to us")}</Eyebrow>
          <h2 id="offices" className={`${h2} mb-8`}>{t("Booking offices")}</h2>
          <Offices />
        </section>
      </Container>
      <NextSteps title={t("Ready for the water?")} body={t("Find a free berth for your dates in under a minute. Nothing to pay until the marina confirms.")} />
    </>
  );
}

// ---- Services and amenities ---------------------------------------------------------------------

const AMENITY_INFO: Record<string, [LucideIcon, string]> = {
  "Shore power": [Plug, "Metered electricity at your berth, charged by the kWh."],
  "Fresh water": [Droplet, "Metered drinking water at your berth."],
  "Fuel dock": [Fuel, "Gasoline and diesel, added to your invoice."],
  "Pump-out": [Recycle, "Holding-tank pump-out, so you can empty your tanks the right way."],
  "Wi-Fi": [Wifi, "Wi-Fi on the docks and around the marina."],
  Showers: [ShowerHead, "Showers and restrooms for guests."],
  Laundry: [WashingMachine, "Washers and dryers, charged by the load."],
  Security: [ShieldCheck, "Gated docks and staff on site."],
  Parking: [SquareParking, "Parking for owners and guests near the docks."],
};

export function Services() {
  const { db } = useStore();
  usePageTitle(t("Services and amenities"), servicesMeta(db, window.location.origin));
  const marinas = openMarinas(db);
  const utilities = db.settings.utilities ?? DEFAULT_UTILITIES;
  const amenities = Object.keys(AMENITY_INFO).map((a) => ({ name: a, n: marinas.filter((m) => m.amenities.includes(a)).length })).filter((a) => a.n > 0);
  return (
    <>
      <PageHero eyebrow={t("Services")} title={t("Everything at the dock")} intro={t("Power, water, fuel and the comforts that make a stay easy. Each marina's page lists what it has.")} actions={<ButtonLink to="/marinas" icon={ArrowRight}>{t("All marinas")}</ButtonLink>} />
      <Container className="py-12">
        <section aria-labelledby="amenities">
          <h2 id="amenities" className={h2}>{t("Amenities")}</h2>
          <p className="mt-2 text-[15px] text-ink-2">{t("What you'll find at our marinas, and how many have each.")}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map(({ name, n }) => {
              const [Icon, body] = AMENITY_INFO[name];
              return (
                <li key={name}>
                  <Card className="h-full p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-full bg-sidebar text-ink"><Icon className="size-5" aria-hidden /></span>
                      <Badge tone={n === marinas.length ? "success" : "neutral"}>{n === marinas.length ? t("Every marina") : t("{n} of {total} marinas", { n, total: marinas.length })}</Badge>
                    </div>
                    <h3 className="mt-5 text-[17px] font-medium">{t(name)}</h3>
                    <p className="mt-1.5 text-[14px] leading-6 text-ink-2">{t(body)}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="prices">
          <Card className="p-6 sm:p-8">
            <h2 id="prices" className="text-[22px] leading-[30px] font-medium">{t("What services cost")}</h2>
            <p className="mt-1 text-[13px] text-ink-3">{t("Added to your invoice when you use them.")} {t("Prices at our US marinas. Marinas in the Gulf charge the same in their own currency.")}</p>
            <table className="mt-5 w-full text-[14px]">
              <tbody>
                <tr className="border-t border-line"><td className="py-3">{t("Shore power (metered)")}</td><td className="num py-3 text-end">{money2(utilities.powerPerKwh, "USD")} / kWh</td></tr>
                <tr className="border-t border-line"><td className="py-3">{t("Fresh water (metered)")}</td><td className="num py-3 text-end">{money2(utilities.waterPerGallon, "USD")} / {t("gal")}</td></tr>
                {SERVICES.map((s) => (
                  <tr key={s.id} className="border-t border-line"><td className="py-3">{t(s.label)}</td><td className="num py-3 text-end">{money2(s.price, "USD")} / {t(s.unit)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="flex flex-col p-6 sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent"><MessageSquare className="size-5" aria-hidden /></span>
            <h2 className="mt-5 text-[22px] leading-[30px] font-medium">{t("Need something else?")}</h2>
            <p className="mt-2 text-[14px] leading-6 text-ink-2">{t("Ask the dock office about anything else you need during your stay, such as repairs, provisioning or a longer berth. Their number is on each marina's page.")}</p>
            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <ButtonLink to="/contact" variant="primary">{t("Contact us")}</ButtonLink>
              <ButtonLink to="/pricing">{t("Rates and fees")}</ButtonLink>
            </div>
          </Card>
        </section>
      </Container>
      <NextSteps title={t("Find a marina with what you need")} body={t("Search by date and boat length, then open a marina to see its amenities, berths and dock office.")} />
    </>
  );
}

// ---- Long-term berths ---------------------------------------------------------------------------

export function LongTerm() {
  const { db } = useStore();
  usePageTitle(t("Long-term berths"), longTermMeta(db, window.location.origin));
  const lowestMonthly = lowestRate(db, openMarinas(db), "monthly");
  const pct = (k: ContractTerm) => CONTRACT_TERMS[k].discount * 100;
  const reasons = [
    t("The same berth every time you come back."),
    t("Save {s}% with a seasonal contract and {a}% with an annual one.", { s: pct("seasonal"), a: pct("annual") }),
    t("One invoice for the whole term, paid online or at the dock office."),
    t("Sign the contract online, in your account or in the app."),
    t("We remind you before the term ends ({n} days ahead for an annual contract), so you can renew.", { n: RENEWAL_NOTICE_DAYS.annual }),
  ];
  const steps: [LucideIcon, string, string][] = [
    [MessageSquare, t("Tell us about your boat"), t("Send a message or call the booking office with your boat's length and the marina you'd like.")],
    [Anchor, t("We offer you a berth"), t("The marina picks a berth your boat fits and prepares the contract.")],
    [FileSignature, t("Sign and pay"), t("Sign the contract in your account and pay the invoice for the term.")],
    [CalendarRange, t("Renew when it ends"), t("We remind you before the term ends, and you can renew for another term.")],
  ];
  return (
    <>
      <PageHero eyebrow={t("Long-term berths")} title={t("Keep your berth all season")} intro={t("Monthly, seasonal and annual contracts: the same berth, one invoice per term, and up to {pct}% off the monthly rate.", { pct: pct("annual") })}
        actions={<><ButtonLink to="/contact?topic=contract" variant="primary" size="lg">{t("Ask about a contract")}</ButtonLink><ButtonLink to="/pricing" size="lg">{t("Rates and fees")}</ButtonLink></>} />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(CONTRACT_TERMS) as ContractTerm[]).map((k) => {
            const term = CONTRACT_TERMS[k];
            return (
              <Card key={k} className={k === "annual" ? "border-accent-strong p-6" : "p-6"}>
                <p className="flex items-center justify-between gap-2 text-[15px] font-medium">{t(term.label)}{k === "annual" && <Badge tone="success">{t("Best value")}</Badge>}</p>
                <p className="mt-4 text-[13px] text-ink-3">{t("from")} <span className="num text-[28px] font-medium text-ink">{money(termFee(lowestMonthly.amount, k), lowestMonthly.currency)}</span> {t("/month")}</p>
                <p className="mt-3 text-[13px] text-ink-2">{term.discount ? t("{pct}% off the monthly rate", { pct: term.discount * 100 }) : t("The standard monthly rate")}</p>
                <p className="mt-1 text-xs text-ink-3">{t("We'll remind you {n} days before it ends.", { n: RENEWAL_NOTICE_DAYS[k] })}</p>
              </Card>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-3">{t("Lowest rates. Larger berths cost more; you'll see the exact price before you book.")}</p>

        <section className="mt-20 grid gap-10 lg:grid-cols-2" aria-labelledby="why">
          <div>
            <Eyebrow>{t("Why a contract")}</Eyebrow>
            <h2 id="why" className={h2}>{t("Your berth, waiting for you")}</h2>
            <ul className="mt-6 space-y-3">
              {reasons.map((r) => <li key={r} className="flex items-start gap-3 text-[15px] text-ink-2"><BadgeCheck className="mt-0.5 size-5 shrink-0 text-green" aria-hidden />{r}</li>)}
            </ul>
          </div>
          <div>
            <Eyebrow>{t("How it works")}</Eyebrow>
            <ol className="mt-4 space-y-6">
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
        </section>

        <Card className="mt-20 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
          <div className="max-w-xl">
            <h2 className="text-[17px] font-medium">{t("Marina full?")}</h2>
            <p className="mt-1 text-[14px] text-ink-2">{t("Join the marina's waitlist from the search results. The dock office contacts you when a berth your boat fits is free.")}</p>
          </div>
          <ButtonLink to="/book" icon={Search}>{t("Find a berth")}</ButtonLink>
        </Card>
      </Container>
      <NextSteps title={t("Talk to us about a contract")} body={t("Tell us your boat and the marina you'd like, and we'll find you a berth for the season or the year.")} />
    </>
  );
}

// ---- Help centre ----------------------------------------------------------------------------------

export function Help() {
  const { db } = useStore();
  usePageTitle(t("Help centre"), helpMeta(db, window.location.origin));
  const topics = helpTopics(db);
  return (
    <>
      <PageHero eyebrow={t("Help centre")} title={t("How can we help?")} intro={t("Answers about booking, paying, longer stays, arriving at the marina and your account.")}>
        <nav aria-label={t("Topics")} className="mt-8 flex flex-wrap gap-2">
          {topics.map((g) => <a key={g.id} href={`#${g.id}`} className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium hover:bg-sidebar-hover">{g.title}</a>)}
        </nav>
      </PageHero>
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          {topics.map((g) => (
            <section key={g.id} aria-labelledby={g.id}>
              <h2 id={g.id} className="scroll-mt-24 text-[22px] leading-[30px] font-medium">{g.title}</h2>
              <div className="mt-4 divide-y divide-line rounded-[20px] border border-line bg-surface">
                {g.items.map((f) => (
                  <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                      {f.q}
                      <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-3 text-[14px] leading-6 text-ink-2">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-[17px] font-medium">{t("Still need help?")}</h2>
            <p className="mt-1 text-[13px] text-ink-2">{t("Call a booking office or send us a message. We reply within one business day.")}</p>
            <div className="mt-5 space-y-4">
              {officesFor().map((o) => (
                <div key={o.id}>
                  <p className="text-xs text-ink-3">{t(o.region)} · {t(o.hours)}</p>
                  <a href={telLink(o.phone)} className="mt-1 flex items-center gap-2 text-[14px] font-medium hover:underline"><Phone className="size-4 text-ink-3" aria-hidden /><bdi className="num">{o.phone}</bdi></a>
                </div>
              ))}
            </div>
            <ButtonLink to="/contact" variant="primary" className="mt-6 w-full">{t("Send a message")}</ButtonLink>
          </Card>
        </aside>
      </Container>
    </>
  );
}
