// Arabic names for places. Gulf marinas, their cities and emirates or provinces have names in
// Arabic (nameAr); the website and customer app show them when they're in Arabic. The admin apps
// keep the English names, which staff edit.
import type { Db } from "./seed";
import { getLang, type Lang } from "./i18n";

/** A place's name in the current language: its Arabic name in Arabic when it has one. */
export const placeName = (x: { name: string; nameAr?: string } | undefined) => (x ? (getLang() === "ar" && x.nameAr ? x.nameAr : x.name) : "");

/**
 * The data as people should read it in a language: in Arabic, marinas, cities and counties use
 * their Arabic names and addresses where they have them. For showing only; never save it back.
 */
export function localizeDb(db: Db, lang: Lang): Db {
  if (lang !== "ar") return db;
  return {
    ...db,
    counties: db.counties.map((c) => (c.nameAr ? { ...c, name: c.nameAr } : c)),
    cities: db.cities.map((c) => (c.nameAr ? { ...c, name: c.nameAr } : c)),
    marinas: db.marinas.map((m) => (m.nameAr || m.addressAr ? { ...m, name: m.nameAr ?? m.name, address: m.addressAr ?? m.address } : m)),
  };
}

/**
 * Puts the stored (English) names back on data that was built from localizeDb, so a change made
 * while the site is in Arabic never saves the Arabic names over the English ones.
 */
export function delocalizeDb(next: Db, stored: Db): Db {
  const back = <T extends { id: string; name: string; nameAr?: string }>(list: T[], original: T[], extra?: (x: T, o: T) => T) => {
    const byId = new Map(original.map((o) => [o.id, o]));
    return list.map((x) => {
      const o = byId.get(x.id);
      return o?.nameAr && x.name === o.nameAr ? (extra ? extra({ ...x, name: o.name }, o) : { ...x, name: o.name }) : x;
    });
  };
  return {
    ...next,
    counties: back(next.counties, stored.counties),
    cities: back(next.cities, stored.cities),
    marinas: back(next.marinas, stored.marinas, (x, o) => ({ ...x, address: o.address })),
  };
}
