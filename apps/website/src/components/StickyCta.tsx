// Phone-sized screens: a bar pinned to the bottom of a marina's page with its lowest price and a
// button back up to the availability search, so the next step is always one tap away.
import { useEffect } from "react";
import { Search } from "lucide-react";
import { t } from "@marina/shared";

export function StickyCta({ price }: { price: string }) {
  // Lift the floating Read button above the bar while it's shown.
  useEffect(() => {
    document.documentElement.style.setProperty("--cta-offset", "72px");
    return () => {
      document.documentElement.style.removeProperty("--cta-offset");
    };
  }, []);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden print:hidden">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <p className="text-[13px] text-ink-3">{t("from")} <span className="num text-[20px] font-semibold text-ink">{price}</span> {t("/night")}</p>
        <a href="#availability" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
          <Search className="size-4" aria-hidden />{t("Check availability")}
        </a>
      </div>
    </div>
  );
}
