// The website's photos and product screenshots, each with its alt text (translated).
//
// Marina photos are from Unsplash (free to use under the Unsplash License); photographers are
// credited in the README. They show marinas in general, not one of ours, so their alt text and
// captions never name a marina. Each comes in two sizes: name.webp (1600 px) and name-800.webp.
//
// Screenshots of the web app, the owner's account and the Marina Berths app are taken with
// `npm run site-shots` (tools/guide-shots) in every language: /shots/<name>-<lang>.webp.
import { cx, getLang, t } from "@marina/shared";

export interface Photo { src: string; alt: () => string; width: number; height: number; credit: string }

export const PHOTOS = {
  dawn: { src: "/photos/marina-dawn", width: 1600, height: 1067, credit: "Cristina Gottardi", alt: () => t("Sailboats moored in a calm marina at sunrise, their masts reflected in the still water") },
  pier: { src: "/photos/dock-lifebuoy", width: 1600, height: 1068, credit: "Zach Lisko", alt: () => t("A wooden pier with a life ring, looking out over rows of sailboats in their berths on a clear day") },
  aerial: { src: "/photos/aerial-berth", width: 1600, height: 1067, credit: "Eric Ward", alt: () => t("Seen from above, a sailboat motors past motor yachts tied up along a floating dock") },
  harbor: { src: "/photos/harbor-dawn", width: 1600, height: 1200, credit: "Umberto Gorni", alt: () => t("Sailboats at a small dock in morning mist, with the moon still in the pale sky") },
  dock: { src: "/photos/boats-dock", width: 1600, height: 1067, credit: "Manny Peralta", alt: () => t("Motor yachts and sailboats along a marina walkway on a sunny day, with city buildings behind") },
  jetty: { src: "/photos/wooden-dock", width: 1600, height: 1067, credit: "Christine Caswell", alt: () => t("An empty wooden dock with a swim ladder at the end, on a calm lake lined with trees") },
} satisfies Record<string, Photo>;

/** A responsive photo: the 800 px file on small screens, 1600 px on large ones. */
export function Img({ photo, sizes = "100vw", className, eager }: { photo: Photo; sizes?: string; className?: string; eager?: boolean }) {
  return (
    <img
      src={`${photo.src}.webp`}
      srcSet={`${photo.src}-800.webp 800w, ${photo.src}.webp 1600w`}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={photo.alt()}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      className={cx("block h-full w-full object-cover", className)}
    />
  );
}

/** Product screenshots, taken in every language. */
export const SHOTS = {
  appHome: { file: "app", width: 600, height: 1298, alt: () => t("The Marina Berths app's home screen: your current stay, what you owe and your recent bookings") },
  appBook: { file: "app-book", width: 600, height: 1298, alt: () => t("The Marina Berths app showing free berths for the chosen dates, each with its size and exact price") },
  appInvoice: { file: "app-invoice", width: 600, height: 1298, alt: () => t("An invoice in the Marina Berths app, with its lines, what's been paid and a button to pay the rest") },
  results: { file: "web-results", width: 1600, height: 1000, alt: () => t("Search results on the website: berths that are free for the whole stay and fit the boat, with the price for each") },
  account: { file: "web-account", width: 1600, height: 1000, alt: () => t("A boat owner's account on the website: the next stay, what's owed, contracts to sign and recent bookings") },
  invoice: { file: "web-invoice", width: 1600, height: 1000, alt: () => t("An invoice in the owner's account, with a button to pay it online in full or in part") },
  contract: { file: "web-contracts", width: 1600, height: 1000, alt: () => t("Berth contracts in the owner's account, ready to read and sign online") },
  office: { file: "office-requests", width: 1600, height: 1000, alt: () => t("The dock office's web app: new booking requests waiting to be confirmed, with the berth, dates and boat") },
} as const;

export type ShotName = keyof typeof SHOTS;

/** A screenshot in the page's language. The home screen picture lives in /app (the "Get the app" section). */
export function Shot({ name, className, eager }: { name: ShotName; className?: string; eager?: boolean }) {
  const s = SHOTS[name];
  const src = name === "appHome" ? `/app/home-${getLang()}.webp` : `/shots/${s.file}-${getLang()}.webp`;
  return <img src={src} width={s.width} height={s.height} alt={s.alt()} loading={eager ? "eager" : "lazy"} decoding="async" className={cx("block h-auto w-full", className)} />;
}
