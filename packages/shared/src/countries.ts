// Countries we have marinas in, their currency, and exchange rates for company-wide totals.
//
// Each marina charges in its own country's currency: berth rates, bookings, invoices and payments
// at Dubai Marina are in dirhams (AED), at Jeddah in riyals (SAR). Anything about one booking,
// invoice or berth is shown in that marina's currency. Totals across marinas (dashboards, reports)
// are converted to the company's reporting currency (Settings → Currency) with the rates in
// Settings → Exchange rates (DEFAULT_FX until someone changes them).

import { t } from "./i18n";

export type CountryCode = "US" | "AE" | "SA" | "QA" | "BH" | "OM" | "KW";
export type CurrencyCode = "USD" | "CAD" | "EUR" | "GBP" | "AED" | "SAR" | "QAR" | "BHD" | "OMR" | "KWD";

export const COUNTRIES: Record<CountryCode, { name: string; currency: CurrencyCode; timeZone: string; dial: string }> = {
  US: { name: "United States", currency: "USD", timeZone: "America/Los_Angeles", dial: "+1" },
  AE: { name: "United Arab Emirates", currency: "AED", timeZone: "Asia/Dubai", dial: "+971" },
  SA: { name: "Saudi Arabia", currency: "SAR", timeZone: "Asia/Riyadh", dial: "+966" },
  QA: { name: "Qatar", currency: "QAR", timeZone: "Asia/Qatar", dial: "+974" },
  BH: { name: "Bahrain", currency: "BHD", timeZone: "Asia/Bahrain", dial: "+973" },
  OM: { name: "Oman", currency: "OMR", timeZone: "Asia/Muscat", dial: "+968" },
  KW: { name: "Kuwait", currency: "KWD", timeZone: "Asia/Kuwait", dial: "+965" },
};

export const CURRENCIES: CurrencyCode[] = ["USD", "AED", "SAR", "QAR", "BHD", "OMR", "KWD", "CAD", "EUR", "GBP"];

/**
 * US dollars for one unit of each currency. The Gulf currencies are pegged to the dollar (the
 * Kuwaiti dinar to a basket), so these change little; CAD, EUR and GBP are approximate.
 */
export const DEFAULT_FX: Record<CurrencyCode, number> = {
  USD: 1,
  AED: 0.2723,
  SAR: 0.2667,
  QAR: 0.2747,
  BHD: 2.6596,
  OMR: 2.6008,
  KWD: 3.2573,
  CAD: 0.73,
  EUR: 1.08,
  GBP: 1.27,
};

/** Converts an amount between currencies with the company's rates (or the defaults). */
export function convert(amount: number, from: string, to: string, fx?: Partial<Record<string, number>>): number {
  if (from === to) return amount;
  const rate = (c: string) => fx?.[c] ?? DEFAULT_FX[c as CurrencyCode] ?? 1;
  return (amount * rate(from)) / rate(to);
}

/** Decimals a currency's amounts are kept to: 3 for the Bahraini, Omani and Kuwaiti dinars, 2 otherwise. */
export const decimalsOf = (currency: string) => (currency === "BHD" || currency === "OMR" || currency === "KWD" ? 3 : 2);
/** An amount rounded to its currency's smallest unit (cents, fils). */
export const roundMoney = (amount: number, currency: string) => {
  const f = 10 ** decimalsOf(currency);
  return Math.round(amount * f) / f;
};

/** A price set in US dollars (dock extras, utilities) in another currency, rounded the way that currency is usually priced. */
export function localPrice(usd: number, currency: string, fx?: Partial<Record<string, number>>): number {
  const v = convert(usd, "USD", currency, fx);
  const step = currency === "BHD" || currency === "OMR" || currency === "KWD" ? 0.005 : currency === "USD" || currency === "CAD" || currency === "EUR" || currency === "GBP" ? 0.01 : 0.05;
  return Math.round(Math.round(v / step) * step * 1000) / 1000;
}

// ---- Lengths --------------------------------------------------------------------------------
// Boat and berth lengths are stored in feet. The Gulf mostly uses metres, so both are shown.

export const FT_PER_M = 3.28084;
export const toMetres = (ft: number) => Math.round((ft / FT_PER_M) * 10) / 10;
/** Feet from a length typed in feet or metres (rounded up, so the berth still fits). */
export const toFeet = (value: number, unit: "ft" | "m") => (unit === "m" ? Math.ceil(value * FT_PER_M) : Math.round(value));
/** A length in feet with metres alongside: "40 ft (12.2 m)". */
export const ftM = (ft: number | undefined) => (ft === undefined ? "" : t("{ft} ft ({m} m)", { ft, m: toMetres(ft) }));
