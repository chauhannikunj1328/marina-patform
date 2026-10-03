// Shared components, styled to the Marina Brand to Product Handoff Guide v1 (sections 06 to 08).
import { cloneElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Inbox, Info, Search, TrendingDown, TrendingUp, X, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/format";

// ---- Tooltip (07: Slate background, white 12 px text, radius 6, no arrow) ----

export function Tooltip({ label, children }: { label: string; children: ReactElement<{ onMouseEnter?: unknown; onMouseLeave?: unknown; onFocus?: unknown; onBlur?: unknown; ref?: unknown }> }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const show = (e: { currentTarget: EventTarget }) => setAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
  const hide = () => {
    setAnchor(null);
    setPos(null);
  };
  useLayoutEffect(() => {
    if (!anchor || !tip.current) return;
    const w = tip.current.offsetWidth, h = tip.current.offsetHeight;
    const top = anchor.top - h - 8 < 4 ? anchor.bottom + 8 : anchor.top - h - 8;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, anchor.left + anchor.width / 2 - w / 2));
    setPos({ top, left });
  }, [anchor]);
  useEffect(() => {
    if (!anchor) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [anchor]);
  return (
    <>
      {cloneElement(children, { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide })}
      {anchor &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="pointer-events-none fixed z-[70] max-w-64 rounded-sm bg-tooltip px-2.5 py-1.5 text-xs leading-[18px] text-on-tooltip shadow-e2 animate-fade"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}

// ---- Buttons (07 pill shape, 08 states) --------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:bg-sidebar active:bg-sidebar-pressed",
  ghost: "text-ink-2 hover:bg-sidebar-hover hover:text-ink border border-transparent",
  // 08: red only inside the confirmation step
  danger: "bg-danger text-white hover:bg-danger-hover active:bg-danger-pressed border border-transparent",
};

export function Button({
  variant = "secondary",
  icon: Icon,
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-brand disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
        size === "sm" ? "h-8 px-3.5 text-[13px] pointer-coarse:h-11" : "h-10 px-5 text-sm pointer-coarse:h-11",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

/**
 * Icon-only button. `label` is required: it becomes the tooltip and the accessible name.
 * "outline" is the brand's 40 px bordered circle; "ghost" is the compact version for table rows.
 */
export function IconButton({
  icon: Icon,
  label,
  className,
  look = "ghost",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; look?: "ghost" | "outline" }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        className={cx(
          "inline-flex items-center justify-center rounded-full text-ink-2 transition-colors duration-[120ms] ease-brand hover:text-ink disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
          look === "outline" ? "size-10 border border-line bg-surface hover:bg-sidebar pointer-coarse:size-11" : "size-8 hover:bg-sidebar-hover pointer-coarse:size-11",
          className,
        )}
        {...rest}
      >
        <Icon className={look === "outline" ? "size-5" : "size-4"} aria-hidden />
      </button>
    </Tooltip>
  );
}

// ---- Layout ----------------------------------------------------------------

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {/* 04 h1: 26/34, 500, -0.5% */}
        <h1 className="text-[26px] leading-[34px] font-medium tracking-[-0.005em]">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 07 Cards: white, 1 px border, no shadow, radius 16. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-[16px] border border-line bg-surface", className)}>{children}</section>;
}

export function CardHeader({ title, description, icon: Icon, actions }: { title: string; description?: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
      <div className="min-w-0">
        {/* 04 h3: 18/26, 500 */}
        <h2 className="flex items-center gap-2 text-[18px] leading-[26px] font-medium">
          {Icon && <Icon className="size-5 text-ink-2" aria-hidden />}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-ink-3">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Small "i" with a tooltip that explains a number. */
export function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip label={text}>
      <span tabIndex={0} className="inline-flex rounded-full text-ink-3 hover:text-ink">
        <Info className="size-3.5" aria-hidden />
        <span className="sr-only">{text}</span>
      </span>
    </Tooltip>
  );
}

/** 07 Stat cards: 32 px number, trend pill, icon top right. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  to,
  onClick,
  active,
  trend,
  hint,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  /** Navigate somewhere when clicked. */
  to?: string;
  /** Or run an action when clicked, e.g. filter the list below. */
  onClick?: () => void;
  /** Shows the card as the selected filter. */
  active?: boolean;
  trend?: { value: number; label?: string; unit?: "pct" | "pts" };
  /** Plain-language explanation of how the number is calculated. */
  hint?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
          {label}
          {hint && <InfoHint text={hint} />}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line">
          <Icon className="size-5 text-ink-2" aria-hidden />
        </span>
      </div>
      <div className="num mt-3 text-[32px] leading-10 font-semibold tracking-[-0.01em]">{value}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-[18px] text-ink-3">
        {trend && <Trend {...trend} />}
        {sub}
      </div>
    </>
  );
  const cls = "block w-full rounded-[16px] border bg-surface p-6 text-left";
  const interactive = "cursor-pointer transition-[background-color,border-color,box-shadow] duration-[120ms] ease-brand hover:border-line-hover hover:bg-row-hover hover:shadow-e1 active:bg-sidebar";
  if (to)
    return (
      <Link to={to} className={cx(cls, "border-line", interactive)}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-pressed={!!active} className={cx(cls, interactive, active ? "border-primary ring-1 ring-primary" : "border-line")}>
        {body}
      </button>
    );
  return <div className={cx(cls, "border-line")}>{body}</div>;
}

