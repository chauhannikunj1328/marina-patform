// All marinas (by state, with a map) and one marina's page: berths, rates, amenities and contact.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Droplets, Mail, MapPin, Navigation, Phone, Plug, Ruler } from "lucide-react";
import { count, cx, directionsUrl, marinaPoint, money, t, tn } from "@marina/shared";
import { useStore } from "@/data/store";
import { Map, type MapMarker } from "@/components/Map";
import { MarinaCard } from "@/components/MarinaCard";
import { SearchForm } from "@/components/SearchForm";
import { ButtonLink, Card, Container, EmptyState, Eyebrow, PageTitle, flip, usePageTitle } from "@/components/ui";
import { marinaFacts, openMarinas, stateOf } from "@/lib/marinas";
import { marinaMeta, marinasMeta } from "@/lib/seo";
import { StickyCta } from "@/components/StickyCta";
import { freeTonight, TrustPoints } from "@/components/Trust";

export function Marinas() {
  const { db, ix } = useStore();
  usePageTitle(t("Marinas"), marinasMeta(db, window.location.origin));
  const nav = useNavigate();
  const all = openMarinas(db);
  const states = [...new Set(all.map((m) => stateOf(db, m)))];
  const [state, setState] = useState("");
  const shown = state ? all.filter((m) => stateOf(db, m) === state) : all;
  const markers: MapMarker[] = shown.flatMap((m) => {
    const p = marinaPoint(m, ix.city(m.cityId));
    return p ? [{ id: m.id, ...p, label: `${m.name}, ${ix.city(m.cityId)?.name}` }] : [];
  });
  return (
    <Container className="py-12">
      <PageTitle title={t("Marinas")} intro={t("{n} marinas with berths for boats up to {ft} ft. Pick one to see its berths, rates and amenities.", { n: all.length, ft: Math.max(...all.map((m) => marinaFacts(db, m.id).maxLength)) })} />
      <div role="group" aria-label={t("State")} className="mb-6 flex flex-wrap gap-2">
        {["", ...states].map((s) => (
          <button key={s || "all"} type="button" aria-pressed={state === s} onClick={() => setState(s)}
            className={cx("rounded-full border px-4 py-1.5 text-[13px] font-medium cursor-pointer", state === s ? "border-transparent bg-primary text-on-primary" : "border-line text-ink-2 hover:bg-sidebar")}>
            {s ? t(s) : t("All states")} <span className="num opacity-70">{s ? all.filter((m) => stateOf(db, m) === s).length : all.length}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {shown.map((m) => <MarinaCard key={m.id} marina={m} />)}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Map label={t("Map of marinas")} markers={markers} height={520} zoom={11} onSelect={(id) => nav(`/marinas/${id}`)} />
        </div>
      </div>
    </Container>
  );
}

export function MarinaPage() {
  const { id = "" } = useParams();
  const { db, ix } = useStore();
  const marina = ix.marina(id);
  const meta = marina && marina.status === "active" ? marinaMeta(db, window.location.origin, marina) : undefined;
  usePageTitle(meta ? meta.title.replace(/ · Marina$/, "") : marina?.name, meta);
  if (!marina || marina.status !== "active")
    return (
      <Container className="py-16">
        <EmptyState icon={MapPin} title={t("This marina isn't taking bookings")} body={t("It may be closed for now. Have a look at our other marinas.")} action={<ButtonLink to="/marinas" variant="primary">{t("See all marinas")}</ButtonLink>} />
      </Container>
    );
  const city = ix.city(marina.cityId);
  const f = marinaFacts(db, marina.id);
  const point = marinaPoint(marina, city);
  const monthlyFrom = db.settings.monthlyFromNights;
  const free = freeTonight(db, marina.id);
  return (
    <>
      <section className="hero-bg border-b border-line">
        <Container className="pt-10 pb-10">
          <Link to="/marinas" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"><ArrowLeft className={`size-4 ${flip(ArrowLeft) ?? ""}`} aria-hidden /> {t("All marinas")}</Link>
          <Eyebrow><span className="mt-6 block">{city?.name}, {t(stateOf(db, marina))}</span></Eyebrow>
          <h1 className="text-[36px] leading-[44px] font-medium tracking-[-0.01em] sm:text-[48px] sm:leading-[56px]">{marina.name}</h1>
          <p className="mt-3 text-[15px] text-ink-2">{t("{n} berths · boats up to {ft} ft · from {price} a night", { n: f.berths, ft: f.maxLength, price: money(f.fromDaily) })}</p>
          {free > 0 && <p className="mt-3 inline-flex rounded-full bg-success-bg px-3 py-1 text-[13px] font-medium text-success-fg">{tn(free, "{n} berth free tonight", "{n} berths free tonight")}</p>}
          <Card className="mt-8 p-5 shadow-e2 sm:p-6">
            <div id="availability" className="scroll-mt-28 mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-medium">{t("Check availability")}</p>
            </div>
            <SearchForm initial={{ marina: marina.id }} lockMarina />
            <TrustPoints compact className="mt-4" />
          </Card>
        </Container>
      </section>

      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="text-[22px] leading-[30px] font-medium">{t("Berths and rates")}</h2>
            <p className="mt-1 text-[13px] text-ink-3">{t("Nightly rates. Stays of {n} nights or more are charged at the monthly rate, prorated by the night.", { n: monthlyFrom })}</p>
            <div className="mt-4 overflow-x-auto rounded-[16px] border border-line">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-table-head text-start text-xs text-ink-3">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-start font-medium">{t("Boats up to")}</th>
                    <th scope="col" className="px-4 py-3 text-start font-medium">{t("Berths")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-medium">{t("Per night from")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-medium">{t("Per month from")}</th>
                  </tr>
                </thead>
                <tbody>
                  {f.sizes.map((s) => (
                    <tr key={s.maxLength} className="border-t border-table-line">
                      <td className="px-4 py-3 font-medium"><span className="num">{s.maxLength}</span> {t("ft")}</td>
                      <td className="num px-4 py-3 text-ink-2">{s.count}</td>
                      <td className="num px-4 py-3 text-end">{money(s.daily)}</td>
                      <td className="num px-4 py-3 text-end">{money(s.monthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 flex flex-wrap gap-4 text-[13px] text-ink-2">
              {f.power && <li className="inline-flex items-center gap-1.5"><Plug className="size-4 text-secondary" aria-hidden /> {t("Shore power")}</li>}
              {f.water && <li className="inline-flex items-center gap-1.5"><Droplets className="size-4 text-secondary" aria-hidden /> {t("Fresh water")}</li>}
              <li className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-secondary" aria-hidden /> {t("Boats up to {ft} ft", { ft: f.maxLength })}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] leading-[30px] font-medium">{t("Amenities")}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {marina.amenities.map((a) => <li key={a} className="rounded-full border border-line px-3.5 py-1.5 text-[13px]">{t(a)}</li>)}
            </ul>
          </section>

          {point && (
            <section>
              <h2 className="mb-4 text-[22px] leading-[30px] font-medium">{t("Location")}</h2>
              <Map label={t("Map of {name}", { name: marina.name })} markers={[{ id: marina.id, ...point, label: marina.name, selected: true }]} height={320} zoom={15} />
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-[17px] font-medium">{t("Dock office")}</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-ink-3" aria-hidden /><span>{marina.address}, {city?.name}, {t(stateOf(db, marina))}</span></div>
              {marina.phone && <div className="flex gap-3"><Phone className="size-4 shrink-0 text-ink-3" aria-hidden /><a href={`tel:${marina.phone.replace(/[^\d+]/g, "")}`} className="hover:underline"><bdi>{marina.phone}</bdi></a></div>}
              {marina.email && <div className="flex gap-3"><Mail className="size-4 shrink-0 text-ink-3" aria-hidden /><a href={`mailto:${marina.email}`} className="break-all hover:underline"><bdi>{marina.email}</bdi></a></div>}
            </dl>
            {point && (
              <a href={directionsUrl(point)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-text hover:underline">
                <Navigation className="size-4" aria-hidden /> {t("Directions")}
              </a>
            )}
          </Card>
          <Card className="bg-promo p-6">
            <h2 className="text-[17px] font-medium text-ink">{t("Staying a season or longer?")}</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-2">{t("Monthly berths here start at {price}. Contracts of 6 or 12 months cost less per month.", { price: money(f.fromMonthly) })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink to={`/contact?topic=contract&marina=${marina.id}`} variant="primary" size="sm">{t("Ask about a contract")}</ButtonLink>
              <ButtonLink to="/pricing" size="sm">{t("Rates and contracts")}</ButtonLink>
            </div>
          </Card>
          <p className="px-1 text-xs text-ink-3">{count(f.berths)} {t("berths in total")}</p>
        </aside>
      </Container>
      <StickyCta price={money(f.fromDaily)} />
    </>
  );
}
