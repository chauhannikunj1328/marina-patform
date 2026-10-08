import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { t } from "@marina/shared";
import { useStore } from "@/data/store";
import Layout from "@/components/Layout";
import { GuideButton } from "@/components/GuideButton";
import { ButtonLink, Container, EmptyState, usePageTitle } from "@/components/ui";
import { Home } from "@/pages/Home";

// Each page is its own download, so the first visit only loads what it needs.
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const Marinas = page(() => import("@/pages/Marinas"), "Marinas");
const MarinaPage = page(() => import("@/pages/Marinas"), "MarinaPage");
const Pricing = page(() => import("@/pages/Pricing"), "Pricing");
const Contact = page(() => import("@/pages/Contact"), "Contact");
const Sitemap = page(() => import("@/pages/Sitemap"), "Sitemap");
const Book = page(() => import("@/pages/Book"), "Book");
const Checkout = page(() => import("@/pages/Book"), "Checkout");
const SignIn = page(() => import("@/pages/Auth"), "SignIn");
const Register = page(() => import("@/pages/Auth"), "Register");
const ForgotPassword = page(() => import("@/pages/Auth"), "ForgotPassword");
const AccountLayout = page(() => import("@/pages/account/AccountLayout"), "AccountLayout");
const Overview = page(() => import("@/pages/account/Overview"), "Overview");
const MyBookings = page(() => import("@/pages/account/Bookings"), "MyBookings");
const MyInvoices = page(() => import("@/pages/account/Invoices"), "MyInvoices");
const InvoicePage = page(() => import("@/pages/account/Invoices"), "InvoicePage");
const MyBoats = page(() => import("@/pages/account/Boats"), "MyBoats");
const MyContracts = page(() => import("@/pages/account/Contracts"), "MyContracts");
const Profile = page(() => import("@/pages/account/Profile"), "Profile");

/** Owner pages need a signed-in owner; others are sent to sign in and brought back afterwards. */
function RequireOwner({ children }: { children: ReactNode }) {
  const { owner } = useStore();
  const loc = useLocation();
  if (!owner) return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function Loading() {
  return <Container className="py-24"><div className="skeleton mx-auto h-8 w-48 rounded-full" /></Container>;
}

function NotFound() {
  usePageTitle(t("We couldn't find that page"), { description: t("It may have moved. Try the marinas list or the home page."), noindex: true });
  return (
    <Container className="py-16">
      <EmptyState title={t("We couldn't find that page")} body={t("It may have moved. Try the marinas list or the home page.")} action={<ButtonLink to="/" variant="primary">{t("Go to the home page")}</ButtonLink>} />
    </Container>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="marinas" element={<Marinas />} />
          <Route path="marinas/:id" element={<MarinaPage />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="contact" element={<Contact />} />
          <Route path="sitemap" element={<Sitemap />} />
          <Route path="book" element={<Book />} />
          <Route path="book/checkout" element={<RequireOwner><Checkout /></RequireOwner>} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="account" element={<RequireOwner><AccountLayout /></RequireOwner>}>
            <Route index element={<Overview />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="invoices" element={<MyInvoices />} />
            <Route path="invoices/:id" element={<InvoicePage />} />
            <Route path="boats" element={<MyBoats />} />
            <Route path="contracts" element={<MyContracts />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <GuideButton />
    </Suspense>
  );
}
