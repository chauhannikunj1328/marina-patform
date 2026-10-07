// Map positions and links for marinas.
import type { City, Marina } from "./types";

export interface Point { lat: number; lng: number }

/** Where to put a marina on a map: its own position, or its city's center for older records. */
export function marinaPoint(m: Marina, city?: City): Point | undefined {
  if (typeof m.lat === "number" && typeof m.lng === "number") return { lat: m.lat, lng: m.lng };
  return city ? { lat: city.lat, lng: city.lng } : undefined;
}

/** True when a marina has its own position (not just its city's). */
export const hasOwnPoint = (m: Marina) => typeof m.lat === "number" && typeof m.lng === "number";

/** Opens the location in the phone's or browser's map app (Google Maps works everywhere). */
export const directionsUrl = (p: Point) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

/** Valid latitude and longitude. */
export const validPoint = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Data saved before marinas had positions: take them from the sample data where the marina matches. */
export function withMarinaPoints<T extends { marinas: Marina[] }>(db: T, sample: Marina[]): T {
  if (db.marinas.every(hasOwnPoint)) return db;
  const byId = new Map(sample.map((m) => [m.id, m]));
  return { ...db, marinas: db.marinas.map((m) => (hasOwnPoint(m) || !byId.get(m.id) || !hasOwnPoint(byId.get(m.id)!) ? m : { ...m, lat: byId.get(m.id)!.lat, lng: byId.get(m.id)!.lng })) };
}
