// Page guides for every app, in every language. The web apps download one language's guides the
// first time someone opens a guide (loadGuides); the phone app ships them all (bundled.ts).
import type { Lang } from "../i18n";
import type { GuideBook, GuideKey } from "./types";

export * from "./types";
export * from "./shots";

const books: Partial<Record<Lang, GuideBook>> = {};

/** Makes a language's guides available without downloading (see bundled.ts). */
export function addGuides(lang: Lang, book: GuideBook) {
  books[lang] = book;
}

/** Fetches a language's guides. Safe to call again. */
export async function loadGuides(lang: Lang): Promise<GuideBook> {
  const have = books[lang];
  if (have) return have;
  const book = lang === "es" ? (await import("./es")).es : lang === "ar" ? (await import("./ar")).ar : (await import("./en")).en;
  books[lang] = book;
  return book;
}

/** A guide in the language asked for, falling back to English; undefined until loaded. */
export function guideFor(key: GuideKey, lang: Lang) {
  return books[lang]?.[key] ?? books.en?.[key];
}
