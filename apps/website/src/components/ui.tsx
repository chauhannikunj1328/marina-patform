// Website components, styled like the admin web app (Marina Brand to Product Handoff Guide v1).
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Inbox, X, type LucideIcon } from "lucide-react";
import { cx, t } from "@marina/shared";

/** Icons that point along the reading direction; they're mirrored in Arabic. */
const DIRECTIONAL = new Set<unknown>([ChevronLeft, ChevronRight, ArrowLeft, ArrowRight]);
export const flip = (Icon: unknown) => (DIRECTIONAL.has(Icon) ? "flip-rtl" : undefined);

// ---- Buttons (pill shape) ----------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:bg-sidebar active:bg-sidebar-pressed",
  ghost: "text-ink-2 hover:bg-sidebar-hover hover:text-ink border border-transparent",
  accent: "bg-accent text-on-accent hover:bg-accent-strong border border-transparent",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] pointer-coarse:h-11",
  md: "h-10 px-5 text-sm pointer-coarse:h-11",
  lg: "h-12 px-6 text-[15px]",
};
const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-brand disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
    sizes[size],
    variants[variant],
    className,
  );

export function Button({ variant = "secondary", size = "md", icon: Icon, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: LucideIcon }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...rest}>
      {Icon && <Icon className={cx("size-4 shrink-0", flip(Icon))} aria-hidden />}
      {children}
    </button>
  );
}

/** A link that looks like a button. */
export function ButtonLink({ variant = "secondary", size = "md", icon: Icon, className, children, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: LucideIcon }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {Icon && <Icon className={cx("size-4 shrink-0", flip(Icon))} aria-hidden />}
    </Link>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx("inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sidebar-hover hover:text-ink cursor-pointer", className)} {...rest}>
      <Icon className={cx("size-5", flip(Icon))} aria-hidden />
    </button>
  );
}

// ---- Layout pieces -------------------------------------------------------------

/** Sets the browser tab title, e.g. "Rates and fees · Marina". */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Marina` : t("Marina · Book a berth online");
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[16px] border border-line bg-surface", className)}>{children}</div>;
}

export function PageTitle({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[32px] leading-10 font-medium tracking-[-0.01em] sm:text-[40px] sm:leading-[48px]">{title}</h1>
        {intro && <p className="mt-3 text-[15px] text-ink-2">{intro}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-label mb-3 text-ink-3">{children}</p>;
}

// ---- Status badges -------------------------------------------------------------

export type BadgeTone = "active" | "pending" | "cancelled" | "neutral" | "success" | "info" | "outline" | "accent";
const tones: Record<BadgeTone, string> = {
  active: "bg-st-active text-white border-transparent",
  pending: "bg-st-pending-bg text-st-pending-fg border-transparent",
  cancelled: "bg-st-cancelled text-white border-transparent",
  neutral: "bg-st-neutral-bg text-st-neutral-fg border-transparent",
  success: "bg-success-bg text-success-fg border-transparent",
  info: "bg-info-bg text-info-fg border-transparent",
  outline: "bg-surface text-ink-2 border-line",
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

// ---- Form controls -------------------------------------------------------------

const control =
  "h-11 w-full rounded-[12px] border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 transition-colors duration-[120ms] ease-brand hover:border-line-hover focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:border-line disabled:bg-sidebar disabled:text-ink-disabled aria-[invalid=true]:border-error";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 [&[data-invalid]_input]:border-error [&[data-invalid]_select]:border-error [&[data-invalid]_textarea]:border-error" data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="text-[13px] leading-5 font-medium text-ink">{label}</label>
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

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cx("relative inline-flex w-full items-center", props.className)}>
      <select {...props} className={cx(control, "cursor-pointer appearance-none pe-9")}>{children}</select>
      <ChevronDown className="pointer-events-none absolute end-3.5 size-4 text-ink-2" aria-hidden />
    </span>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, "h-auto min-h-28 rounded-[16px] py-3", props.className)} />;
}

/** A form-level message (errors above the submit button, notes). */
export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const cls = { info: "bg-info-bg text-info-fg", error: "bg-error-bg text-error-fg", success: "bg-success-bg text-success-fg", warning: "bg-warning-bg text-warning-fg" }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-[12px] px-4 py-3 text-[13px] leading-5 font-medium", cls)}>{children}</div>;
}

export function EmptyState({ title, body, icon: Icon = Inbox, action }: { title: string; body?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-3"><Icon className="size-5 text-ink-2" aria-hidden /></span>
      <p className="mt-4 text-[15px] font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---- Dialog ---------------------------------------------------------------------

export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const els = [...(ref.current?.querySelectorAll<HTMLElement>("input:not([disabled]), select, textarea, button:not([disabled]), a[href]") ?? [])];
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input:not([disabled]), select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={() => close.current()} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[92vh] w-full flex-col rounded-t-[20px] bg-raised shadow-e3 animate-in sm:max-w-lg sm:rounded-[20px]">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <div>
            <h2 className="text-[22px] leading-[30px] font-medium">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-5 text-ink-3">{description}</p>}
          </div>
          <IconButton icon={X} label={t("Close")} onClick={() => close.current()} className="border border-line" />
        </div>
        <div className="overflow-y-auto px-6 pb-6 sm:px-8">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4 sm:px-8">{footer}</div>}
      </div>
    </div>
  );
}
