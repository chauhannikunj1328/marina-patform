// Search and link-preview metadata for the website: each page's title, description, canonical
// URL, robots rule and structured data (schema.org JSON-LD). The same definitions are used in the
// browser (usePageTitle keeps the <head> in step as people move around) and at build time, when
// vite.config.ts writes a static HTML file per public page so crawlers and link previews (which
// don't run JavaScript) see the right title, description and image.
//
// Imports use a relative path so vite.config.ts can load this file too.
import { CONTACT, CONTRACT_TERMS, getLang, LANGS, marinaFacts, marinaPoint, money, openMarinas, stateOf, t, type Db, type Lang, type Marina } from "../../../../packages/shared/src/index";

export const BRAND = "Marina";
export const DEFAULT_TITLE = "Book a berth online in California, Washington and Florida · Marina";
export const OG_IMAGE = "/og-image.png";

export interface PageMeta {
  title: string;
  description: string;
  /** Path without query, e.g. "/marinas/m-gg". */
  path: string;
  noindex?: boolean;
  jsonLd?: object[];
}

/** Pages that are personal or transactional: kept out of search results (links still followed). */
export function isPrivate(path: string, search = "") {
  path = stripLang(path);
  return /^\/(account|sign-in|register|forgot-password|book\/checkout)(\/|$)/.test(path) || (path === "/book" && search.length > 1);
}

const title = (page?: string) => (page ? `${page} · ${BRAND}` : t(DEFAULT_TITLE));

// ---- Language addresses ----------------------------------------------------------------------
// English pages live at the root (/marinas), Spanish and Arabic under /es and /ar (/es/marinas), so
// search engines can index each language. Inside the app, paths never carry the prefix: the router's
// basename adds it.

/** The language an address is in: /es/... Spanish, /ar/... Arabic, anything else English. */
export function langOfPath(path: string): Lang | undefined {
  const m = /^\/(es|ar)(?=\/|$)/.exec(path);
  return m ? (m[1] as Lang) : undefined;
}
/** The address without its language prefix: /es/marinas → /marinas. */
export const stripLang = (path: string) => path.replace(/^\/(es|ar)(?=\/|$)/, "") || "/";
/** The address of a page in a language: (/marinas, es) → /es/marinas. */
export const withLang = (path: string, l: Lang) => (l === "en" ? path : `/${l}${path === "/" ? "" : path}`);
export const langBase = (l: Lang) => withLang("", l);

/** An absolute URL for a page in the current language (or a site-relative one with no base). */
const abs = (base: string, path: string) => {
  const local = path.startsWith("/") && !/\.\w+$/.test(path) ? withLang(path, getLang()) : path;
  return base ? new URL(local, base).href : local;
};
const OG_LOCALE: Record<Lang, string> = { en: "en_US", es: "es_ES", ar: "ar_AR" };

function organization(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: abs(base, "/"),
    logo: abs(base, "/icon-512.png"),
    email: CONTACT.email,
    telephone: CONTACT.phone,
    contactPoint: [{ "@type": "ContactPoint", contactType: "reservations", telephone: CONTACT.phone, email: CONTACT.email, availableLanguage: ["English", "Spanish", "Arabic"] }],
  };
}

function breadcrumbs(base: string, items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(base, path) })),
  };
}

/** Questions people ask before booking, answered from the booking rules. Shown on Home and marked up as an FAQ. */
export function faqs(db: Db): { q: string; a: string }[] {
  const annual = CONTRACT_TERMS.annual.discount * 100;
  return [
    { q: t("Do I pay anything when I book?"), a: t("No. You send a booking request and nothing is charged. The marina confirms it, usually within one business day, and sends the invoice. It's due within {n} days.", { n: db.settings.invoiceDueDays }) },
    { q: t("Can I cancel?"), a: t("Yes. Until the marina confirms your booking you can cancel the request in your account at no cost. After that, call the dock office.") },
    { q: t("Are there booking fees?"), a: t("No booking fees. You pay for the nights you stay, plus power, water and services you use at the dock.") },
    { q: t("Will my boat fit?"), a: t("Enter your boat's length when you search. You'll only see berths your boat fits that are free for your whole stay.") },
    { q: t("What about longer stays?"), a: t("Stays of {n} nights or more are charged at the monthly rate. Seasonal and annual contracts save up to {pct}%.", { n: db.settings.monthlyFromNights, pct: annual }) },
    { q: t("How do I check in?"), a: t("Go to the dock office when you arrive. Your booking, the berth number and directions are in your account and in the Marina Berths app.") },
  ];
}

