// Light or dark: follows the device until the visitor picks one with the header button.
import { useEffect, useState } from "react";

const KEY = "marina.site.theme";
type Theme = "light" | "dark";

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

const system = (): Theme => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Applied before the first render so the page doesn't flash the wrong theme. */
export function startTheme() {
  document.documentElement.dataset.theme = saved() ?? system();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  // Follow the device's setting while the visitor hasn't chosen one.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { if (!saved()) setTheme(system()); };
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this visit */
    }
    setTheme(next);
  };
  return [theme, toggle] as const;
}
