// What boat owners say: star ratings, review cards and a scrolling row of reviews (Home and each
// marina's page). Dummy reviews are labelled as samples; see data/reviews.ts.
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info, Quote, Star } from "lucide-react";
import { cx, fmtMonth, t, tn } from "@marina/shared";
import { useStore } from "@/data/store";
import { ratingOf, useReviews, type Review } from "@/data/reviews";
import { Eyebrow, IconButton } from "./ui";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={t("{n} out of 5 stars", { n: value })} className={cx("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cx("size-4", i <= Math.round(value) ? "fill-accent-strong text-accent-strong" : "text-line-strong")} aria-hidden />
      ))}
    </span>
  );
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export function ReviewCard({ review, showMarina = true }: { review: Review; showMarina?: boolean }) {
  const { ix } = useStore();
  const marina = ix.marina(review.marinaId);
  return (
    <figure className="flex h-full flex-col rounded-[20px] border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} />
        <Quote className="size-5 text-line-strong flip-rtl" aria-hidden />
      </div>
      <blockquote lang={review.lang} dir={review.lang === "ar" ? "rtl" : undefined} className="mt-4 flex-1 text-[15px] leading-6 text-ink">“{review.text}”</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[13px] font-semibold text-ink-2" aria-hidden>{initials(review.name)}</span>
        <span className="min-w-0 text-[13px] leading-5">
          <span className="block font-medium text-ink">{review.name}{review.boat && <span className="font-normal text-ink-3"> · {review.boat}</span>}</span>
          <span className="block text-ink-3">
            {showMarina && marina && <><Link to={`/marinas/${marina.id}`} className="hover:text-ink hover:underline">{marina.name}</Link> · </>}
            {tn(review.nights, "{n} night", "{n} nights")} · {fmtMonth(review.stayed)} {review.stayed.slice(0, 4)}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** The rating summary: average, stars and how many reviews. */
export function RatingSummary({ list, className }: { list: Review[]; className?: string }) {
  const r = ratingOf(list);
  if (!r) return null;
  return (
    <p className={cx("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="num text-[32px] leading-10 font-medium">{r.avg.toFixed(1)}</span>
      <Stars value={r.avg} />
      <span className="text-[13px] text-ink-3">{tn(r.count, "{n} review", "{n} reviews")}</span>
    </p>
  );
}

/** A row of review cards that scrolls sideways, with arrow buttons. */
export function ReviewsSection({ marinaId, title, eyebrow }: { marinaId?: string; title: string; eyebrow?: string }) {
  const all = useReviews();
  const list = marinaId ? all.filter((r) => r.marinaId === marinaId) : all;
  const row = useRef<HTMLUListElement>(null);
  if (!list.length) return null;
  const rtl = document.documentElement.dir === "rtl";
  const move = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.min(el.clientWidth * 0.9, 760), behavior: "smooth" });
  };
  const samples = list.some((r) => r.sample);
  return (
    <section id={marinaId ? undefined : "reviews"} aria-labelledby={marinaId ? "marina-reviews" : "reviews-title"} className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={marinaId ? "marina-reviews" : "reviews-title"} className={marinaId ? "text-[22px] leading-[30px] font-medium" : "text-[32px] leading-10 font-medium tracking-[-0.01em] sm:text-[40px] sm:leading-[48px]"}>{title}</h2>
          <RatingSummary list={list} className="mt-3" />
        </div>
        {list.length > (marinaId ? 1 : 3) && (
          <div className="flex gap-2">
            <IconButton icon={ArrowLeft} label={t("Previous reviews")} onClick={() => move(-1)} className="border border-line" />
            <IconButton icon={ArrowRight} label={t("More reviews")} onClick={() => move(1)} className="border border-line" />
          </div>
        )}
      </div>
      <ul ref={row} className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2" aria-label={title}>
        {list.map((r) => (
          <li key={r.id} className="w-[86%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
            <ReviewCard review={r} showMarina={!marinaId} />
          </li>
        ))}
      </ul>
      {samples && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3"><Info className="size-3.5 shrink-0" aria-hidden />{t("Sample reviews for this preview. Real reviews from boat owners will replace them.")}</p>
      )}
    </section>
  );
}
