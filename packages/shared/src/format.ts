import { getLang, locale, onLangChange } from "./i18n";

let currencyCode = "USD";
let num: Intl.NumberFormat;
let percent: Intl.NumberFormat;
/** Formatters per currency: whole amounts, invoice amounts (the currency's own decimals: 2, or 3 for BHD, OMR, KWD), symbol. */
let cache = new Map<string, { whole: Intl.NumberFormat; exact: Intl.NumberFormat; symbol: string }>();
function build() {
  num = new Intl.NumberFormat(loc());
  percent = new Intl.NumberFormat(loc(), { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  cache = new Map();
}
// Arabic shows money and percentages the Western way ($364,722, AED 1,250, 74.3%), kept left to right inside Arabic text.
const loc = () => (getLang() === "ar" ? "en-US" : locale());
function fmt(code: string) {
  let f = cache.get(code);
  if (!f) {
    const exact = new Intl.NumberFormat(loc(), { style: "currency", currency: code, currencyDisplay: "narrowSymbol" });
    const digits = Math.max(2, exact.resolvedOptions().maximumFractionDigits ?? 2);
    f = {
      whole: new Intl.NumberFormat(loc(), { style: "currency", currency: code, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }),
      exact: new Intl.NumberFormat(loc(), { style: "currency", currency: code, currencyDisplay: "narrowSymbol", minimumFractionDigits: digits, maximumFractionDigits: digits }),
      symbol: new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code,
    };
    cache.set(code, f);
  }
  return f;
}
build();
onLangChange(build);

/** Called by the store when the company's reporting currency setting changes. */
export function setCurrency(code: string) {
  if (code === currencyCode) return;
  currencyCode = code;
}
/** The reporting currency: what money() uses when no currency is given. */
export const reportingCurrency = () => currencyCode;

// Intl puts narrow spaces and bidi marks around currency in some languages; keep them as plain spaces.
// Codes without a symbol (AED, SAR…) get a space before the number: "AED 1,250".
const tidy = (s: string) => s.replace(/[\u202f\u00a0]/g, " ").replace(/^([A-Z]{3})(?=[\d-])/, "$1 ").replace(/^-([A-Z]{3})(?=\d)/, "-$1 ");
/**
 * Money in whole units: money(1250) in the reporting currency, money(1250, "AED") in a marina's
 * currency. Pass the marina's currency for anything about one berth, booking or invoice.
 */
export const money = (n: number, currency?: string) => tidy(fmt(currency || currencyCode).whole.format(n));
/** Guide 13: invoices show the currency's decimals (2, or 3 for BHD, OMR and KWD); summaries show none. */
export const money2 = (n: number, currency?: string) => tidy(fmt(currency || currencyCode).exact.format(n));
export const count = (n: number) => num.format(n);
export const pct = (n: number) => tidy(percent.format(n));

/** Compact money for chart axes: $1.2K, $3.4M, AED 12K */
export function moneyShort(n: number, currency?: string): string {
  const s = fmt(currency || currencyCode).symbol;
  const sym = /^[A-Z]{3}$/.test(s) ? `${s} ` : s;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${sym}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sym}${n}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * A total of amounts that may be in different currencies, without converting: "$120 + AED 400".
 * For what one boat owner owes or has paid, where each invoice is in its marina's currency.
 */
export function moneyTotal(items: { amount: number; currency: string }[], exact = false): string {
  const sums = new Map<string, number>();
  for (const i of items) sums.set(i.currency, (sums.get(i.currency) ?? 0) + i.amount);
  if (!sums.size) return (exact ? money2 : money)(0);
  return [...sums].map(([c, n]) => (exact ? money2 : money)(n, c)).join(" + ");
}
