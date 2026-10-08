// The floating Read button (bottom centre) and the guide for the page you're on (the same as the
// admin web app's, with the website's pages): a large pop-up with a
// tab per section, each with a screenshot (red boxes mark what to use). Guides and pictures are
// downloaded in the current language the first time one is opened.
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Expand, X } from "lucide-react";
import { cx, getLang, loadGuides, shotFile, t, type Guide, type GuideKey } from "@marina/shared";

/** Which guide belongs to a page of the public website. */
export function guideKeyFor(path: string): GuideKey | undefined {
  if (path === "/") return "s.home";
  if (["/sign-in", "/register", "/forgot-password"].includes(path)) return "s.signin";
  const [, first, second, third] = path.split("/");
  if (first === "marinas") return second ? "s.marina" : "s.marinas";
  if (first === "book") return second === "checkout" ? "s.checkout" : "s.book";
  if (first === "account") {
    if (!second) return "s.account";
    if (second === "invoices") return third ? "s.invoice" : "s.invoices";
    return ({ bookings: "s.bookings", contracts: "s.contracts", boats: "s.boats", profile: "s.profile" } as Record<string, GuideKey>)[second];
  }
  return ({ pricing: "s.pricing", contact: "s.contact" } as Record<string, GuideKey>)[first];
}

/** A section's screenshot. Hidden if it can't be loaded, so the guide still reads well. */
function Shot({ guideKey, index, heading }: { guideKey: GuideKey; index: number; heading: string }) {
  const src = `/guides/${shotFile(guideKey, index, getLang())}`;
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="group relative overflow-hidden rounded-[16px] border border-line bg-surface-2">
      <img src={src} alt={t("Screenshot: {name}", { name: heading })} loading="lazy" onError={() => setFailed(true)} className="block h-auto w-full" />
      <a href={src} target="_blank" rel="noreferrer" className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--raised)_92%,transparent)] px-3 py-1.5 text-xs font-semibold text-ink shadow-e2 hover:bg-raised">
        <Expand className="size-3.5" aria-hidden /> {t("Open the picture full size")}
      </a>
      <figcaption className="border-t border-line px-4 py-2 text-xs text-ink-3">{t("Red boxes show where to look, numbered in the order you use them.")}</figcaption>
    </figure>
  );
}

function GuideDialog({ guideKey, onClose }: { guideKey: GuideKey; onClose: () => void }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState(0); // 0 = overview, then one per section
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
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
  const count = guide ? guide.sections.length + 1 : 1;
  const go = (i: number) => {
    setTab(Math.max(0, Math.min(count - 1, i)));
    body.current?.scrollTo({ top: 0 });
  };
  // Arrow keys move between tabs (reversed in Arabic).
  const onTabKey = (e: ReactKeyboardEvent) => {
    const rtl = document.documentElement.dir === "rtl";
    if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) { e.preventDefault(); go(tab + 1); }
    if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) { e.preventDefault(); go(tab - 1); }
  };
  useEffect(() => {
    document.getElementById(`guide-tab-${tab}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  const section = guide && tab > 0 ? guide.sections[tab - 1] : null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-2 sm:p-6">
      <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={onClose} aria-hidden />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={guide ? guide.title : t("Guide")}
        className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[20px] bg-raised shadow-e3 outline-none animate-in sm:h-[88vh]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="min-w-0">
            <p className="text-label flex items-center gap-1.5 text-ink-3"><BookOpen className="size-3.5" aria-hidden /> {t("Guide")}</p>
            <h2 className="mt-1 text-[24px] leading-8 font-medium">{guide?.title ?? "…"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close guide")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 hover:bg-sidebar hover:text-ink cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {guide && (
          <div role="tablist" aria-label={t("Sections")} onKeyDown={onTabKey} className="mt-4 flex gap-1 overflow-x-auto border-b border-line px-5 [scrollbar-width:none] sm:px-8">
            {[t("Overview"), ...guide.sections.map((s) => s.heading)].map((label, i) => (
              <button key={i} id={`guide-tab-${i}`} type="button" role="tab" aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => go(i)}
                className={cx("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors cursor-pointer", tab === i ? "border-primary text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
                {i > 0 && <span className="num me-1.5 text-ink-3">{i}.</span>}{label}
              </button>
            ))}
          </div>
        )}
        <div ref={body} role="tabpanel" className="flex-1 overflow-y-auto px-5 py-6 text-[15px] leading-6 text-ink-2 sm:px-8">
          {failed ? (
            <p role="alert">{t("Couldn't load the guide. Check your connection and try again.")}</p>
          ) : !guide ? (
            <div className="space-y-3" aria-label={t("Loading the guide…")}>
              <div className="skeleton h-5 w-2/3 rounded" /><div className="skeleton h-5 w-1/2 rounded" /><div className="skeleton h-64 w-full rounded-[16px]" />
            </div>
          ) : !section ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-[18px] leading-7 text-ink">{guide.summary}</p>
              <p className="mt-4 rounded-[12px] bg-surface-2 px-4 py-3 text-[14px]"><span className="font-semibold text-ink">{t("Who it's for")}: </span>{guide.who}</p>
              <h3 className="mt-8 text-[16px] font-semibold text-ink">{t("What's in this guide")}</h3>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {guide.sections.map((s, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => go(i + 1)} className="flex w-full items-center gap-3 rounded-[12px] border border-line px-4 py-3 text-start hover:bg-row-hover cursor-pointer">
                      <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[13px] font-semibold text-ink">{i + 1}</span>
                      <span className="font-medium text-ink">{s.heading}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div className="lg:sticky lg:top-0"><Shot key={`${guideKey}-${tab}`} guideKey={guideKey} index={tab - 1} heading={section.heading} /></div>
              <div>
                <h3 className="text-[20px] leading-7 font-semibold text-ink">{section.heading}</h3>
                {section.text && <p className="mt-3">{section.text}</p>}
                {section.steps && (
                  <ol className="mt-4 space-y-3">
                    {section.steps.map((x, j) => (
                      <li key={j} className="flex gap-3">
                        <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-ink">{j + 1}</span>
                        <span>{x}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {section.points && <ul className="mt-4 list-disc space-y-2 ps-5 marker:text-ink-3">{section.points.map((x, j) => <li key={j}>{x}</li>)}</ul>}
              </div>
            </div>
          )}
        </div>
        {guide && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-8">
            <button type="button" onClick={() => go(tab - 1)} disabled={tab === 0} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-sidebar disabled:opacity-40 cursor-pointer">
              <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("Previous")}
            </button>
            <span className="num text-[13px] text-ink-3">{t("{n} of {total}", { n: tab + 1, total: count })}</span>
            <button type="button" onClick={() => (tab === count - 1 ? onClose() : go(tab + 1))} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover cursor-pointer">
              {tab === count - 1 ? t("guide|Done") : t("Next")} {tab < count - 1 && <ArrowRight className="flip-rtl size-4" aria-hidden />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GuideButton() {
  const { pathname } = useLocation();
  const guideKey = guideKeyFor(pathname);
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
      {open && <GuideDialog guideKey={open} onClose={() => setOpen(null)} />}
    </>
  );
}
