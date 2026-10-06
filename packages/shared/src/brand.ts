// Marina Brand to Product Handoff Guide v1 as plain values, for apps that can't read the
// web app's CSS variables (React Native). Keep in sync with apps/web/src/index.css.

export const palette = {
  slate: { 50: "#F5F5F5", 100: "#DCDDDF", 600: "#60666D", 700: "#484F57", 800: "#2F3740", 900: "#1F252B" },
  teal: { 100: "#D9E1E3", 200: "#BCCBCE", 300: "#9FB4B9", 500: "#66878E", 600: "#497079", 800: "#2F4A51" },
  sun: { 100: "#FEECC7", 200: "#F7E8A6", 400: "#FBBE3C" },
  green: { base: "#0E9A50", text: "#0B6B37", dark: "#34C27A" },
  ink: "#17191E",
  white: "#FFFFFF",
} as const;

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  sidebar: string;
  raised: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  text3: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  green: string;
  greenText: string;
  focus: string;
  tealStrong: string;
  onTealStrong: string;
  tealSoft: string;
  onTealSoft: string;
  success: { bg: string; fg: string };
  warning: { bg: string; fg: string };
  error: { bg: string; fg: string; base: string };
  info: { bg: string; fg: string };
  status: {
    active: string;
    pending: { bg: string; fg: string };
    cancelled: string;
    maintenance: { bg: string; fg: string };
    neutral: { bg: string; fg: string };
  };
  scrim: string;
}

export const lightTheme: Theme = {
  dark: false,
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#FAFAF8",
  surface3: "#F1F0EC",
  sidebar: "#F1F0EC",
  raised: "#FFFFFF",
  border: "#E5E5E1",
  borderStrong: "#D9D9D6",
  text: "#17191E",
  text2: "#484848",
  text3: "#656565",
  primary: "#2F3740",
  primaryPressed: "#1F252B",
  onPrimary: "#FFFFFF",
  secondary: "#497079",
  accent: "#F7E8A6",
  onAccent: "#17191E",
  accentSoft: "#FEECC7",
  green: "#0E9A50",
  greenText: "#0B6B37",
  focus: "#497079",
  tealStrong: "#497079",
  onTealStrong: "#FFFFFF",
  tealSoft: "#BCCBCE",
  onTealSoft: "#17191E",
  success: { bg: "#E7F5EC", fg: "#0B6B37" },
  warning: { bg: "#FDF4DC", fg: "#8A5A00" },
  error: { bg: "#FDECEC", fg: "#A12424", base: "#D93B3B" },
  info: { bg: "#E8F0F1", fg: "#2F4D53" },
  status: {
    active: "#0369A1",
    pending: { bg: "#FEF3C7", fg: "#B45309" },
    cancelled: "#DC2626",
    maintenance: { bg: "#FFEDD5", fg: "#C2410C" },
    neutral: { bg: "#F1F5F9", fg: "#475569" },
  },
  scrim: "rgba(23,25,30,0.4)",
};

export const darkTheme: Theme = {
  dark: true,
  bg: "#121417",
  surface: "#1A1D21",
  surface2: "#1E2125",
  surface3: "#24282D",
  sidebar: "#16181B",
  raised: "#22262B",
  border: "#2A2E33",
  borderStrong: "#3A3F45",
  text: "#F2F2EF",
  text2: "#B9BCBF",
  text3: "#8B9096",
  primary: "#FAFAF8",
  primaryPressed: "#D9D9D6",
  onPrimary: "#17191E",
  secondary: "#9FB4B9",
  accent: "#F7E8A6",
  onAccent: "#17191E",
  accentSoft: "#3A321C",
  green: "#34C27A",
  greenText: "#34C27A",
  focus: "#9FB4B9",
  tealStrong: "#66878E",
  onTealStrong: "#FFFFFF",
  tealSoft: "#2F4A51",
  onTealSoft: "#D9E1E3",
  success: { bg: "#12301F", fg: "#6FD8A2" },
  warning: { bg: "#33280E", fg: "#F3D58A" },
  error: { bg: "#3A1A1A", fg: "#F4A3A3", base: "#F06060" },
  info: { bg: "#1B2A2D", fg: "#C3D5D8" },
  status: {
    active: "#0369A1",
    pending: { bg: "#3A2C0C", fg: "#FCD34D" },
    cancelled: "#DC2626",
    maintenance: { bg: "#3B1F10", fg: "#FDBA74" },
    neutral: { bg: "#262C34", fg: "#CBD5E1" },
  },
  scrim: "rgba(0,0,0,0.6)",
};

/** 06 Corner radius and 05 spacing tokens (px / dp). */
export const radius = { sm: 6, md: 12, lg: 16, xl: 20, full: 9999 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

/** 04 Type scale. */
export const type = {
  display: { size: 32, line: 40 },
  h1: { size: 26, line: 34 },
  h2: { size: 22, line: 30 },
  h3: { size: 18, line: 26 },
  bodyLg: { size: 16, line: 26 },
  body: { size: 15, line: 24 },
  bodySm: { size: 13, line: 20 },
  caption: { size: 12, line: 18 },
  label: { size: 11, line: 16 },
  kpi: { size: 32, line: 40 },
} as const;

/** Brand logomark paths (viewBox "6 6 60 60"). */
export const LOGOMARK_PATHS = [
  "M23 8H10C10 30.0004 19.9002 46.5225 36 63C51.5719 47.0624 62 30.0004 62 8H49C49 30 36 45 36 45C36 45 23 30 23 8Z",
  "M10 64H28C17 55.0004 10 42.4833 10 42.4833V64Z",
  "M62 64V42.4833C62 42.4833 55 55.0004 44 64H62Z",
] as const;
