// Web app language: English (default), Spanish or Arabic. Sets <html lang/dir> (Arabic is right to
// left) and remounts the app when it changes so every screen, date and number re-renders.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { getLang, isRtl, LANGS, setLang as setShared, type Lang } from "@marina/shared";

const KEY = "marina.lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);

function apply(l: Lang) {
  setShared(l);
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
}

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.some((x) => x.code === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

// Set before the first render, so nothing flashes in the wrong language or direction.
apply(initial());

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());
  const setLang = useCallback((l: Lang) => {
    apply(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* storage unavailable */
    }
    setLangState(l);
  }, []);
  return (
    <Ctx.Provider value={{ lang, setLang }}>
      <div key={lang} className="contents">{children}</div>
    </Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}
