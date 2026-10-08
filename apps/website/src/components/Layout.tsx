// Page frame: header (navigation, language, theme, account), footer and confirmation messages.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CircleCheck, Languages, Mail, Menu, Moon, Phone, Sun, UserRound, X } from "lucide-react";
import { cx, LANGS, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Logo } from "./Logo";
import { ButtonLink, Container, IconButton } from "./ui";

/** The company's own contact details (sample values until the real ones are set). */
export const SITE = { email: "hello@marina.com", phone: "(415) 555-0100", hours: "Mon–Sat, 8 am – 6 pm" };

const NAV = [
  { to: "/marinas", label: "Marinas" },
  { to: "/pricing", label: "Pricing" },
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

function Header() {
  const { owner } = useStore();
  const [theme, toggleTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  // Close the phone menu after navigating.
  const [path, setPath] = useState(loc.pathname);
  if (path !== loc.pathname) {
    setPath(loc.pathname);
    setMenu(false);
  }
  const link = ({ isActive }: { isActive: boolean }) => cx("rounded-full px-3.5 py-2 text-sm font-medium transition-colors", isActive ? "bg-sidebar text-ink" : "text-ink-2 hover:text-ink");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur no-print">
      <Container className="flex h-16 items-center gap-2">
        <Link to="/" className="me-4 rounded-[8px]"><Logo /></Link>
        <nav aria-label={t("Main")} className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} className={link}>{t(n.label)}</NavLink>)}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LanguageMenu />
          <IconButton icon={theme === "dark" ? Sun : Moon} label={theme === "dark" ? t("Light mode") : t("Dark mode")} onClick={toggleTheme} />
          <Link to={owner ? "/account" : "/sign-in"} className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink sm:inline-flex">
            <UserRound className="size-4" aria-hidden /> {owner ? t("My account") : t("Sign in")}
          </Link>
          <ButtonLink to="/book" variant="primary" className="hidden sm:inline-flex">{t("Book a berth")}</ButtonLink>
          <IconButton icon={menu ? X : Menu} label={t("Menu")} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="md:hidden" />
        </div>
      </Container>
      {menu && (
        <nav aria-label={t("Main")} className="border-t border-line bg-bg md:hidden animate-fade">
          <Container className="flex flex-col gap-1 py-3">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={link}>{t(n.label)}</NavLink>)}
            <NavLink to={owner ? "/account" : "/sign-in"} className={link}>{owner ? t("My account") : t("Sign in")}</NavLink>
            <ButtonLink to="/book" variant="primary" className="mt-2">{t("Book a berth")}</ButtonLink>
          </Container>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { db } = useStore();
  const states = [...new Set(db.counties.map((c) => c.state))].sort();
  return (
    <footer className="mt-24 border-t border-line bg-sidebar no-print">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-5 text-ink-2">{t("{n} marinas in {states}. Book a berth for a night, a season or the whole year.", { n: db.marinas.filter((m) => m.status === "active").length, states: states.map((s) => t(s)).join(", ") })}</p>
        </div>
        <FooterCol title={t("Visit")}>
          <Link to="/marinas">{t("All marinas")}</Link>
          <Link to="/book">{t("Book a berth")}</Link>
          <Link to="/pricing">{t("Rates and fees")}</Link>
        </FooterCol>
        <FooterCol title={t("Boat owners")}>
          <Link to="/account">{t("My account")}</Link>
          <Link to="/account/invoices">{t("Pay an invoice")}</Link>
          <Link to="/account/contracts">{t("Sign a contract")}</Link>
        </FooterCol>
        <FooterCol title={t("Contact")}>
          <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2"><Phone className="size-4" aria-hidden /><bdi>{SITE.phone}</bdi></a>
          <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2"><Mail className="size-4" aria-hidden /><bdi>{SITE.email}</bdi></a>
          <span className="text-ink-3">{t(SITE.hours)}</span>
        </FooterCol>
      </Container>
      <Container className="flex flex-wrap justify-between gap-2 border-t border-line pt-6 pb-20 text-xs text-ink-3">
        <span>© {YEAR} {db.settings.company}</span>
        <span>{t("Sample data. Bookings and payments made here stay in this browser.")}</span>
      </Container>
    </footer>
  );
}

const YEAR = new Date().getFullYear();

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-label mb-4 text-ink-3">{title}</p>
      <div className="flex flex-col items-start gap-2.5 text-[13px] text-ink-2 [&_a:hover]:text-ink [&_a:hover]:underline">{children}</div>
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
  const { pathname } = useLocation();
  // Each new page starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">{t("Skip to content")}</a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
