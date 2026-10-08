// Brand theme for React Native, built from the shared brand values (light and dark).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import { darkTheme, isRtl, lightTheme, type Theme } from "@marina/shared";
import { load, save } from "./lib/storage";

export type ThemeMode = "system" | "light" | "dark";

const LATIN = { regular: "Poppins_400Regular", medium: "Poppins_500Medium", semibold: "Poppins_600SemiBold" };
const ARABIC = { regular: "IBMPlexSansArabic_400Regular", medium: "IBMPlexSansArabic_500Medium", semibold: "IBMPlexSansArabic_600SemiBold" };

/** Font families. Text fonts switch to IBM Plex Sans Arabic in Arabic; numbers stay in Inter. */
export const fonts = {
  ...LATIN,
  num: "Inter_500Medium",
  numBold: "Inter_600SemiBold",
};

/** Called by the language provider before the app re-renders in the new language. */
export function setArabicFonts(on: boolean) {
  Object.assign(fonts, on ? ARABIC : LATIN);
}

interface ThemeCtx {
  t: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "marina.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  useEffect(() => {
    load<ThemeMode>(KEY).then((m) => m && setModeState(m));
  }, []);
  const setMode = (m: ThemeMode) => {
    setModeState(m);
    void save(KEY, m);
  };
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  return <Ctx.Provider value={{ t: dark ? darkTheme : lightTheme, mode, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used inside ThemeProvider");
  return c;
}

/**
 * Text aligned to the end of the line ("right" in English). Phones flip left and right by
 * themselves in Arabic (the layout direction is right to left); the web build needs it spelled out.
 */
export const alignEnd = (): "left" | "right" => (Platform.OS === "web" && isRtl() ? "left" : "right");

/** Mirror an arrow or chevron in Arabic so it points the way the text reads. */
export const flipRtl = () => (isRtl() ? { transform: [{ scaleX: -1 }] } : undefined);
