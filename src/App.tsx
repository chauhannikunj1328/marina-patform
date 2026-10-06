import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "@/data/store";
import { AREAS, type Area } from "@/data/permissions";
import Layout from "@/components/Layout";
import { ErrorBoundary, NoAccess, NotFoundPage } from "@/components/StatusPage";
import { PageSkeleton } from "@/components/Skeleton";
import { ForgotPassword, Login, Register } from "@/pages/Login";

// Each page is its own download, so the first visit only loads what it needs.
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const GlobalOverview = page(() => import("@/pages/Dashboards"), "GlobalOverview");
const CountyDashboard = page(() => import("@/pages/Dashboards"), "CountyDashboard");
const CityDashboard = page(() => import("@/pages/Dashboards"), "CityDashboard");
const Marinas = page(() => import("@/pages/Marinas"), "Marinas");
const MarinaDetail = page(() => import("@/pages/Marinas"), "MarinaDetail");
const Berths = page(() => import("@/pages/Berths"), "Berths");
const Bookings = page(() => import("@/pages/Bookings"), "Bookings");
const Locations = page(() => import("@/pages/Locations"), "Locations");
const StaffPage = page(() => import("@/pages/Operations"), "StaffPage");
const Maintenance = page(() => import("@/pages/Operations"), "Maintenance");
const People = page(() => import("@/pages/People"), "People");
const Billing = page(() => import("@/pages/Billing"), "Billing");
const Reports = page(() => import("@/pages/Insights"), "Reports");
const Analytics = page(() => import("@/pages/Insights"), "Analytics");
const AccessControl = page(() => import("@/pages/System"), "AccessControl");
const Settings = page(() => import("@/pages/System"), "Settings");
// Staff app (phone-first), loaded only when opened.
const StaffLayout = lazy(() => import("@/staff/StaffLayout"));
const StaffToday = page(() => import("@/staff/StaffPages"), "StaffToday");
const StaffBookings = page(() => import("@/staff/StaffPages"), "StaffBookings");
const StaffBerths = page(() => import("@/staff/StaffPages"), "StaffBerths");
const StaffTasks = page(() => import("@/staff/StaffPages"), "StaffTasks");
const StaffMe = page(() => import("@/staff/StaffPages"), "StaffMe");

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

/** Staff work in the phone-first staff app, not the office web app. */
function OfficeOnly({ children }: { children: ReactNode }) {
  const { user } = useStore();
  if (user?.role === "staff") return <Navigate to="/app" replace />;
  return <>{children}</>;
}

const staffPage = (node: ReactNode) => <Suspense fallback={<div className="space-y-3"><div className="skeleton h-8 w-40 rounded-[12px]" /><div className="skeleton h-24 rounded-[16px]" /><div className="skeleton h-16 rounded-[16px]" /></div>}>{node}</Suspense>;

/** Blocks a page the signed-in role can't open (admin-only pages, or "No access" in Access Control). */
function Guard({ area, admin, children }: { area?: Area; admin?: boolean; children: ReactNode }) {
  const { user, can } = useStore();
  const label = area ? AREAS.find((a) => a.key === area)?.label.split(":")[0].toLowerCase() : undefined;
  if (admin && user?.role !== "admin") return <NoAccess />;
  if (area && can(area) === "none") return <NoAccess area={label} />;
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

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={<RequireAuth><Suspense fallback={null}><StaffLayout /></Suspense></RequireAuth>}>
          <Route index element={staffPage(<StaffToday />)} />
          <Route path="bookings" element={<Guard area="bookings">{staffPage(<StaffBookings />)}</Guard>} />
          <Route path="berths" element={<Guard area="berths">{staffPage(<StaffBerths />)}</Guard>} />
          <Route path="tasks" element={<Guard area="maintenance">{staffPage(<StaffTasks />)}</Guard>} />
          <Route path="me" element={staffPage(<StaffMe />)} />
        </Route>
        <Route element={<RequireAuth><OfficeOnly><Layout /></OfficeOnly></RequireAuth>}>
          <Route index element={<Guard area="dashboards">{lazyPage(<GlobalOverview />)}</Guard>} />
          <Route path="county/:id?" element={<Guard area="dashboards">{lazyPage(<CountyDashboard />)}</Guard>} />
          <Route path="city/:id?" element={<Guard area="dashboards">{lazyPage(<CityDashboard />)}</Guard>} />
          <Route path="marinas" element={<Guard area="marinas">{lazyPage(<Marinas />)}</Guard>} />
          <Route path="marinas/:id" element={<Guard area="marinas">{lazyPage(<MarinaDetail />)}</Guard>} />
          <Route path="berths" element={<Guard area="berths">{lazyPage(<Berths />)}</Guard>} />
          <Route path="bookings" element={<Guard area="bookings">{lazyPage(<ByQuery><Bookings /></ByQuery>)}</Guard>} />
          <Route path="locations" element={<Guard admin>{lazyPage(<Locations />)}</Guard>} />
          <Route path="staff" element={<Guard area="staff">{lazyPage(<ByQuery><StaffPage /></ByQuery>)}</Guard>} />
          <Route path="maintenance" element={<Guard area="maintenance">{lazyPage(<ByQuery><Maintenance /></ByQuery>)}</Guard>} />
          <Route path="users" element={<Guard area="owners">{lazyPage(<ByQuery><People /></ByQuery>)}</Guard>} />
          <Route path="billing" element={<Guard area="billing">{lazyPage(<ByQuery><Billing /></ByQuery>)}</Guard>} />
          <Route path="reports" element={<Guard area="reports">{lazyPage(<Reports />)}</Guard>} />
          <Route path="analytics" element={<Guard area="reports">{lazyPage(<Analytics />)}</Guard>} />
          <Route path="access" element={<Guard admin>{lazyPage(<AccessControl />)}</Guard>} />
          <Route path="settings" element={lazyPage(<Settings />)} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
