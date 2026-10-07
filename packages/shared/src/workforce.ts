// Shifts, time off, swaps and hours worked. Used by the staff app and the web Staff page.
import type { Db } from "./seed";
import type { Shift, Staff, StaffRequest, TimeEntry } from "./types";
import { fromISO, toISO } from "./date";

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

/** "7 h 45 m", "25 m". */
export function fmtDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  return h ? `${h} h${m % 60 ? ` ${m % 60} m` : ""}` : `${m} m`;
}

/** "9:02 am" in the device's clock. */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Local calendar day of a date-time, as ISO date. */
export const localDay = (iso: string) => toISO(new Date(iso));

/** The shift someone works on a day: their own, or the colleague's they're covering. Undefined when not working. */
export function shiftOn(s: Staff, day: string, requests: StaffRequest[], staff: Staff[]): Shift | undefined {
  const p = planFor(s, day, requests);
  if (!p.working) return undefined;
  return p.covering ? staff.find((x) => x.id === p.covering?.staffId)?.shift ?? s.shift : s.shift;
}
