// Site map: every page of the website in one list, for people (search engines read sitemap.xml).
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LANGS, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { useLang } from "@/lib/lang";
import { Card, Container, PageHero, usePageTitle } from "@/components/ui";
import { openMarinas, stateOf } from "@/lib/marinas";
import { LEGAL, sitemapMeta, withLang, type LegalKey } from "@/lib/seo";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-medium">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-[14px] [&_a]:text-ink-2 [&_a:hover]:text-ink [&_a:hover]:underline">{children}</ul>
    </Card>
  );
}

export function Sitemap() {
  const { db, ix } = useStore();
  const { lang, setLang } = useLang();
  const { pathname } = useLocation();
  usePageTitle(t("Site map"), sitemapMeta(db, window.location.origin));
  const marinas = openMarinas(db);
  const states = [...new Set(marinas.map((m) => stateOf(db, m)))];
  return (
    <>
      <PageHero eyebrow={t("Site")} title={t("Site map")} intro={t("Every page on the website, in one place.")} />
      <Container className="grid gap-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        <Group title={t("Main pages")}>
          <li><Link to="/">{t("Home")}</Link></li>
          <li><Link to="/marinas">{t("All marinas")}</Link></li>
          <li><Link to="/book">{t("Book a berth")}</Link></li>
          <li><Link to="/pricing">{t("Rates and fees")}</Link></li>
          <li><Link to="/long-term">{t("Long-term berths")}</Link></li>
          <li><Link to="/services">{t("Services and amenities")}</Link></li>
          <li><Link to="/contact">{t("Contact us")}</Link></li>
          <li><Link to="/#reviews">{t("Reviews")}</Link></li>
          <li><Link to="/#faq">{t("Questions people ask")}</Link></li>
          <li><Link to="/#app">{t("Get the app")}</Link></li>
        </Group>
        <Group title={t("Boat owners")}>
          <li><Link to="/sign-in">{t("Sign in")}</Link></li>
          <li><Link to="/register">{t("Create an account")}</Link></li>
          <li><Link to="/forgot-password">{t("Forgot your password?")}</Link></li>
          <li><Link to="/account">{t("My account")}</Link></li>
          <li><Link to="/account/bookings">{t("Bookings")}</Link></li>
          <li><Link to="/account/invoices">{t("Invoices")}</Link></li>
          <li><Link to="/account/contracts">{t("Contracts")}</Link></li>
          <li><Link to="/account/boats">{t("Boats")}</Link></li>
          <li><Link to="/account/profile">{t("Profile")}</Link></li>
        </Group>
        <Group title={t("Company")}>
          <li><Link to="/about">{t("About us")}</Link></li>
          <li><Link to="/help">{t("Help centre")}</Link></li>
          {(Object.keys(LEGAL) as LegalKey[]).map((k) => <li key={k}><Link to={LEGAL[k].path}>{t(LEGAL[k].name)}</Link></li>)}
        </Group>
        <Group title={t("Languages")}>
          {LANGS.map((l) => (
            <li key={l.code}>
              <a href={withLang(pathname, l.code)} hrefLang={l.code} lang={l.code} aria-current={lang === l.code ? "true" : undefined} onClick={(e) => { e.preventDefault(); setLang(l.code); }}>{l.name}</a>
            </li>
          ))}
          <li className="pt-2 text-xs text-ink-3">{t("For search engines:")} <a href="/sitemap.xml" className="num">sitemap.xml</a></li>
        </Group>
        {states.map((s) => (
          <Group key={s} title={t("Marinas in {state}", { state: t(s) })}>
            {marinas.filter((m) => stateOf(db, m) === s).map((m) => (
              <li key={m.id}><Link to={`/marinas/${m.id}`}>{m.name}</Link> <span className="text-xs text-ink-3">· {ix.city(m.cityId)?.name}</span></li>
            ))}
          </Group>
        ))}
      </Container>
    </>
  );
}