function faqPage(db: Db) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs(db).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function homeMeta(db: Db, base: string): PageMeta {
  const marinas = openMarinas(db);
  const from = Math.min(...marinas.map((m) => marinaFacts(db, m.id).fromDaily));
  return {
    title: title(),
    description: t("Book a berth online at {n} marinas in California, Washington and Florida. See which berths fit your boat, check prices from {price} a night and book in minutes. No booking fees.", { n: marinas.length, price: money(from) }),
    path: "/",
    jsonLd: [
      organization(base),
      { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: abs(base, "/") },
      faqPage(db),
    ],
  };
}

export function marinasMeta(db: Db, base: string): PageMeta {
  const marinas = openMarinas(db);
  return {
    title: title(t("Marinas")),
    description: t("All {n} Marina locations in California, Washington and Florida: berth sizes, nightly and monthly rates, amenities and dock office contacts.", { n: marinas.length }),
    path: "/marinas",
    jsonLd: [
      breadcrumbs(base, [[BRAND, "/"], [t("Marinas"), "/marinas"]]),
      { "@context": "https://schema.org", "@type": "ItemList", itemListElement: marinas.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.name, url: abs(base, `/marinas/${m.id}`) })) },
    ],
  };
}

export function marinaMeta(db: Db, base: string, m: Marina): PageMeta {
  const f = marinaFacts(db, m.id);
  const city = db.cities.find((c) => c.id === m.cityId);
  const state = stateOf(db, m);
  const point = marinaPoint(m, city);
  const path = `/marinas/${m.id}`;
  return {
    title: title(t("{name}, {city}: berths and rates", { name: m.name, city: city?.name ?? "" })),
    description: t("Book a berth at {name} in {city}, {state}. {n} berths for boats up to {ft} ft, from {price} a night. {amenities}. Check availability and book online.", {
      name: m.name, city: city?.name ?? "", state: t(state), n: f.berths, ft: f.maxLength, price: money(f.fromDaily), amenities: m.amenities.slice(0, 4).map((a) => t(a)).join(", "),
    }),
    path,
    jsonLd: [
      breadcrumbs(base, [[BRAND, "/"], [t("Marinas"), "/marinas"], [m.name, path]]),
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        additionalType: "https://en.wikipedia.org/wiki/Marina",
        name: m.name,
        url: abs(base, path),
        image: abs(base, OG_IMAGE),
        telephone: m.phone,
        email: m.email,
        address: { "@type": "PostalAddress", streetAddress: m.address, addressLocality: city?.name, addressRegion: state, addressCountry: "US" },
        ...(point ? { geo: { "@type": "GeoCoordinates", latitude: point.lat, longitude: point.lng } } : {}),
        priceRange: `${money(f.fromDaily)}–${money(Math.max(...db.berths.filter((b) => b.marinaId === m.id).map((b) => b.dailyRate)))} / night`,
        amenityFeature: m.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
        parentOrganization: { "@type": "Organization", name: BRAND },
      },
    ],
  };
}

export function pricingMeta(db: Db, base: string): PageMeta {
  const marinas = openMarinas(db);
  const from = Math.min(...marinas.map((m) => marinaFacts(db, m.id).fromDaily));
  return {
    title: title(t("Rates and fees")),
    description: t("Berth rates at every Marina location, from {price} a night. Monthly rates from {n} nights, seasonal and annual contracts, dock extras and how to pay. No booking fees.", { price: money(from), n: db.settings.monthlyFromNights }),
    path: "/pricing",
    jsonLd: [breadcrumbs(base, [[BRAND, "/"], [t("Rates and fees"), "/pricing"]])],
  };
}

export function contactMeta(_db: Db, base: string): PageMeta {
  return {
    title: title(t("Contact us")),
    description: t("Questions about a berth, a booking or an invoice? Call {phone}, email {email} or reach any dock office directly.", { phone: CONTACT.phone, email: CONTACT.email }),
    path: "/contact",
    jsonLd: [breadcrumbs(base, [[BRAND, "/"], [t("Contact us"), "/contact"]]), organization(base)],
  };
}

