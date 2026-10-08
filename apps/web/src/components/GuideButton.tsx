// The floating Read button (bottom centre) and the guide for the page you're on. Guides are
// downloaded in the current language the first time one is opened.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, X } from "lucide-react";
import { getLang, loadGuides, t, type Guide, type GuideKey } from "@marina/shared";

/** Which guide belongs to a page of the admin web app. */
export function webGuideKey(path: string): GuideKey | undefined {
  if (path === "/") return "w.overview";
  if (["/login", "/register", "/forgot-password"].includes(path)) return "w.login";
  const [, first, second] = path.split("/");
  const keys: Record<string, GuideKey> = {
    county: "w.county", city: "w.city", berths: "w.berths", bookings: "w.bookings", contracts: "w.contracts", locations: "w.locations",
    staff: "w.staff", maintenance: "w.maintenance", incidents: "w.incidents", users: "w.people", billing: "w.billing", reports: "w.reports",
    analytics: "w.analytics", access: "w.access", settings: "w.settings",
  };
  if (first === "marinas") return second ? "w.marina" : "w.marinas";
  return keys[first];
}

function GuidePanel({ guideKey, onClose }: { guideKey: GuideKey; onClose: () => void }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    loadGuides(getLang()).then((book) => live && setGuide(book[guideKey]), () => live && setFailed(true));
    return () => { live = false; };
  }, [guideKey]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center md:items-stretch md:justify-end">
      <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={guide ? guide.title : t("Guide")}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-[20px] bg-raised shadow-e3 outline-none animate-in md:max-h-none md:w-[460px] md:rounded-none md:rounded-s-[20px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-6 pb-4">
          <div>
            <p className="text-label text-ink-3">{t("Guide")}</p>
            <h2 className="mt-1 text-[22px] leading-[30px] font-medium">{guide?.title ?? "…"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close guide")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-[14px] leading-[22px] text-ink-2">
          {failed ? (
            <p role="alert">{t("Couldn't load the guide. Check your connection and try again.")}</p>
          ) : !guide ? (
            <div className="space-y-3" aria-label={t("Loading the guide…")}>
              <div className="skeleton h-4 w-5/6 rounded" /><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ) : (
            <article>
              <p className="text-[15px] leading-6 text-ink">{guide.summary}</p>
              <p className="mt-3 rounded-[12px] bg-surface-2 px-4 py-3 text-[13px]"><span className="font-semibold text-ink">{t("Who it's for")}: </span>{guide.who}</p>
              {guide.sections.map((s, i) => (
                <section key={i} className="mt-6">
                  <h3 className="text-[16px] font-semibold text-ink">{s.heading}</h3>
                  {s.text && <p className="mt-2">{s.text}</p>}
                  {s.steps && <ol className="mt-2 list-decimal space-y-1.5 ps-5 marker:font-semibold marker:text-ink-3">{s.steps.map((x, j) => <li key={j}>{x}</li>)}</ol>}
                  {s.points && <ul className="mt-2 list-disc space-y-1.5 ps-5 marker:text-ink-3">{s.points.map((x, j) => <li key={j}>{x}</li>)}</ul>}
                </section>
              ))}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

export function GuideButton() {
  const { pathname } = useLocation();
  const guideKey = webGuideKey(pathname);
  const [open, setOpen] = useState<GuideKey | null>(null);
  // Close the guide when the page changes.
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(null);
  }
  if (!guideKey) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(guideKey)}
        aria-label={t("Read the guide for this page")}
        className="fixed bottom-4 left-1/2 z-40 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary shadow-e3 transition-colors hover:bg-primary-hover cursor-pointer print:hidden"
      >
        <BookOpen className="size-4" aria-hidden /> {t("Read")}
      </button>
      {open && <GuidePanel guideKey={open} onClose={() => setOpen(null)} />}
    </>
  );
}
