// The Figma design system ("MMS | Design System File") as plain values, for apps that can't read
// CSS variables (React Native). `palette` is the "Colors" collection and the light and dark themes
// map each app role to a "Colors Token" variable (named in the comments). Keep in sync with
// packages/shared/src/brand.css and with Figma.

const scale = (...hex: string[]) => Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k, i) => [k, hex[i]])) as Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

export const palette = {
  grey: scale("#FAFAF8", "#F1F0EC", "#E5E5E1", "#D9D9D6", "#A3A39F", "#656565", "#484848", "#36363A", "#26272B", "#17191E", "#0E0F12"),
  primary: scale("#F6F8F8", "#D9E1E3", "#BCCBCE", "#9FB4B9", "#839DA3", "#66878E", "#497079", "#3C5D65", "#2F4A51", "#22373C", "#152428"),
  secondary: scale("#FFFCF5", "#FEECC7", "#FDDD99", "#FCCD6A", "#FBBE3C", "#DFA833", "#C3932A", "#A77D22", "#8C6719", "#705110", "#543C07"),
  sidebar: scale("#F8F8F5", "#F1F0EC", "#E8E7E2", "#D9D8D3", "#B3B3AF", "#88898A", "#636568", "#414448", "#262A2F", "#1F2226", "#16181B"),
  success: scale("#F0FDF4", "#DCFCE7", "#BBF7D0", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A", "#15803D", "#166534", "#14532D", "#052E16"),
  error: scale("#FEF2F2", "#FEE2E2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D", "#450A0A"),
  warning: scale("#FFFBEB", "#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#451A03"),
  info: scale("#F0F9FF", "#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7", "#0369A1", "#075985", "#0C4A6E", "#082F49"),
  chart: ["#0EA5E9", "#F97316", "#8B5CF6", "#3B82F6", "#06B6D4", "#14B8A6", "#64748B"],
  white: "#FFFFFF",
  black: "#000000",
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

const { grey, primary, secondary, sidebar, success, error, warning, info } = palette;

export const lightTheme: Theme = {
  dark: false,
  bg: grey[100], // Background/Muted: the mobile screens' page colour
  surface: palette.white, // Background/Surface
  surface2: grey[50], // Background/Subtle
  surface3: grey[200], // Background/Strong: avatar circles, segmented tracks
  sidebar: sidebar[200], // Background/Sidebar Hover: pressed rows
  raised: palette.white, // Background/Surface (sheets)
  border: grey[200], // Border/Default
  borderStrong: grey[300], // Border/Strong
  text: grey[900], // Text/Primary
  text2: grey[600], // Text/Secondary
  text3: grey[500], // Text/Tertiary
  primary: primary[600], // Background/Brand
  primaryPressed: primary[800], // Background/Brand Pressed
  onPrimary: palette.white, // Text/On Brand
  secondary: secondary[400], // Background/Accent
  accent: secondary[200], // Background/Accent Muted
  onAccent: grey[900], // Text/On Accent
  accentSoft: secondary[100], // Background/Accent Soft
  green: success[600], // Background/Success
  greenText: success[700], // Text/Success Strong
  focus: primary[600], // Border/Brand
  tealStrong: primary[600], // Background/Brand
  onTealStrong: palette.white,
  tealSoft: primary[200], // Background/Brand Muted
  onTealSoft: grey[900],
  success: { bg: success[100], fg: success[700] }, // Background/Success Soft, Text/Success Strong
  warning: { bg: warning[100], fg: warning[700] },
  error: { bg: error[100], fg: error[700], base: error[600] }, // Background/Error Soft, Text/Error Strong, Background/Error
  info: { bg: info[100], fg: info[700] },
  status: {
    active: info[700],
    pending: { bg: warning[100], fg: warning[700] },
    cancelled: error[600],
    maintenance: { bg: secondary[100], fg: secondary[800] }, // In repair is the Accent in Figma
    neutral: { bg: grey[100], fg: grey[600] },
  },
  scrim: "rgba(0,0,0,0.4)", // Background/Black 40
};

export const darkTheme: Theme = {
  dark: true,
  bg: grey[800], // Background/Muted
  surface: grey[900], // Background/Surface
  surface2: grey[950], // Background/Subtle
  surface3: grey[700], // Background/Strong
  sidebar: grey[700], // pressed rows: one step lighter than the page
  raised: grey[900],
  border: grey[700], // Border/Default
  borderStrong: grey[600], // Border/Strong
  text: grey[50], // Text/Primary
  text2: grey[300], // Text/Secondary
  text3: grey[400], // Text/Tertiary
  primary: primary[300], // Background/Brand
  primaryPressed: primary[400], // Background/Brand Pressed
  onPrimary: grey[900], // Text/On Brand
  secondary: secondary[400],
  accent: secondary[900], // Background/Accent Muted
  onAccent: grey[900],
  accentSoft: secondary[950], // Background/Accent Soft
  green: success[500],
  greenText: success[300],
  focus: primary[300],
  tealStrong: primary[500],
  onTealStrong: palette.white,
  tealSoft: primary[800],
  onTealSoft: primary[100],
  success: { bg: success[950], fg: success[300] },
  warning: { bg: warning[950], fg: warning[300] },
  error: { bg: error[950], fg: error[300], base: error[400] },
  info: { bg: info[950], fg: info[300] },
  status: {
    active: info[700],
    pending: { bg: warning[950], fg: warning[300] },
    cancelled: error[600],
    maintenance: { bg: secondary[950], fg: secondary[300] },
    neutral: { bg: grey[700], fg: grey[300] },
  },
  scrim: "rgba(0,0,0,0.4)",
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