/** Trend pill. `value` is a ratio (0.12 = +12%); with unit "pts" a change in percentage points. */
export function Trend({ value, label = "vs last month", unit = "pct" }: { value: number; label?: string; unit?: "pct" | "pts" }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", up ? "bg-success-bg text-success-fg" : "bg-error-bg text-error-fg")}>
        <Icon className="size-3.5" aria-hidden />
        {up ? "+" : "−"}
        {Math.abs(value * 100).toFixed(1)}
        {unit === "pct" ? "%" : " pts"}
      </span>
      <span className="text-ink-3">{label}</span>
    </span>
  );
}

// ---- Badges (07: pill, 600 weight, 12 px) -----------------------------------

export type BadgeTone = "active" | "pending" | "cancelled" | "maintenance" | "neutral" | "success" | "info" | "outline" | "muted" | "new" | "accent";

const tones: Record<BadgeTone, string> = {
  active: "bg-st-active text-white border-transparent",
  pending: "bg-st-pending-bg text-st-pending-fg border-transparent",
  cancelled: "bg-st-cancelled text-white border-transparent",
  maintenance: "bg-st-maint-bg text-st-maint-fg border-transparent",
  neutral: "bg-st-neutral-bg text-st-neutral-fg border-transparent",
  success: "bg-success-bg text-success-fg border-transparent",
  info: "bg-info-bg text-info-fg border-transparent",
  outline: "bg-surface text-ink-2 border-line",
  muted: "bg-surface-3 text-ink-3 border-transparent line-through decoration-ink-3/60",
  new: "bg-surface text-green-text border-line",
  accent: "bg-accent text-on-accent border-transparent",
};

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-[18px] font-semibold whitespace-nowrap", tones[tone])}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

// ---- Tabs (07: text tabs, 2 px Slate underline) ------------------------------

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="mb-6 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "-mb-px flex items-center gap-2 border-b-2 py-3 text-[15px] font-medium whitespace-nowrap transition-colors duration-[200ms] ease-brand cursor-pointer",
            value === it.value ? "border-primary text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="num rounded-full bg-surface-3 px-2 text-xs font-semibold text-ink-2">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---- Form controls (05: medium 40 px; 08: input states) ---------------------

const control =
  "h-10 w-full rounded-[12px] border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 transition-colors duration-[120ms] ease-brand hover:border-line-hover focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:border-line disabled:bg-sidebar disabled:text-ink-disabled aria-[invalid=true]:border-error";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  // When a save fails, move focus to the first field with an error (fields render in DOM order).
  useEffect(() => {
    if (!error) return;
    const active = document.activeElement;
    if (active?.closest("[data-invalid]") && active.id !== id) return;
    document.getElementById(id)?.focus();
  }, [error, id]);
  return (
    <div className="flex flex-col gap-1.5 [&[data-invalid]_input]:border-error [&[data-invalid]_select]:border-error [&[data-invalid]_textarea]:border-error" data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="text-[13px] leading-5 font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="flex items-center gap-1 text-xs leading-[18px] font-medium text-error-fg">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-[18px] text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.className)} />;
}

