// Languages for every app: English (default), Spanish and Arabic (right to left).
// Text is written in English in the code and looked up in the Spanish and Arabic tables;
// anything missing falls back to English. The current language is module state (like the time
// zone), so plain functions and formatters can use it; apps re-render everything when it changes.
import { es } from "./es";
import { ar } from "./ar";

export type Lang = "en" | "es" | "ar";
export const LANGS: { code: Lang; name: string; english: string; rtl: boolean }[] = [
  { code: "en", name: "English", english: "English", rtl: false },
  { code: "es", name: "Español", english: "Spanish", rtl: false },
  { code: "ar", name: "العربية", english: "Arabic", rtl: true },
];

/** A translation, or plural forms chosen by the language's rules (Arabic has zero, one, two, few, many). */
export type Entry = string | Partial<Record<Intl.LDMLPluralRule, string>>;
const TABLES: Record<Exclude<Lang, "en">, Record<string, Entry>> = { es, ar };

let lang: Lang = "en";
let listeners: ((l: Lang) => void)[] = [];

export const getLang = () => lang;
export const isRtl = (l: Lang = lang) => l === "ar";
/** Intl locale for dates and numbers. Arabic keeps Western digits (0–9). */
export const locale = (l: Lang = lang) => (l === "es" ? "es-ES" : l === "ar" ? "ar-u-nu-latn" : "en-US");

export function setLang(l: Lang) {
  if (l === lang) return;
  lang = l;
  listeners.forEach((f) => f(l));
}
export function onLangChange(f: (l: Lang) => void) {
  listeners.push(f);
  return () => { listeners = listeners.filter((x) => x !== f); };
}

type Vars = Record<string, string | number | undefined | null>;
const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s);
/** "task|Open" shows "Open" in English; the part before | only tells translations apart. */
const plain = (text: string) => text.slice(text.indexOf("|") + 1);

/** Translate a phrase: t("Check in"), t("Berth {code}", { code: "A-04" }). */
export function t(text: string, vars?: Vars): string;
export function t(text: string | undefined, vars?: Vars): string | undefined;
export function t(text: string | undefined, vars?: Vars): string | undefined {
  if (text === undefined) return undefined;
  if (lang === "en") return fill(plain(text), vars);
  const e = TABLES[lang][text];
  const s = typeof e === "string" ? e : e?.other ?? plain(text);
  return fill(s, vars);
}

/** The English text with values filled in (for records like the activity log, which stay in English). */
export const en = (text: string, vars?: Vars) => fill(plain(text), vars);

const rules: Partial<Record<Lang, Intl.PluralRules>> = {};
/**
 * Count phrase with the right plural: tn(3, "{n} night", "{n} nights").
 * The Spanish/Arabic entry is keyed by the plural English phrase and may give per-category forms.
 */
export function tn(n: number, one: string, other: string, vars?: Vars): string {
  const v = { n, ...vars };
  if (lang === "en") return fill(n === 1 ? one : other, v);
  const e = TABLES[lang][other] ?? TABLES[lang][one];
  if (!e) return fill(n === 1 ? one : other, v);
  if (typeof e === "string") return fill(e, v);
  const cat = (rules[lang] ??= new Intl.PluralRules(locale(lang))).select(n);
  return fill(e[cat] ?? e.other ?? other, v);
}

// ---- Finished sentences (activity log) -------------------------------------------------------
// Activity entries are stored as English sentences. tx() shows them in the current language by
// matching the sentence against the phrases with {placeholders}; unknown text stays as written.
type Template = { re: RegExp; names: string[]; key: string };
let compiled: { lang: Lang; list: Template[] } | undefined;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function templates(): Template[] {
  if (compiled?.lang === lang) return compiled.list;
  const list = Object.keys(TABLES[lang as Exclude<Lang, "en">])
    .filter((k) => /\{\w+\}/.test(k) && /[A-Za-z]{2}/.test(plain(k).replace(/\{\w+\}/g, "")))
    .map((key) => {
      const names: string[] = [];
      const src = plain(key).split(/(\{\w+\})/).map((p) => {
        const m = p.match(/^\{(\w+)\}$/);
        if (!m) return escapeRe(p);
        names.push(m[1]);
        // Counts only match numbers, so "{n} ft" can't swallow a whole list ending in "25 ft".
        return /^n\d?$/.test(m[1]) ? "([\\d.,]+)" : "(.+?)";
      }).join("");
      return { re: new RegExp(`^${src}$`), names, key, weight: plain(key).replace(/\{\w+\}/g, "").length };
    })
    .sort((a, b) => b.weight - a.weight);
  compiled = { lang, list };
  return list;
}

/** Translate a finished English sentence, e.g. "Berth A-04 deleted", using the phrase "Berth {code} deleted". */
export function tx(text: string, depth = 0): string {
  if (lang === "en" || !text) return text;
  const table = TABLES[lang];
  if (table[text] !== undefined) return t(text);
  const cap = text.charAt(0).toUpperCase() + text.slice(1);
  if (table[cap] !== undefined) return t(cap);
  if (depth > 1) return text;
  for (const { re, names, key } of templates()) {
    const m = re.exec(text);
    if (!m) continue;
    const vars: Vars = {};
    names.forEach((k, i) => { vars[k] = tx(m[i + 1], depth + 1); });
    const n = Number(m[names.indexOf("n") + 1]);
    return names.includes("n") && Number.isFinite(n) ? tn(n, key, key, vars) : t(key, vars);
  }
  return text;
}
