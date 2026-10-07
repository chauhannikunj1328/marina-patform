// App language for the mobile app: English or Spanish (Español) for dock teams.
// Strings are written in English and looked up in the Spanish table; anything missing stays English.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { load, save } from "./storage";
import { es } from "./es";

export type Lang = "en" | "es";
type Vars = Record<string, string | number | undefined>;
export type Tr = (text: string, vars?: Vars) => string;

const KEY = "marina.lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; tr: Tr } | null>(null);

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s);
/** "task|Open" is "Open" in English; the part before | only tells translations apart. */
const plain = (text: string) => text.slice(text.indexOf("|") + 1);

/** Phone language on first run (Spanish phones start in Spanish), then the person's choice. */
const deviceLang = (): Lang => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith("es") ? "es" : "en";
  } catch {
    return "en";
  }
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);
  useEffect(() => {
    load<Lang>(KEY).then((l) => l && setLangState(l));
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void save(KEY, l);
  }, []);
  const tr = useCallback<Tr>((text, vars) => fill(lang === "es" ? es[text] ?? plain(text) : plain(text), vars), [lang]);
  return <Ctx.Provider value={{ lang, setLang, tr }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}

/** Shortcut: `const tr = useTr(); tr("Check in")`. */
export const useTr = () => useLang().tr;
