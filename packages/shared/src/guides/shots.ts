// Screenshots for the page guides: one per guide section, taken automatically in every language by
// tools/guide-shots. Each one says which page to open, what to click first, and which elements to
// box in red (numbered in order). Text in targets is the English UI text; the script translates it.
import type { Lang } from "../i18n";
import type { GuideKey } from "./types";

/** Who's signed in when the picture is taken. */
export type ShotUser = "admin" | "manager" | "staff" | "owner" | "visitor";

/** An element on the page, found by its role and accessible name, its label, its text, or a CSS selector. */
export interface Target {
  role?: "button" | "link" | "tab" | "textbox" | "combobox" | "heading" | "checkbox" | "radio" | "menuitemradio" | "dialog" | "region" | "group" | "spinbutton";
  /** Accessible name (or visible text with `text`), in English. */
  name?: string;
  /** Field label, in English. */
  label?: string;
  /** Values for {placeholders} in name, label or text (names of marinas, berths and the like). */
  vars?: Record<string, string>;
  /** The vars are English UI text too, so translate them as well. */
  translateVars?: boolean;
  /** Visible text, in English. */
  text?: string;
  /** Placeholder text of a field, in English. */
  placeholder?: string;
  css?: string;
  /** Match the whole name exactly (default) or just part of it. */
  exact?: boolean;
  /** Which match to use when there are several (default the first). */
  nth?: number;
  /** Look only inside the top-most dialog. */
  inDialog?: boolean;
  /** Box the card the element is in (web app and website). */
  card?: boolean;
  /** Box this many parents up instead of the element itself. */
  up?: number;
}

export type ShotAction =
  | { click: Target }
  | { fill: Target; value: string }
  | { press: string }
  | { wait: number }
  | { scroll: Target };

export interface Shot {
  /** Route to open, e.g. "/bookings". */
  path: string;
  as: ShotUser;
  actions?: ShotAction[];
  /** Elements boxed in red, numbered in this order. */
  boxes: Target[];
}

/** Which app a guide belongs to, from its key. */
export const guideApp = (key: GuideKey) => (key.startsWith("w.") ? "web" : key.startsWith("s.") ? "website" : "mobile");

/** File name of a section's picture, e.g. "es/w.bookings-2.webp". */
export const shotFile = (key: GuideKey, section: number, lang: Lang) => `${lang}/${key}-${section}.webp`;
