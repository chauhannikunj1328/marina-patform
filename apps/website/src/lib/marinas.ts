// Marina facts for the public pages: what berths a marina has and what they cost.
import { CONTRACT_TERMS, type Db, type Marina } from "@marina/shared";

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
