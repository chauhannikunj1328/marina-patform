// App language: English (default), Spanish (Español) or Arabic (العربية, right to left).
// Text and translations live in @marina/shared; this keeps the person's choice and re-renders the
// app when it changes. Arabic turns the layout around: React Native's RTL flag for the next launch,
// a right-to-left root view right away, and the page direction on web.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nManager, Platform, View } from "react-native";
import { isRtl, setLang as setSharedLang, t, type Lang } from "@marina/shared";
import { load, save } from "./storage";
import { setArabicFonts } from "@/theme";

export type { Lang };
type Vars = Record<string, string | number | undefined | null>;
/** Same as the shared t(); a new function per language so screens re-render. */
export type Tr = typeof t;

const KEY = "marina.lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; tr: Tr; rtl: boolean } | null>(null);

function apply(l: Lang) {
  setSharedLang(l);
  setArabicFonts(l === "ar");
  const rtl = isRtl(l);
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = rtl ? "rtl" : "ltr";
    }
  } else {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  // English until the saved choice loads (English is the default language).
  const [lang, setLangState] = useState<Lang>(() => {
    apply("en");
    return "en";
  });
  useEffect(() => {
    load<Lang>(KEY).then((l) => {
      if (l && l !== lang) {
        apply(l);
        setLangState(l);
      }
    });
    // Read the saved choice once on start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setLang = useCallback((l: Lang) => {
    apply(l);
    setLangState(l);
    void save(KEY, l);
  }, []);
  // A new function per language, so memoized screens that depend on it re-render too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tr = useMemo(() => ((text: string | undefined, vars?: Vars) => t(text, vars)) as Tr, [lang]);
  const rtl = isRtl(lang);
  return (
    <Ctx.Provider value={{ lang, setLang, tr, rtl }}>
      {/* Mirrors the layout right away, without waiting for the native RTL flag to apply on the
          next launch. Screens re-render through useTr, which changes with the language. */}
      <View style={{ flex: 1, direction: rtl ? "rtl" : "ltr" }}>
        {children}
      </View>
    </Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}

/** Shortcut: `const tr = useTr(); tr("Check in")`. */
export const useTr = () => useLang().tr;
