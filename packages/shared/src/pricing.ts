import type { Berth } from "./types";
import { addDays, daysBetween, fromISO } from "./date";

/** Admin pricing rules (Settings → Pricing). They apply to nightly stays booked after they're saved. */
export interface PricingRules {
  /** Extra % on Friday and Saturday nights. */
  weekendPct: number;
  /** % off stays of at least `longStayNights` nights (below the monthly rate). 0 = off. */
  longStayPct: number;
  longStayNights: number;
  /** Date ranges with a different nightly rate (+% or −%), as MM-DD so they repeat every year. */
  seasons: { id: string; name: string; from: string; to: string; pct: number }[];
}

export const DEFAULT_PRICING: PricingRules = { weekendPct: 0, longStayPct: 0, longStayNights: 7, seasons: [] };

/** Season covering a night (MM-DD ranges may wrap the new year, e.g. 12-15 to 01-05). */
export function seasonOn(day: string, rules?: PricingRules) {
  const md = day.slice(5);
  return rules?.seasons.find((s) => (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to));
}

/** Long stays (default 28+ nights) are billed at the monthly rate, prorated per 30 nights. Shorter stays add up night by night. */
export function bookingAmount(start: string, end: string, berth: Berth, monthlyFrom = 28, rules?: PricingRules): number {
  const nights = daysBetween(start, end);
  if (nights >= monthlyFrom) return Math.round((berth.monthlyRate * nights) / 30);
  if (!rules) return nights * berth.dailyRate;
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const day = addDays(start, i);
    const weekday = fromISO(day).getDay();
    const season = seasonOn(day, rules);
    total += berth.dailyRate * (1 + (season?.pct ?? 0) / 100) * (weekday === 5 || weekday === 6 ? 1 + rules.weekendPct / 100 : 1);
  }
  if (rules.longStayPct && nights >= rules.longStayNights) total *= 1 - rules.longStayPct / 100;
  return Math.round(total);
}

export function priceNote(start: string, end: string, monthlyFrom = 28, rules?: PricingRules): string {
  const nights = daysBetween(start, end);
  if (nights >= monthlyFrom) return `Monthly rate, ${nights} nights prorated`;
  const parts = [`${nights} nights × daily rate`];
  if (rules) {
    const seasons = [...new Set(Array.from({ length: nights }, (_, i) => seasonOn(addDays(start, i), rules)?.name).filter(Boolean))];
    if (seasons.length) parts.push(seasons.join(", "));
    if (rules.weekendPct && Array.from({ length: nights }, (_, i) => fromISO(addDays(start, i)).getDay()).some((d) => d === 5 || d === 6)) parts.push(`weekend +${rules.weekendPct}%`);
    if (rules.longStayPct && nights >= rules.longStayNights) parts.push(`long stay −${rules.longStayPct}%`);
  }
  return parts.join(" · ");
}
