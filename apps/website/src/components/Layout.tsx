// Page frame: announcement bar, header (navigation, language, theme, account), footer and
// confirmation messages.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CircleCheck, Languages, Mail, Menu, Moon, Phone, Sun, UserRound, X } from "lucide-react";
import { cx, LANGS, mainOffice, officesFor, t, telLink } from "@marina/shared";
import { useStore } from "@/data/store";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { openMarinas, stateOf } from "@/lib/marinas";
import { withLang } from "@/lib/seo";
import { Logo } from "./Logo";
import { ButtonLink, Container, IconButton, flip } from "./ui";

export const tel = telLink;

const NAV = [
  { to: "/marinas", label: "Marinas" },
  { to: "/pricing", label: "Pricing" },
  { to: "/#reviews", label: "Reviews" },
  { to: "/#app", label: "Get the app" },
  { to: "/contact", label: "Contact" },
];

function LanguageMenu() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <IconButton icon={Languages} label={t("Language")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div role="menu" className="absolute end-0 top-12 z-40 w-44 rounded-[12px] border border-line bg-raised p-1 shadow-e2 animate-fade">
          {LANGS.map((l) => (
            <button key={l.code} role="menuitemradio" aria-checked={lang === l.code} lang={l.code} dir={l.rtl ? "rtl" : "ltr"} onClick={() => { setLang(l.code); setOpen(false); }}
              className={cx("flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-start text-[13px] hover:bg-sidebar-hover cursor-pointer", lang === l.code && "font-semibold")}>
              {l.name}
              {lang === l.code && <CircleCheck className="size-4 text-green" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A thin bar above the header with the booking promise and the phone number. */
function Announcement() {
  return (
    <div className="bg-footer text-on-footer no-print">
      <Container className="flex h-9 items-center justify-center gap-6 text-xs sm:justify-between">
        <p className="truncate"><span className="me-2 inline-block size-1.5 rounded-full bg-green align-middle" aria-hidden />{t("No booking fees. Nothing to pay until the marina confirms.")}</p>
        <div className="hidden items-center gap-5 sm:flex">
          <a href={tel(mainOffice().phone)} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100"><Phone className="size-3.5" aria-hidden /><bdi className="num">{mainOffice().phone}</bdi></a>
          <Link to="/#app" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">{t("Get the app")}<ArrowUpRight className={cx("size-3.5", flip(ArrowUpRight))} aria-hidden /></Link>
        </div>
      </Container>
    </div>
  );
}

function Header() {
  const { owner } = useStore();
  const [theme, toggleTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  // Close the phone menu after navigating.
  const [path, setPath] = useState(loc.pathname + loc.hash);
  if (path !== loc.pathname + loc.hash) {
    setPath(loc.pathname + loc.hash);
    setMenu(false);
  }
  const active = (to: string) => !to.includes("#") && (loc.pathname === to || loc.pathname.startsWith(`${to}/`));
  const link = (to: string) => cx("rounded-full px-3.5 py-2 text-sm font-medium transition-colors", active(to) ? "bg-sidebar text-ink" : "text-ink-2 hover:text-ink");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur no-print">
      <Container className="flex h-16 items-center gap-2">
        <Link to="/" className="me-4 rounded-[8px]" aria-label={t("Marina home")}><Logo /></Link>
        <nav aria-label={t("Main")} className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} className={link(n.to)}>{t(n.label)}</NavLink>)}
        </nav>
        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <LanguageMenu />
          <IconButton icon={theme === "dark" ? Sun : Moon} label={theme === "dark" ? t("Light mode") : t("Dark mode")} onClick={toggleTheme} />
          <ButtonLink to={owner ? "/account" : "/sign-in"} icon={UserRound} className="ms-1 max-sm:hidden">{owner ? t("My account") : t("Sign in")}</ButtonLink>
          <ButtonLink to="/book" variant="primary" className="max-sm:hidden">{t("Book a berth")}</ButtonLink>
          <IconButton icon={menu ? X : Menu} label={t("Menu")} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="lg:hidden" />
        </div>
      </Container>
      {menu && (
        <nav aria-label={t("Main")} className="border-t border-line bg-bg lg:hidden animate-fade">
          <Container className="flex flex-col gap-1 py-3">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={link(n.to)}>{t(n.label)}</NavLink>)}
            <NavLink to={owner ? "/account" : "/sign-in"} className={link(owner ? "/account" : "/sign-in")}>{owner ? t("My account") : t("Sign in")}</NavLink>
            {officesFor().map((o) => <a key={o.id} href={tel(o.phone)} className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-ink-2"><Phone className="size-4" aria-hidden /><bdi className="num">{o.phone}</bdi><span className="text-xs font-normal text-ink-3">{t(o.region)}</span></a>)}
            <ButtonLink to="/book" variant="primary" className="mt-2">{t("Book a berth")}</ButtonLink>
          </Container>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { db } = useStore();
  const { lang, setLang } = useLang();
  const loc = useLocation();
  const marinas = openMarinas(db);
  const states = [...new Set(marinas.map((m) => stateOf(db, m)))].sort();
  return (
    <footer className="bg-footer text-on-footer no-print">
      <div className="bg-squares-dark">
        <Container className="grid gap-12 pt-16 pb-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="max-w-xs text-[15px] text-on-footer-2">{t("Your berth, booked in minutes.")}</p>
            <h2 className="mt-8 max-w-md text-[36px] leading-[44px] font-medium tracking-[-0.02em] sm:text-[44px] sm:leading-[52px]">{t("Questions about a berth? Talk to us.")}</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-on-footer px-5 text-sm font-semibold text-footer hover:opacity-90">{t("Contact us")}<ArrowRight className={cx("size-4", flip(ArrowRight))} aria-hidden /></Link>
              <a href={tel(mainOffice().phone)} className="inline-flex h-11 items-center gap-2 rounded-full border border-footer-line px-5 text-sm font-semibold hover:bg-white/5"><Phone className="size-4" aria-hidden /><bdi className="num">{mainOffice().phone}</bdi></a>
            </div>
            <p className="text-label mt-12 text-on-footer-2">{t("Marinas in")}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {states.map((s) => (
                <li key={s}><Link to={`/marinas?state=${encodeURIComponent(s)}`} className="inline-flex rounded-full border border-footer-line px-3.5 py-1.5 text-xs font-medium hover:bg-white/5">{t(s)}</Link></li>
              ))}
            </ul>
          </div>
          <div className="grid gap-10 sm:grid-cols-2">
            <FooterCol title={t("Booking offices")}>
              <span className="text-on-footer">{db.settings.company}</span>
              {officesFor().map((o) => (
                <span key={o.id} className="flex flex-col gap-1.5">
                  <span className="text-xs text-on-footer-2">{t(o.region)}</span>
                  <a href={tel(o.phone)} className="inline-flex items-center gap-2"><Phone className="size-4" aria-hidden /><bdi className="num">{o.phone}</bdi></a>
                  <a href={`mailto:${o.email}`} className="inline-flex items-center gap-2 break-all"><Mail className="size-4 shrink-0" aria-hidden /><bdi>{o.email}</bdi></a>
                  <span>{t(o.hours)}</span>
                </span>
              ))}
            </FooterCol>
            <FooterCol title={t("Book")}>
              <Link to="/book">{t("Book a berth")}</Link>
              <Link to="/marinas">{t("All marinas")}</Link>
              <Link to="/pricing">{t("Rates and fees")}</Link>
              <Link to="/#reviews">{t("Reviews")}</Link>
              <Link to="/#faq">{t("Questions people ask")}</Link>
            </FooterCol>
            <FooterCol title={t("Boat owners")}>
              <Link to="/account">{t("My account")}</Link>
              <Link to="/account/invoices">{t("Pay an invoice")}</Link>
              <Link to="/account/contracts">{t("Sign a contract")}</Link>
              <Link to="/#app">{t("Get the app")}</Link>
            </FooterCol>
            <FooterCol title={t("Site")}>
              <Link to="/contact">{t("Contact us")}</Link>
              <Link to="/sitemap">{t("Site map")}</Link>
              {LANGS.map((l) => (
                <a key={l.code} href={withLang(loc.pathname, l.code)} hrefLang={l.code} lang={l.code} aria-current={lang === l.code ? "true" : undefined}
                  onClick={(e) => { e.preventDefault(); setLang(l.code); }} className={cx(lang === l.code && "font-semibold text-on-footer")}>{l.name}</a>
              ))}
            </FooterCol>
          </div>
        </Container>
        <Container className="border-t border-footer-line py-6">
          <p className="text-label mb-3 text-on-footer-2">{t("Our marinas")}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-on-footer-2">
            {marinas.map((m) => <li key={m.id}><Link to={`/marinas/${m.id}`} className="hover:text-on-footer hover:underline">{m.name}</Link></li>)}
          </ul>
        </Container>
        <Container className="flex flex-wrap items-center justify-between gap-4 border-t border-footer-line pt-6 pb-24 text-xs text-on-footer-2">
          <span className="inline-flex items-center gap-3"><Logo inverse /><span>© {YEAR} {db.settings.company}</span></span>
          <span>{t("Sample data. Bookings and payments made here stay in this browser.")}</span>
        </Container>
      </div>
    </footer>
  );
}

const YEAR = new Date().getFullYear();

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-label mb-4 text-on-footer-2">{title}</p>
      <div className="flex flex-col items-start gap-2.5 text-[13px] text-on-footer-2 [&_a:hover]:text-on-footer [&_a:hover]:underline">{children}</div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((x) => (
        <div key={x.id} className="pointer-events-auto flex items-center gap-2 rounded-full bg-tooltip px-4 py-2.5 text-[13px] font-medium text-on-tooltip shadow-e3 animate-in">
          <CircleCheck className="size-4 text-green" aria-hidden /> {x.text}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  const { pathname, hash } = useLocation();
  // Each new page starts at the top; links like /#reviews scroll to that section.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    // The section may be on a page that's still loading.
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        window.clearInterval(timer);
        el?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">{t("Skip to content")}</a>
      <Announcement />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