export function bookMeta(_db: Db, _base: string): PageMeta {
  return {
    title: title(t("Book a berth")),
    description: t("Search free berths by date and boat length across every Marina location and book online. You only see berths your boat fits, with the exact price."),
    path: "/book",
  };
}

export function sitemapMeta(db: Db, base: string): PageMeta {
  return {
    title: title(t("Site map")),
    description: t("Every page on the Marina website: all {n} marinas by state, rates and fees, booking, the owner account and contact.", { n: openMarinas(db).length }),
    path: "/sitemap",
    jsonLd: [breadcrumbs(base, [[BRAND, "/"], [t("Site map"), "/sitemap"]])],
  };
}

/** Every page that should be in search results, for the sitemap and the static HTML files. */
export function publicPages(db: Db, base: string): PageMeta[] {
  return [homeMeta(db, base), marinasMeta(db, base), ...openMarinas(db).map((m) => marinaMeta(db, base, m)), pricingMeta(db, base), contactMeta(db, base), bookMeta(db, base), sitemapMeta(db, base)];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The <head> tags for a page, as HTML (used at build time). */
export function headTags(m: PageMeta, base: string): string {
  const url = abs(base, m.path);
  const image = abs(base, OG_IMAGE);
  const alternates = m.noindex || !base ? [] : [
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${esc(new URL(withLang(m.path, l.code), base).href)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${esc(new URL(m.path, base).href)}" />`,
  ];
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${m.noindex ? "noindex, follow" : "index, follow"}" />`,
    base ? `<link rel="canonical" href="${esc(url)}" />` : "",
    ...alternates,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${OG_LOCALE[getLang()]}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    base ? `<meta property="og:url" content="${esc(url)}" />` : "",
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...(m.jsonLd ?? []).map((j) => `<script type="application/ld+json" data-seo>${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`),
  ].filter(Boolean).join("\n    ");
}

/** Keeps the live page's <head> in step with the page being shown (in the browser). */
export function applyHead(m: PageMeta) {
  if (typeof document === "undefined") return;
  const base = window.location.origin;
  document.title = m.title;
  // One alternate link per language (and x-default), for pages that are in search results.
  document.head.querySelectorAll("link[rel=alternate][hreflang]").forEach((el) => el.remove());
  if (!m.noindex) {
    for (const [code, path] of [...LANGS.map((l) => [l.code, withLang(m.path, l.code)]), ["x-default", m.path]]) {
      const el = document.createElement("link");
      el.rel = "alternate";
      el.hreflang = code;
      el.href = new URL(path, base).href;
      document.head.appendChild(el);
    }
  }
  const set = (selector: string, make: () => HTMLElement, attr: string, value: string) => {
    let el = document.head.querySelector<HTMLElement>(selector);
    if (!el) { el = make(); document.head.appendChild(el); }
    el.setAttribute(attr, value);
  };
  const meta = (key: "name" | "property", name: string) => () => { const el = document.createElement("meta"); el.setAttribute(key, name); return el; };
  set('meta[name="description"]', meta("name", "description"), "content", m.description);
  set('meta[name="robots"]', meta("name", "robots"), "content", m.noindex ? "noindex, follow" : "index, follow");
  set('link[rel="canonical"]', () => { const el = document.createElement("link"); el.rel = "canonical"; return el; }, "href", abs(base, m.path));
  set('meta[property="og:title"]', meta("property", "og:title"), "content", m.title);
  set('meta[property="og:description"]', meta("property", "og:description"), "content", m.description);
  set('meta[property="og:url"]', meta("property", "og:url"), "content", abs(base, m.path));
  set('meta[property="og:locale"]', meta("property", "og:locale"), "content", OG_LOCALE[getLang()]);
  set('meta[name="twitter:title"]', meta("name", "twitter:title"), "content", m.title);
  set('meta[name="twitter:description"]', meta("name", "twitter:description"), "content", m.description);
  document.head.querySelectorAll("script[data-seo]").forEach((s) => s.remove());
  for (const j of m.jsonLd ?? []) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.dataset.seo = "";
    s.textContent = JSON.stringify(j);
    document.head.appendChild(s);
  }
}
