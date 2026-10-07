// Guide section 02: logomark in Ink, wordmark in Poppins Medium beside it.
// Brand logomark (public/brand/logomark-*.svg).
import { cx } from "@marina/shared";

export function Logomark({ size = 24, className }: { size?: number; className?: string }) {
  // viewBox trimmed to the mark (6–66) so it sits optically centred next to the wordmark.
  return (
    <svg width={size} height={size} viewBox="6 6 60 60" aria-hidden className={cx("shrink-0 text-ink", className)}>
      <path fill="currentColor" d="M23 8H10C10 30.0004 19.9002 46.5225 36 63C51.5719 47.0624 62 30.0004 62 8H49C49 30 36 45 36 45C36 45 23 30 23 8Z" />
      <path fill="currentColor" d="M10 64H28C17 55.0004 10 42.4833 10 42.4833V64Z" />
      <path fill="currentColor" d="M62 64V42.4833C62 42.4833 55 55.0004 44 64H62Z" />
    </svg>
  );
}

/** Horizontal logo: 20 px mark + 22 px wordmark, gap of half the mark height. */
export function Logo({ collapsed = false, size = "md" }: { collapsed?: boolean; size?: "md" | "lg" }) {
  const mark = size === "lg" ? 36 : 20;
  return (
    <span className={cx("inline-flex items-center", size === "lg" ? "gap-4" : "gap-2.5")} aria-label="Marina">
      <Logomark size={mark} />
      {!collapsed && <span className={cx("font-medium tracking-[-0.01em] whitespace-nowrap text-ink", size === "lg" ? "text-[30px] leading-9" : "text-[22px] leading-7")}>Marina</span>}
    </span>
  );
}
