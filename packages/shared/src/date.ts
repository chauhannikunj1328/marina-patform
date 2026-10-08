import { getLang, locale, onLangChange, t, tn, type Lang } from "./i18n";
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

// Guide 13: dates as "3 Oct 2026" (always three-letter months). Spanish and Arabic use their own month names.
const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
const mon = (d: Date) => MONTHS[getLang()][d.getMonth()];

export const fmtMonth = (key: string) => mon(fromISO(`${key}-01`));
export const fmtDate = (iso: string) => { const d = fromISO(iso); return `${d.getDate()} ${mon(d)} ${d.getFullYear()}`; };
export const fmtShort = (iso: string) => { const d = fromISO(iso); return `${d.getDate()} ${mon(d)}`; };

/** Weekday short names, Sunday first. */
export const weekday = (i: number) => ({ en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] })[getLang()][i];

export function relative(iso: string): string {
  const diff = daysBetween(iso, today());
  if (diff === 0) return t("Today");
  if (diff === 1) return t("Yesterday");
  if (diff === -1) return t("Tomorrow");
  if (diff > 0) return tn(diff, "{n} day ago", "{n} days ago");
  return tn(-diff, "In {n} day", "In {n} days");
}

let timeZone = "America/Los_Angeles";
const timeFormatter = (tz: string) => new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit", timeZone: tz, hourCycle: getLang() === "es" ? "h23" : "h12" });
let timeFmt = timeFormatter(timeZone);
const rebuild = () => { timeFmt = timeFormatter(timeZone); };
onLangChange(rebuild);

/** Called by the store when the company time zone setting changes. Times not tied to a marina are shown in this zone. */
export function setTimeZone(tz: string) {
  if (tz === timeZone) return;
  timeZone = tz;
  rebuild();
}

// Each marina's own time zone (Pacific, Eastern, Gulf…). Clock-ins, patrols, meter readings and
// other times at a marina are shown in its local time, wherever the reader is.
let marinaZones: Record<string, string> = {};
/** Called by each app's store with every marina's time zone (see marinaTimeZone). */
export function setMarinaTimeZones(zones: Record<string, string>) {
  marinaZones = zones;
}
/** A marina's time zone, or the company's when there's no marina. */
export const zoneOf = (marinaId?: string) => (marinaId && marinaZones[marinaId]) || timeZone;

const partsIn = (ms: number, tz: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute) };
};
/** Minutes a time zone is ahead of UTC at a moment. */
const offsetAt = (ms: number, tz: string) => {
  const p = partsIn(ms, tz);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(ms / 60_000) * 60_000) / 60_000;
};

/** The moment a wall-clock time happens in a time zone: zonedTime("2026-10-08", 9 * 60, "Asia/Dubai") is 9:00 am in Dubai. */
export function zonedTime(day: string, minutes: number, tz: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  let ms = wall - offsetAt(wall, tz) * 60_000;
  ms = wall - offsetAt(ms, tz) * 60_000; // once more, in case daylight saving changes in between
  return new Date(ms);
}

/** The calendar day a moment falls on in a time zone, as ISO date. */
export function dayIn(iso: string, tz: string): string {
  const p = partsIn(Date.parse(iso), tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** A time zone's short name now, e.g. "PDT", "GST" (or "GMT+4" where there's no common name). */
export const zoneName = (tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value ?? "";

/** "2:05 pm" (English), "14:05" (Spanish), "2:05 م" (Arabic). */
export const clock = (d: Date, tz?: string) => (tz ? timeFormatter(tz) : timeFmt).format(d).replace(/AM|PM/, (m) => m.toLowerCase()).replace(/\u202f/g, " ");

/** Current time in the company time zone, e.g. "2:05 pm PDT". */
export function nowInZone(tz = timeZone): string {
  return new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" }).format(new Date()).replace(/AM|PM/, (m) => m.toLowerCase());
}
/**
 * Guide 13: relative under 24 hours (12h, 45m), otherwise "3 Oct, 2:05 pm". Accepts a date-time or
 * a plain date. Pass a time zone (e.g. zoneOf(marinaId)) to show the time there.
 */
export function fmtDateTime(iso: string, tz = timeZone): string {
  if (iso.length <= 10) return fmtDate(iso);
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins >= 0 && mins < 60) return mins < 1 ? t("Just now") : t("{n}m ago", { n: mins });
  if (mins >= 60 && mins < 24 * 60) return t("{n}h ago", { n: Math.floor(mins / 60) });
  const local = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  return `${local.getDate()} ${mon(local)}, ${clock(d, tz)}`;
}

/** Same day n months later (clamped to the month's last day). */
export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toISO(d);
}
