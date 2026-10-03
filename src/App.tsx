import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "@/data/store";
import Layout from "@/components/Layout";
import { EmptyState, Button } from "@/components/ui";
import { ForgotPassword, Login } from "@/pages/Login";
import { CityDashboard, CountyDashboard, GlobalOverview } from "@/pages/Dashboards";
import { MarinaDetail, Marinas } from "@/pages/Marinas";
import { Berths } from "@/pages/Berths";
import { Bookings } from "@/pages/Bookings";
import { Locations } from "@/pages/Locations";
import { Maintenance, StaffPage } from "@/pages/Operations";
import { People } from "@/pages/People";
import { Billing } from "@/pages/Billing";
import { Analytics, Reports } from "@/pages/Insights";
import { AccessControl, Settings } from "@/pages/System";

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user } = useStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (admin && user.role !== "admin")
    return <EmptyState title="You don't have access to this page" body="Ask an admin if you need it." action={<Link to="/"><Button>Go to overview</Button></Link>} />;
  return <>{children}</>;
}

/** Remount a page when its query string changes, so filter links (e.g. ?status=pending) always apply. */
function ByQuery({ children }: { children: ReactNode }) {
  const { search } = useLocation();
  const key = new URLSearchParams(search);
  // Params that only open a dialog shouldn't reset the page's filters.
  for (const p of ["new", "open", "berth", "owner"]) key.delete(p);
  return <div key={key.toString()}>{children}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<GlobalOverview />} />
        <Route path="county/:id?" element={<CountyDashboard />} />
        <Route path="city/:id?" element={<CityDashboard />} />
        <Route path="marinas" element={<Marinas />} />
        <Route path="marinas/:id" element={<MarinaDetail />} />
        <Route path="berths" element={<Berths />} />
        <Route path="bookings" element={<ByQuery><Bookings /></ByQuery>} />
        <Route path="locations" element={<RequireAuth admin><Locations /></RequireAuth>} />
        <Route path="staff" element={<ByQuery><StaffPage /></ByQuery>} />
        <Route path="maintenance" element={<ByQuery><Maintenance /></ByQuery>} />
        <Route path="users" element={<ByQuery><People /></ByQuery>} />
        <Route path="billing" element={<ByQuery><Billing /></ByQuery>} />
        <Route path="reports" element={<Reports />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="access" element={<RequireAuth admin><AccessControl /></RequireAuth>} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<EmptyState title="Page not found" body="Check the address or use the menu." action={<Link to="/"><Button>Go to overview</Button></Link>} />} />
      </Route>
    </Routes>
  );
}