/**
 * Select. "box" is for forms and filters; "plain" is the brand's text + chevron select
 * used in page headers (e.g. choosing a county).
 */
export function Select({ children, look = "box", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { look?: "box" | "plain" }) {
  if (look === "plain")
    return (
      <span className="relative inline-flex items-center">
        <select {...props} className={cx("cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pr-7 pl-2 text-[15px] font-semibold text-ink hover:bg-sidebar-hover focus:outline-2 focus:outline-offset-2 focus:outline-focus", props.className)}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 size-4 text-ink" aria-hidden />
      </span>
    );
  return (
    <span className={cx("relative inline-flex w-full items-center", props.className)}>
      <select {...props} className={cx(control, "cursor-pointer appearance-none pr-9")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-ink-2" aria-hidden />
    </span>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, "h-auto min-h-24 rounded-[16px] py-3", props.className)} />;
}

/** 07 Search: borderless with leading icon and a bottom divider. */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[min(100%,16rem)] flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-0 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full border-0 border-b border-line bg-transparent pr-2 pl-8 text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-line-hover focus:border-focus focus:outline-none"
      />
    </div>
  );
}

/** Filter bar. Pass `active` (number of filters applied) and `onClear` to show a reset link. */
export function Toolbar({ children, active = 0, onClear }: { children: ReactNode; active?: number; onClear?: () => void }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
      {active > 0 && onClear && (
        <button onClick={onClear} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-green-text hover:bg-success-bg cursor-pointer">
          <X className="size-3.5" aria-hidden /> Clear {active} filter{active > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ---- Sorting ---------------------------------------------------------------

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
  onSort: (key: string) => void;
}

/** Sorts rows by the chosen column. Click a header once for ascending, again for descending. */
export function useSort<T>(rows: T[], accessors: Record<string, (r: T) => string | number>, initial?: { key: string; dir: SortDir }) {
  const [state, setState] = useState<{ key: string; dir: SortDir } | undefined>(initial);
  const sorted = useMemo(() => {
    if (!state || !accessors[state.key]) return rows;
    const get = accessors[state.key];
    const dir = state.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
    // accessors is recreated each render; the key is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, state]);
  const sort: SortState = {
    key: state?.key ?? "",
    dir: state?.dir ?? "asc",
    onSort: (key) => setState((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })),
  };
  return { sorted, sort };
}

/** Changes made to a form since it opened, for the unsaved-changes warning. */
export function useDirty<T>(current: T): boolean {
  const initial = useRef(JSON.stringify(current));
  return JSON.stringify(current) !== initial.current;
}

// ---- Table (07: thin row lines, no zebra, #F8FAFC header; 05: 52 px rows) ----

type Head = ReactNode | { label: string; sortKey: string };

export function Table({ head, children, empty, sort }: { head: Head[]; children: ReactNode; empty?: boolean; sort?: SortState }) {
  const ref = useRef<HTMLTableElement>(null);
  const labels = head.map((h) => (typeof h === "string" ? h : h && typeof h === "object" && "label" in h ? h.label : ""));
  // On phones each row becomes a card; cells show their column name from data-label (see .rtable in index.css).
  useLayoutEffect(() => {
    ref.current?.querySelectorAll("tbody > tr").forEach((tr) => {
      [...tr.children].forEach((td, i) => td.setAttribute("data-label", labels[i] ?? ""));
    });
  });
  return (
    <div className="overflow-x-auto max-sm:overflow-visible max-sm:pb-2">
      <table ref={ref} className="rtable w-full text-[13px] leading-5">
        <thead>
          <tr className="border-y border-table-line bg-table-head text-left">
            {head.map((h, i) => {
              const sortable = sort && h && typeof h === "object" && "sortKey" in h;
              if (!sortable)
                return (
                  <th key={i} className="text-label h-10 px-4 whitespace-nowrap text-ink-3 first:pl-6 last:pr-6 last:text-right">
                    {h as ReactNode}
                  </th>
                );
              const active = sort.key === h.sortKey;
              const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={i} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="h-10 px-2 whitespace-nowrap first:pl-4">
                  <button
                    onClick={() => sort.onSort(h.sortKey)}
                    className={cx("text-label inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-sidebar-hover cursor-pointer", active ? "text-ink" : "text-ink-3")}
                  >
                    {h.label}
                    <Icon className={cx("size-3", !active && "opacity-50")} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-table-line [&>tr:last-child]:border-0 [&>tr]:transition-colors [&>tr]:duration-[120ms] [&>tr:hover]:bg-row-hover [&_td]:h-[52px] [&_td]:px-4 [&_td]:py-2.5 [&_td]:align-middle [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_td:last-child]:text-right">
          {children}
        </tbody>
      </table>
      {empty && <EmptyState icon={Search} title="No results found" body="Nothing matches these filters. Try a different search or clear the filters." />}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-table-line px-6 py-3 text-[13px] text-ink-3">
      <span className="num">
        Page {page} of {pages} · {total.toLocaleString("en-US")} results
      </span>
      <div className="flex gap-2">
        <IconButton look="outline" icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <IconButton look="outline" icon={ChevronRight} label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}

export function paginate<T>(list: T[], page: number, size = 15) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages);
  return { rows: list.slice((p - 1) * size, p * size), pages, page: p };
}

/** 11 Empty states: outline icon in a Neutral 100 circle + optional pill action. */
export function EmptyState({ title, body, icon: Icon = Inbox, action }: { title: string; body?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-3">
        <Icon className="size-5 text-ink-2" aria-hidden />
      </span>
      <p className="mt-4 text-[15px] font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---- Dialogs (07: radius 20, padding 32, scrim Ink 40%; 06: elevation 3) -----

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
  dirty,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** When true, closing asks before discarding unsaved changes. */
  dirty?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = useRef(onClose);
  requestClose.current = () => (dirty ? setConfirmDiscard(true) : onClose());

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea, button:not([disabled]), a[href], [tabindex='0']") ?? [])];
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most dialog reacts.
      const dialogs = document.querySelectorAll("[role=dialog]");
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose.current();
      }
      if (e.key === "Tab") {
        const els = focusables();
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const firstField = ref.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea");
    (firstField ?? focusables()[1] ?? focusables()[0])?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      // Return focus to whatever opened the dialog.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={() => requestClose.current()} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-[20px] bg-raised shadow-e3 animate-in sm:rounded-[20px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <div>
            <h2 className="text-[22px] leading-[30px] font-medium tracking-[-0.005em]">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-5 text-ink-3">{description}</p>}
          </div>
          <IconButton look="outline" icon={X} label="Close" onClick={() => requestClose.current()} />
        </div>
        <div className="overflow-y-auto px-6 pb-6 sm:px-8">{children}</div>
        {confirmDiscard ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-b-[20px] border-t border-line bg-accent-soft px-6 py-4 sm:px-8">
            <p className="text-[13px] font-medium text-ink">Discard your unsaved changes?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
              <Button size="sm" variant="primary" onClick={onClose}>Discard</Button>
            </div>
          </div>
        ) : (
          footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4 sm:px-8">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = true,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  /** 08: destructive actions show a red button, only inside this confirmation step. */
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Keep it</Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="max-w-[70ch] text-ink-2">{body}</p>
    </Modal>
  );
}

/** 09 Avatars: circle, initials in #484848 on Neutral 100. Optional 8 px green online dot. */
export function Avatar({ name, size = 8, online }: { name: string; size?: 8 | 9 | 10 | 12; online?: boolean }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 font-semibold text-ink-2",
        size === 8 ? "size-8 text-xs" : size === 9 ? "size-9 text-xs" : size === 10 ? "size-10 text-[13px]" : "size-12 text-sm",
      )}
      aria-hidden
    >
      {initials}
      {online && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-sidebar bg-green" />}
    </span>
  );
}

/** 11 Progress: pill bar, green fill on #E5E5E1 track, value right aligned. */
export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-green transition-[width] duration-300 ease-brand" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="num w-10 text-right text-xs font-medium text-ink-2">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

/** 03 Accent highlight pill with the soft yellow glow (e.g. the center of a ring chart). */
export function HighlightPill({ children }: { children: ReactNode }) {
  return <span className="glow-accent inline-flex items-center rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-on-accent">{children}</span>;
}
