// Reviews of stays: what boat owners say about a marina, with a 1–5 star rating.
//
// SAMPLE_REVIEWS are dummy reviews for the preview (sample: true). They're written to show the
// layout and must be replaced with real reviews from real stays before the site goes live: showing
// invented reviews to customers is misleading (and illegal in many places, e.g. the US FTC rule on
// fake reviews). They are never added to the search engines' structured data.
//
// Owners can rate a past stay in their account (Bookings → Past → Rate your stay). Until there's a
// backend those reviews are kept in this browser, like the rest of the sample data.
import { useSyncExternalStore } from "react";

export interface Review {
  id: string;
  marinaId: string;
  /** The reviewer as shown: first name and last initial. */
  name: string;
  boat?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Month of the stay, YYYY-MM. */
  stayed: string;
  nights: number;
  text: string;
  /** The language the review was written in (shown as written, not translated). */
  lang: "en" | "es" | "ar";
  /** A dummy review for the preview: replace with real ones before going live. */
  sample?: true;
  /** Set on reviews owners write in their account. */
  ownerId?: string;
  bookingId?: string;
}

export const SAMPLE_REVIEWS: Review[] = [
  { id: "rv-1", marinaId: "m-gg", name: "Daniel R.", boat: "Sea Lark, 34 ft", rating: 5, stayed: "2026-08", nights: 4, lang: "en", sample: true,
    text: "Booked on a Tuesday night, confirmed the next morning. The berth was exactly what the site said, and the dock office had our power hooked up before we'd tied off." },
  { id: "rv-2", marinaId: "m-sau", name: "Maya L.", boat: "Wren, 28 ft", rating: 5, stayed: "2026-07", nights: 3, lang: "en", sample: true,
    text: "Calm water, clean showers and a short walk into town. Paying the invoice from my phone was easier than at any marina we've stayed at." },
  { id: "rv-3", marinaId: "m-pl", name: "Carlos M.", boat: "Albatros, 41 ft", rating: 5, stayed: "2026-06", nights: 28, lang: "es", sample: true,
    text: "Pasamos un mes entero. El precio mensual fue justo y el personal siempre respondió rápido. Volveremos el próximo verano." },
  { id: "rv-4", marinaId: "m-sw", name: "Hannah K.", boat: "Blue Heron, 36 ft", rating: 4, stayed: "2026-09", nights: 2, lang: "en", sample: true,
    text: "Great location right on the waterfront. It's busy at weekends, so book early, but the search only showed berths that actually fit our boat." },
  { id: "rv-5", marinaId: "m-mbh", name: "Omar H.", boat: "Layla, 44 ft", rating: 5, stayed: "2026-03", nights: 7, lang: "ar", sample: true,
    text: "حجزت من التطبيق ووصل التأكيد في نفس اليوم. المرسى نظيف وهادئ والموظفون متعاونون جدًا." },
  { id: "rv-6", marinaId: "m-kw", name: "Rebecca T.", boat: "Island Time, 32 ft", rating: 5, stayed: "2026-02", nights: 10, lang: "en", sample: true,
    text: "Sunset from the dock every night. Fuel and pump-out were easy to arrange, and everything was on one invoice at the end." },
  { id: "rv-7", marinaId: "m-lw", name: "Peter S.", boat: "Fern, 24 ft", rating: 4, stayed: "2026-08", nights: 5, lang: "en", sample: true,
    text: "A quiet lake marina with friendly staff. Shore power was reliable. I'd like a few more visitor berths in summer." },
  { id: "rv-8", marinaId: "m-lo", name: "Jasmine W.", boat: "Halcyon, 38 ft", rating: 5, stayed: "2026-01", nights: 90, lang: "en", sample: true,
    text: "We took a seasonal contract and signed it online in five minutes. Same berth all winter, and the monthly price beat everywhere else on the river." },
  { id: "rv-9", marinaId: "m-cb", name: "Tom B.", boat: "Gull, 30 ft", rating: 4, stayed: "2026-05", nights: 3, lang: "en", sample: true,
    text: "Beautiful views of the bay and very easy to get in and out. Showers could do with an update, but the berth and the service were spot on." },
  { id: "rv-10", marinaId: "m-bp", name: "Lucía F.", boat: "Marea, 29 ft", rating: 5, stayed: "2026-04", nights: 6, lang: "es", sample: true,
    text: "Reservé sin pagar nada por adelantado y cancelé una fecha sin problemas. Muy buena experiencia de principio a fin." },
  { id: "rv-11", marinaId: "m-bh", name: "Ken A.", boat: "Northstar, 46 ft", rating: 5, stayed: "2026-09", nights: 2, lang: "en", sample: true,
    text: "Right by the Embarcadero. The app had the berth number and directions, so arriving late wasn't a problem at all." },
  { id: "rv-12", marinaId: "m-sp", name: "Grace L.", boat: "Northwind, 32 ft", rating: 5, stayed: "2026-07", nights: 14, lang: "en", sample: true,
    text: "Two weeks at Shilshole with no surprises on the bill. The invoice matched the price I saw when I booked." },
];

// ---- Reviews written by owners in this browser -----------------------------------------------

const KEY = "marina.site.reviews";
let cache: Review[] | undefined;
const listeners = new Set<() => void>();

function readOwn(): Review[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Review[];
  } catch {
    cache = [];
  }
  return cache;
}

/** Saves an owner's review of a stay (replacing an earlier one for the same booking). */
export function saveReview(r: Review) {
  const next = [...readOwn().filter((x) => x.bookingId !== r.bookingId), r];
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: kept for this visit */
  }
  listeners.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

/** Every review: owners' own (newest first), then the samples. */
export function useReviews(): Review[] {
  const own = useSyncExternalStore(subscribe, readOwn, () => []);
  return [...[...own].reverse(), ...SAMPLE_REVIEWS];
}

/** Average rating (one decimal) and count, or undefined when there are none. */
export function ratingOf(list: Review[]): { avg: number; count: number } | undefined {
  if (!list.length) return undefined;
  return { avg: Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10, count: list.length };
}
