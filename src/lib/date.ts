// Dates are stored as ISO "YYYY-MM-DD" strings and treated as local calendar days.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Last `n` month keys ending with the current month, oldest first. */
export function lastMonths(n: number, from = today()): string[] {
  const d = fromISO(from);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(toISO(m).slice(0, 7));
  }
  return out;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Nights of [start, end) that fall inside the given month. */
export function nightsInMonth(start: string, end: string, key: string): number {
  const first = `${key}-01`;
  const last = addDays(`${key}-${String(daysInMonth(key)).padStart(2, "0")}`, 1);
  const s = start > first ? start : first;
  const e = end < last ? end : last;
  return Math.max(0, daysBetween(s, e));
}

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
// Guide 13: dates as "3 Oct 2026" (always three-letter months)
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateFmt = { format: (d: Date) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` };
const shortFmt = { format: (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}` };

export const fmtMonth = (key: string) => monthFmt.format(fromISO(`${key}-01`));
export const fmtDate = (iso: string) => dateFmt.format(fromISO(iso));
export const fmtShort = (iso: string) => shortFmt.format(fromISO(iso));

export function relative(iso: string): string {
  const diff = daysBetween(iso, today());
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  if (diff > 0) return `${diff} days ago`;
  return `In ${-diff} days`;
}

let timeZone = "America/Los_Angeles";
let timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
let dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone });

/** Called by the store when the company time zone setting changes. Times are shown in this zone. */
export function setTimeZone(tz: string) {
  if (tz === timeZone) return;
  timeZone = tz;
  timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone });
}

/** Current time in the company time zone, e.g. "2:05 pm PDT". */
export function nowInZone(tz = timeZone): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" }).format(new Date()).replace(/AM|PM/, (m) => m.toLowerCase());
}
/** Guide 13: relative under 24 hours (12h, 45m), otherwise "3 Oct, 2:05 pm". Accepts a date-time or a plain date. */
export function fmtDateTime(iso: string): string {
  if (iso.length <= 10) return fmtDate(iso);
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins >= 0 && mins < 60) return mins < 1 ? "Just now" : `${mins}m ago`;
  if (mins >= 60 && mins < 24 * 60) return `${Math.floor(mins / 60)}h ago`;
  return `${dayFmt.format(d).replace("Sept", "Sep")}, ${timeFmt.format(d).toLowerCase()}`;
}
