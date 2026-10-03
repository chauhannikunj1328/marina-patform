import type { Berth } from "./types";
import { daysBetween } from "@/lib/date";

/** Long stays (default 28+ nights) are billed at the monthly rate, prorated per 30 nights. */
export function bookingAmount(start: string, end: string, berth: Berth, monthlyFrom = 28): number {
  const nights = daysBetween(start, end);
  if (nights >= monthlyFrom) return Math.round((berth.monthlyRate * nights) / 30);
  return nights * berth.dailyRate;
}

export function priceNote(start: string, end: string, monthlyFrom = 28): string {
  const nights = daysBetween(start, end);
  return nights >= monthlyFrom ? `Monthly rate, ${nights} nights prorated` : `${nights} nights × daily rate`;
}
