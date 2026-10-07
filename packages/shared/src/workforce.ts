// Shifts, time off, swaps and hours worked. Used by the staff app and the web Staff page.
import type { Db } from "./seed";
import type { Berth, Shift, Staff, StaffRequest, TimeEntry } from "./types";
import { fromISO, toISO } from "./date";
import { getLang, locale } from "./i18n";

export type DayPlan =
  | { working: true; covering?: StaffRequest }
  | { working: false; why: "off" | "leave" | "swapped"; request?: StaffRequest };

/** Whether someone works on a given day, after approved time off and swaps. */
export function planFor(s: Staff, day: string, requests: StaffRequest[]): DayPlan {
  if (s.status === "on-leave") return { working: false, why: "leave" };
  const approved = requests.filter((r) => r.status === "approved");
  const leave = approved.find((r) => r.kind === "leave" && r.staffId === s.id && r.start <= day && r.end >= day);
  if (leave) return { working: false, why: "leave", request: leave };
  const out = approved.find((r) => r.kind === "swap" && r.staffId === s.id && r.start === day);
  if (out) return { working: false, why: "swapped", request: out };
  const cover = approved.find((r) => r.kind === "swap" && r.swapWithId === s.id && r.start === day);
  if (cover) return { working: true, covering: cover };
  return s.daysOff.includes(fromISO(day).getDay()) ? { working: false, why: "off" } : { working: true };
}

/** The open clock-in for someone, if they're on the clock. */
export const openEntry = (db: Db, staffId: string): TimeEntry | undefined => db.timeEntries.find((e) => e.staffId === staffId && !e.end);

/** Minutes worked in entries that started on or after `from` (ISO date) and before `to` (exclusive). */
export function minutesWorked(entries: TimeEntry[], staffId: string, from: string, to: string, now = Date.now()): number {
  return entries
    .filter((e) => e.staffId === staffId && localDay(e.start) >= from && localDay(e.start) < to)
    .reduce((t, e) => t + Math.max(0, ((e.end ? Date.parse(e.end) : now) - Date.parse(e.start)) / 60_000), 0);
}

/** "7 h 45 m", "25 m" (Arabic: "7 س 45 د"). */
export function fmtDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const [H, M] = getLang() === "ar" ? ["س", "د"] : ["h", "m"];
  return h ? `${h} ${H}${m % 60 ? ` ${m % 60} ${M}` : ""}` : `${m} ${M}`;
}

/** "9:02 am" (or "09:02" in Spanish, "9:02 ص" in Arabic) in the device's clock. */
export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit", hourCycle: getLang() === "es" ? "h23" : "h12" }).format(new Date(iso)).replace(/AM|PM/, (m) => m.toLowerCase()).replace(/[\u202f\u00a0]/g, " ");
}

/** Local calendar day of a date-time, as ISO date. */
export const localDay = (iso: string) => toISO(new Date(iso));

/** The shift someone works on a day: their own, or the colleague's they're covering. Undefined when not working. */
export function shiftOn(s: Staff, day: string, requests: StaffRequest[], staff: Staff[]): Shift | undefined {
  const p = planFor(s, day, requests);
  if (!p.working) return undefined;
  return p.covering ? staff.find((x) => x.id === p.covering?.staffId)?.shift ?? s.shift : s.shift;
}

/** Checks before a boat arrives. Power and water only apply when the berth has them. */
export function prepChecklist(berth: { power: boolean; water: boolean } | undefined): { id: string; label: string }[] {
  return [
    { id: "clear", label: "Berth clear of debris and other boats" },
    { id: "cleats", label: "Cleats and dock lines in good shape" },
    ...(berth?.power ? [{ id: "power", label: "Power pedestal works" }] : []),
    ...(berth?.water ? [{ id: "water", label: "Water tap works" }] : []),
    { id: "fenders", label: "Fenders in place" },
    { id: "number", label: "Berth number visible" },
  ];
}

/** Patrol route for a marina: every dock, then the safety checks. */
export function patrolCheckpoints(berths: Berth[]): { id: string; label: string; kind: "dock" | "safety" }[] {
  const docks = [...new Set(berths.map((b) => b.code.split("-")[0]))].sort();
  return [
    ...docks.map((d) => ({ id: `dock-${d}`, label: `Dock ${d}`, kind: "dock" as const })),
    { id: "safety-fire", label: "Fire extinguishers in place and in date", kind: "safety" },
    { id: "safety-rings", label: "Life rings on their hooks", kind: "safety" },
    { id: "safety-lights", label: "Dock lighting working", kind: "safety" },
    { id: "safety-power", label: "No damaged power cords or pedestals", kind: "safety" },
    { id: "safety-gates", label: "Gates closed and locked", kind: "safety" },
    { id: "safety-fuel", label: "Fuel dock tidy, no spills", kind: "safety" },
  ];
}

/** Hourly pay by position when a staff record has no rate of its own. */
export const DEFAULT_HOURLY: Record<string, number> = { "Marina Manager": 38, "Dock Hand": 24, "Front Desk Associate": 22, "Security Guard": 23 };
export const hourlyRateOf = (s: Staff) => s.hourlyRate ?? DEFAULT_HOURLY[s.position] ?? 22;

/** Pay for a week: up to 40 hours regular, the rest at time and a half. */
export function weeklyPay(minutes: number, rate: number) {
  const hours = minutes / 60;
  const regular = Math.min(40, hours);
  const overtime = Math.max(0, hours - 40);
  return { regular, overtime, gross: Math.round((regular * rate + overtime * rate * 1.5) * 100) / 100 };
}
