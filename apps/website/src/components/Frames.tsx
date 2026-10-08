// Device frames for product screenshots: a browser window and a phone.
import type { ReactNode } from "react";
import { cx } from "@marina/shared";

export function BrowserFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[16px] border border-line bg-surface shadow-e3", className)}>
      <div className="flex h-8 items-center gap-3 border-b border-line bg-surface-2 px-3.5" aria-hidden>
        <span className="flex gap-1.5"><span className="size-2.5 rounded-full bg-line-strong" /><span className="size-2.5 rounded-full bg-line-strong" /><span className="size-2.5 rounded-full bg-line-strong" /></span>
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[36px] border-[8px] border-[#111316] bg-[#111316] shadow-e3 [&_img]:rounded-[28px]", className)}>{children}</div>;
}
