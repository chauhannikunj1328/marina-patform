// Owner account frame: greeting, section menu and sign out.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, FileSignature, LayoutDashboard, LogOut, Receipt, Ship, UserRound } from "lucide-react";
import { cx, t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Container } from "@/components/ui";

const SECTIONS = [
  { to: "/account", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/account/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/account/invoices", label: "Invoices", icon: Receipt },
  { to: "/account/contracts", label: "Contracts", icon: FileSignature },
  { to: "/account/boats", label: "My boats", icon: Ship },
  { to: "/account/profile", label: "Profile", icon: UserRound },
];

export function AccountLayout() {
  const { owner, signOut } = useStore();
  const nav = useNavigate();
  return (
    <Container className="py-10">
      <p className="text-[13px] text-ink-3 no-print">{t("Signed in as {email}", { email: owner?.email })}</p>
      <h1 className="mt-1 mb-8 text-[32px] leading-10 font-medium no-print">{t("Hi, {name}", { name: owner?.name.split(" ")[0] })}</h1>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t("My account")} className="no-print -mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0">
          {SECTIONS.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx("flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-sidebar")}>
              <Icon className="size-4" aria-hidden /> {t(label)}
            </NavLink>
          ))}
          <button type="button" onClick={() => { signOut(); nav("/"); }} className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-sidebar cursor-pointer lg:mt-4">
            <LogOut className="size-4" aria-hidden /> {t("Sign out")}
          </button>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </Container>
  );
}
