// Conversion helpers: the reassurances that answer "what's the catch?" next to every booking step,
// and today's availability, worked out from the bookings (never made up).
import { BadgeCheck, CalendarX2, Clock, Wallet } from "lucide-react";
import { addDays, berthIsFree, cx, t, today, type Db } from "@marina/shared";

/** Berths at a marina that are free tonight (not booked, not in repair). */
export function freeTonight(db: Db, marinaId: string) {
  const now = today();
  return db.berths.filter((b) => b.marinaId === marinaId && !b.underMaintenance && berthIsFree(db, b.id, now, addDays(now, 1))).length;
}

/** The booking promises, all true to how booking works (see packages/shared/src/portal.ts). */
export function TrustPoints({ className, tone = "plain", compact }: { className?: string; tone?: "plain" | "card"; compact?: boolean }) {
  const points = [
    [Wallet, t("No booking fees")],
    [BadgeCheck, t("Nothing to pay until the marina confirms")],
    [CalendarX2, t("Free to cancel before it's confirmed")],
    ...(compact ? [] : [[Clock, t("Usually confirmed within one business day")]]),
  ] as [typeof Wallet, string][];
  return (
    <ul className={cx("flex flex-wrap gap-x-6 gap-y-2 text-[13px]", tone === "card" ? "text-ink" : "text-ink-2", className)}>
      {points.map(([Icon, text]) => (
        <li key={text} className="inline-flex items-center gap-2"><Icon className="size-4 shrink-0 text-green" aria-hidden />{text}</li>
      ))}
    </ul>
  );
}
