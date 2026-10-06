// Brand theme for React Native, built from the shared brand values (light and dark).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type Theme } from "@marina/shared";
import { load, save } from "./lib/storage";

export type ThemeMode = "system" | "light" | "dark";

export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  num: "Inter_500Medium",
  numBold: "Inter_600SemiBold",
} as const;

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
