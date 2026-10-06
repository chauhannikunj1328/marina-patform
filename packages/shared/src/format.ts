let currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
let symbol = "$";
let currencyCode = "USD";
const num = new Intl.NumberFormat("en-US");

/** Called by the store when the company currency setting changes. */
export function setCurrency(code: string) {
  currencyCode = code;
  currency = new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 });
  symbol = currency.formatToParts(0).find((p) => p.type === "currency")?.value ?? "$";
}

export const money = (n: number) => currency.format(n);
/** Guide 13: invoices show 2 decimals; summaries show none. */
export const money2 = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, minimumFractionDigits: 2 }).format(n);
export const count = (n: number) => num.format(n);
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

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
