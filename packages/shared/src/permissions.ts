// Role permissions (Access Control). Admins always have full access; the matrix
// controls managers and staff. "No access" hides the page from the menu and blocks
// its route; "View only" keeps the page but hides its create and edit actions.
import type { Role } from "./types";

export type Level = "full" | "own" | "view" | "none";
export type Area = "dashboards" | "marinas" | "berths" | "bookings" | "staff" | "maintenance" | "owners" | "billing" | "reports";
export type Permissions = Record<Area, Record<"manager" | "staff", Level>>;

export const AREAS: { key: Area; label: string; routes: string[] }[] = [
  { key: "dashboards", label: "Global, county and city dashboards", routes: ["/", "/county", "/city"] },
  { key: "marinas", label: "Marinas: add, edit, deactivate", routes: ["/marinas"] },
  { key: "berths", label: "Berths: add, edit, maintenance", routes: ["/berths"] },
  { key: "bookings", label: "Bookings and contracts: create, approve, check in/out", routes: ["/bookings", "/contracts"] },
  { key: "staff", label: "Staff and shifts", routes: ["/staff"] },
  { key: "maintenance", label: "Work orders and incidents", routes: ["/maintenance", "/incidents"] },
  { key: "owners", label: "Boat owners", routes: ["/users"] },
  { key: "billing", label: "Billing: invoices, payments, reminders", routes: ["/billing"] },
  { key: "reports", label: "Reports and analytics", routes: ["/reports", "/analytics"] },
];

/** Areas only admins can ever open. */
export const ADMIN_ONLY = [
  { label: "Locations (counties and cities)", routes: ["/locations"] },
  { label: "Users and access control", routes: ["/access"] },
];

export const DEFAULT_PERMISSIONS: Permissions = {
  dashboards: { manager: "own", staff: "none" },
  marinas: { manager: "own", staff: "view" },
  berths: { manager: "own", staff: "own" },
  bookings: { manager: "own", staff: "own" },
  staff: { manager: "own", staff: "view" },
  maintenance: { manager: "own", staff: "own" },
  owners: { manager: "own", staff: "view" },
  billing: { manager: "own", staff: "own" },
  reports: { manager: "own", staff: "none" },
};

export const LEVEL_LABEL: Record<Level, string> = { full: "All marinas", own: "Assigned marinas", view: "View only", none: "No access" };

export function areaForPath(path: string): Area | undefined {
  return AREAS.find((a) => a.routes.some((r) => (r === "/" ? path === "/" : path === r || path.startsWith(r + "/") || path.startsWith(r + "?"))))?.key;
}

export function levelFor(perms: Permissions, role: Role | undefined, area: Area | undefined): Level {
  if (!role) return "none";
  if (role === "admin" || !area) return "full";
  return perms[area]?.[role] ?? "none";
}
