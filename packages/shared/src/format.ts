import { getLang, locale, onLangChange } from "./i18n";

let currencyCode = "USD";
let currency: Intl.NumberFormat;
let currency2: Intl.NumberFormat;
let num: Intl.NumberFormat;
let percent: Intl.NumberFormat;
let symbol = "$";
function build() {
  // Arabic shows money and percentages the Western way ($364,722, 74.3%), kept left to right inside Arabic text.
  const loc = getLang() === "ar" ? "en-US" : locale();
  currency = new Intl.NumberFormat(loc, { style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 });
  currency2 = new Intl.NumberFormat(loc, { style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  num = new Intl.NumberFormat(loc);
  percent = new Intl.NumberFormat(loc, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  symbol = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).formatToParts(0).find((p) => p.type === "currency")?.value ?? "$";
}
build();
onLangChange(build);

/** Called by the store when the company currency setting changes. */
export function setCurrency(code: string) {
  if (code === currencyCode) return;
  currencyCode = code;
  build();
}

// Intl puts narrow spaces and bidi marks around currency in some languages; keep them as plain spaces.
const tidy = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");
export const money = (n: number) => tidy(currency.format(n));
/** Guide 13: invoices show 2 decimals; summaries show none. */
export const money2 = (n: number) => tidy(currency2.format(n));
export const count = (n: number) => num.format(n);
export const pct = (n: number) => tidy(percent.format(n));

/** Compact money for chart axes: $1.2K, $3.4M */
export function moneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${symbol}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${symbol}${n}`;
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
