// Guide section 02: solid rounded logomark in Ink, wordmark in Poppins Medium beside it.
// Placeholder mark until the brand designer delivers the final SVG package.
import { cx } from "@/lib/format";

export function Logomark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={cx("shrink-0 text-ink", className)}>
      <path
        fill="currentColor"
        d="M16 3C8.8 3 3 8.8 3 16c0 6.1 4.2 11.2 9.9 12.6.6.1 1.1-.3 1.1-.9V17.5c0-1.9 1.6-3.5 3.5-3.5h10.2c.6 0 1-.5.9-1.1C27.2 7.2 22.1 3 16 3Z"
      />
    </svg>
  );
}

/** Horizontal logo: 24 px mark + 22 px wordmark, gap of half the mark height. */
export function Logo({ collapsed = false, size = "md" }: { collapsed?: boolean; size?: "md" | "lg" }) {
  const mark = size === "lg" ? 36 : 24;
  return (
    <span className="inline-flex items-center gap-3" aria-label="Marina System">
      <Logomark size={mark} />
      {!collapsed && <span className={cx("font-medium tracking-[-0.01em] whitespace-nowrap text-ink", size === "lg" ? "text-[30px] leading-9" : "text-[22px] leading-7")}>Marina System</span>}
    </span>
  );
}
