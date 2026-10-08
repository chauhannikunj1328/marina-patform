// Website language: English (default), Spanish or Arabic. Each language has its own addresses
// (/marinas, /es/marinas, /ar/marinas) so search engines can index all three; the address decides
// the language. Sets <html lang/dir> (Arabic is right to left) and remounts the site, router
// included, when it changes so every page, link, date and number re-renders.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { getLang, isRtl, LANGS, loadLang, setLang as setShared, type Lang } from "@marina/shared";
import { langBase, langOfPath, stripLang, withLang } from "./seo";

const KEY = "marina.lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);

function apply(l: Lang) {
  setShared(l);
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
}

function saved(): Lang | null {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.some((x) => x.code === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return null;
}

function save(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage unavailable */
  }
}

/** Moves the address bar to the same page in another language, without reloading. */
function moveTo(l: Lang) {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, "", withLang(stripLang(pathname), l) + search + hash);
}

/**
 * Picks the language and loads its translations. main.tsx waits for this before the first render,
 * so nothing flashes in the wrong language or direction.
 *
 * The address decides: /es/... is Spanish, /ar/... Arabic. Someone who chose Spanish or Arabic
 * before and comes back to an English address from outside the site (a bookmark, a search result)
 * is moved to their language; links inside the site, like the footer's language links, aren't.
 */
export async function startLang() {
  const fromUrl = langOfPath(window.location.pathname);
  let l: Lang = fromUrl ?? "en";
  if (!fromUrl) {
    const pref = saved();
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      /* no referrer */
    }
    if (pref && pref !== "en" && !internal) {
      l = pref;
      moveTo(l);
    }
  }
  try {
    await loadLang(l);
    apply(l);
  } catch {
    apply("en"); // translations couldn't be fetched (offline): English until they can
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());
  const setLang = useCallback((l: Lang) => {
    // Spanish and Arabic are downloaded the first time they're chosen.
    loadLang(l).then(
      () => {
        moveTo(l);
        apply(l);
        save(l);
        setLangState(l);
      },
      () => {
        /* offline: stay in the current language */
      },
    );
  }, []);
  return (
    <Ctx.Provider value={{ lang, setLang }}>
      <BrowserRouter key={lang} basename={langBase(lang) || undefined}>{children}</BrowserRouter>
    </Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}
