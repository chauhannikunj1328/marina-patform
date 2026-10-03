// Guide 11: skeletons in Neutral 100 (#F1F0EC on white) with a subtle 1.4 s shimmer, matching card radius.
import { cx } from "@/lib/format";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-[12px]", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-[60vw]" />
        </div>
        <Skeleton className="hidden h-10 w-36 rounded-full sm:block" />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-[16px] border border-line p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-9 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-[16px] border border-line p-6">
        <Skeleton className="mb-6 h-10 w-full max-w-md" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full last:mb-0" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
