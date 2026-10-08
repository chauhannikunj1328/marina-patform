// Marina facts for the public website and the customer app: what berths a marina has and what
// they cost, and the marinas open for bookings.
import type { Db } from "./seed";
import type { Marina } from "./types";
import { CONTRACT_TERMS } from "./actions";
import { marinaCurrency } from "./selectors";
import { convert } from "./countries";
import { getLang, type Lang } from "./i18n";

export interface MarinaFacts {
  berths: number;
  /** Longest boat any berth takes, in feet. */
  maxLength: number;
  fromDaily: number;
  fromMonthly: number;
  /** Berth sizes on offer: the longest boat each size takes, with its lowest rates. */
  sizes: { maxLength: number; count: number; daily: number; monthly: number }[];
  power: boolean;
  water: boolean;
  /** The marina's currency: every rate above is in it. */
  currency: string;
}

export function marinaFacts(d: Db, marinaId: string): MarinaFacts {
  const berths = d.berths.filter((b) => b.marinaId === marinaId);
  const bySize = new Map<number, { maxLength: number; count: number; daily: number; monthly: number }>();
  for (const b of berths) {
    const s = bySize.get(b.maxLength) ?? { maxLength: b.maxLength, count: 0, daily: Infinity, monthly: Infinity };
    s.count += 1;
    s.daily = Math.min(s.daily, b.dailyRate);
    s.monthly = Math.min(s.monthly, b.monthlyRate);
    bySize.set(b.maxLength, s);
  }
  return {
    berths: berths.length,
    maxLength: Math.max(0, ...berths.map((b) => b.maxLength)),
    fromDaily: Math.min(...berths.map((b) => b.dailyRate)),
    fromMonthly: Math.min(...berths.map((b) => b.monthlyRate)),
    sizes: [...bySize.values()].sort((a, b) => a.maxLength - b.maxLength),
    currency: marinaCurrency(d, marinaId),
    power: berths.some((b) => b.power),
    water: berths.some((b) => b.water),
  };
}

/** Open marinas, grouped by state then city. */
export function openMarinas(d: Db): Marina[] {
  const city = (m: Marina) => d.cities.find((c) => c.id === m.cityId);
  const state = (m: Marina) => d.counties.find((c) => c.id === city(m)?.countyId)?.state ?? "";
  return d.marinas
    .filter((m) => m.status === "active")
    .sort((a, b) => state(a).localeCompare(state(b)) || (city(a)?.name ?? "").localeCompare(city(b)?.name ?? "") || a.name.localeCompare(b.name));
}

export const stateOf = (d: Db, m: Marina) => d.counties.find((c) => c.id === d.cities.find((x) => x.id === m.cityId)?.countyId)?.state ?? "";

/** Monthly fee for a contract term after its discount. */
export const termFee = (monthly: number, term: keyof typeof CONTRACT_TERMS) => Math.round(monthly * (1 - CONTRACT_TERMS[term].discount));

/**
 * The booking offices customers contact (website header, footer and contact page, and the
 * customer app): San Francisco for the US marinas, Dubai for the Gulf. Hours are in each office's
 * own time zone.
 */
export const OFFICES = [
  { id: "us", region: "United States", phone: "+1 (415) 555-0100", email: "hello@marina.com", hours: "Mon–Sat, 8 am – 6 pm", timeZone: "America/Los_Angeles" },
  { id: "gulf", region: "UAE and the Gulf", phone: "+971 4 555 0100", email: "gulf@marina.com", hours: "Sun–Thu, 8 am – 6 pm", timeZone: "Asia/Dubai" },
] as const;
export type Office = (typeof OFFICES)[number];

/** The offices, the one most visitors in this language want first (the Gulf office in Arabic). */
export const officesFor = (lang: Lang = getLang()): Office[] => (lang === "ar" ? [OFFICES[1], OFFICES[0]] : [OFFICES[0], OFFICES[1]]);

/** The main booking office for the current language: where the header's phone number goes. */
export const mainOffice = (lang: Lang = getLang()) => officesFor(lang)[0];

/** A phone number as a tel: link. */
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** The company's general contact (the US office), for search engines' company details. */
export const CONTACT = { email: OFFICES[0].email, phone: OFFICES[0].phone, hours: OFFICES[0].hours };

/**
 * Where to download the Marina Berths customer app. Empty until the store listings are live: the
 * website then shows the store badges as "Coming soon". Paste each listing's URL here when it's published.
 */
export const CUSTOMER_APP = {
  name: "Marina Berths",
  appStore: "",
  playStore: "",
};

/**
 * The lowest rate across several marinas, in the currency of the marina that has it (rates in
 * different currencies are compared in US dollars). E.g. "from $22 a night".
 */
export function lowestRate(d: Db, marinas: Marina[], kind: "daily" | "monthly" = "daily"): { amount: number; currency: string } {
  let best = { amount: 0, currency: "USD", usd: Infinity };
  for (const m of marinas) {
    const f = marinaFacts(d, m.id);
    const amount = kind === "daily" ? f.fromDaily : f.fromMonthly;
    const usd = convert(amount, f.currency, "USD", d.settings.fx);
    if (usd < best.usd) best = { amount, currency: f.currency, usd };
  }
  return { amount: best.amount, currency: best.currency };
}
