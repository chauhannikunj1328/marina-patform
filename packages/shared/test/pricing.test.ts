import { describe, expect, it } from "vitest";
import { bookingAmount, seasonOn, type PricingRules } from "../src/pricing";
import type { Berth } from "../src/types";

const berth: Berth = { id: "b-1", marinaId: "m-1", code: "A-01", maxLength: 40, type: "Floating", dailyRate: 100, monthlyRate: 2400, power: true, water: true, underMaintenance: false };
const rules = (r: Partial<PricingRules>): PricingRules => ({ weekendPct: 0, longStayPct: 0, longStayNights: 7, seasons: [], ...r });

describe("bookingAmount", () => {
  it("charges the daily rate per night for short stays", () => {
    expect(bookingAmount("2026-10-05", "2026-10-08", berth)).toBe(300);
  });

  it("bills 28+ nights at the monthly rate, prorated per 30 nights", () => {
    expect(bookingAmount("2026-10-01", "2026-10-31", berth)).toBe(2400); // 30 nights
    expect(bookingAmount("2026-10-01", "2026-10-29", berth)).toBe(2240); // 28 nights
  });

  it("respects a custom monthly threshold", () => {
    expect(bookingAmount("2026-10-01", "2026-10-15", berth, 14)).toBe(1120);
  });

  it("adds the weekend surcharge on Friday and Saturday nights only", () => {
    // Thu 8 Oct → Mon 12 Oct 2026: Thu, Fri, Sat, Sun nights.
    expect(bookingAmount("2026-10-08", "2026-10-12", berth, 28, rules({ weekendPct: 50 }))).toBe(500);
  });

  it("applies seasons and the long-stay discount", () => {
    const summer = rules({ seasons: [{ id: "s", name: "Summer", from: "07-01", to: "08-31", pct: 20 }] });
    expect(bookingAmount("2026-07-01", "2026-07-03", berth, 28, summer)).toBe(240);
    const long = rules({ longStayPct: 10, longStayNights: 7 });
    expect(bookingAmount("2026-10-05", "2026-10-12", berth, 28, long)).toBe(630);
    expect(bookingAmount("2026-10-05", "2026-10-11", berth, 28, long)).toBe(600); // 6 nights: no discount
  });
});

describe("seasonOn", () => {
  const holidays = rules({ seasons: [{ id: "h", name: "Holidays", from: "12-15", to: "01-05", pct: 30 }] });
  it("handles seasons that wrap the new year", () => {
    expect(seasonOn("2026-12-20", holidays)?.name).toBe("Holidays");
    expect(seasonOn("2027-01-03", holidays)?.name).toBe("Holidays");
    expect(seasonOn("2027-01-06", holidays)).toBeUndefined();
    expect(seasonOn("2026-12-14", holidays)).toBeUndefined();
  });
});
