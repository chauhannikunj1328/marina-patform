import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeed } from "../src/seed";
import { Index } from "../src/selectors";
import { convert, DEFAULT_FX, ftM, roundMoney } from "../src/countries";
import { money, money2, moneyTotal, setCurrency } from "../src/format";
import { delocalizeDb, localizeDb } from "../src/localize";
import { lowestRate, marinaFacts } from "../src/marinas";
import { utilityRates, withMeterReading } from "../src/actions";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 12));
});
afterAll(() => vi.useRealTimers());
afterEach(() => setCurrency("USD"));

describe("Gulf marinas", () => {
  it("leave the US sample data exactly as it was", () => {
    const db = createSeed();
    const ix = new Index(db);
    const us = db.marinas.filter((m) => ix.cur(m.id) === "USD");
    expect(us).toHaveLength(14);
    expect(db.marinas).toHaveLength(26);
    // The first US bookings keep their codes and berths.
    expect(db.bookings[0].code).toBe("BK-0001");
    expect(db.bookings.every((b, i, all) => all.findIndex((x) => x.id === b.id) === i)).toBe(true);
    expect(db.invoices.every((v, i, all) => all.findIndex((x) => x.number === v.number) === i)).toBe(true);
  });

  it("charge in their country's currency", () => {
    const db = createSeed();
    const ix = new Index(db);
    expect(ix.cur("m-dxm")).toBe("AED");
    expect(ix.cur("m-jed")).toBe("SAR");
    expect(ix.cur("m-doh")).toBe("QAR");
    expect(ix.cur("m-mnm")).toBe("BHD");
    expect(ix.cur("m-mct")).toBe("OMR");
    expect(ix.cur("m-kwt")).toBe("KWD");
    expect(marinaFacts(db, "m-dxm").currency).toBe("AED");
    expect(ix.cur(db.marinas[0].id)).toBe("USD");
  });

  it("have Arabic names that show only in Arabic, and are never saved over the English ones", () => {
    const db = createSeed();
    expect(localizeDb(db, "en")).toBe(db);
    const ar = localizeDb(db, "ar");
    expect(ar.marinas.find((m) => m.id === "m-dxm")?.name).toBe("مراسي دبي مارينا");
    expect(ar.cities.find((c) => c.id === "ct-dxb")?.name).toBe("دبي");
    // A change made from the Arabic view keeps the stored English names.
    const changed = { ...ar, bookings: ar.bookings.slice(1) };
    const saved = delocalizeDb(changed, db);
    expect(saved.marinas.find((m) => m.id === "m-dxm")?.name).toBe("Dubai Marina Moorings");
    expect(saved.marinas.find((m) => m.id === "m-dxm")?.address).toBe("Marina Walk, Dubai Marina");
    expect(saved.cities.find((c) => c.id === "ct-dxb")?.name).toBe("Dubai");
    expect(saved.bookings).toHaveLength(db.bookings.length - 1);
  });
});

describe("currencies", () => {
  it("format each currency its own way", () => {
    expect(money(1250)).toBe("$1,250");
    expect(money(1250, "AED")).toBe("AED 1,250");
    expect(money2(12.5, "KWD")).toBe("KWD 12.500");
    expect(money2(-3, "SAR")).toBe("-SAR 3.00");
    expect(moneyTotal([{ amount: 120, currency: "USD" }, { amount: 400, currency: "AED" }, { amount: 30, currency: "USD" }])).toBe("$150 + AED 400");
    expect(roundMoney(1.23456, "OMR")).toBe(1.235);
    expect(roundMoney(1.23456, "AED")).toBe(1.23);
  });

  it("convert to the reporting currency for totals across marinas", () => {
    expect(convert(100, "AED", "USD")).toBeCloseTo(100 * DEFAULT_FX.AED);
    expect(convert(100, "USD", "USD")).toBe(100);
    // Company rates win over the defaults.
    expect(convert(10, "KWD", "USD", { KWD: 3 })).toBe(30);
    const db = createSeed();
    const ix = new Index(db);
    const all = ix.metrics(ix.allMarinaIds()).revenue;
    const us = ix.metrics(db.marinas.filter((m) => ix.cur(m.id) === "USD").map((m) => m.id)).revenue;
    expect(all).toBeGreaterThan(us);
  });

  it("quote the lowest rate in the currency of the marina that has it", () => {
    const db = createSeed();
    const gulf = db.marinas.filter((m) => m.id === "m-dxm" || m.id === "m-kwt");
    const low = lowestRate(db, gulf);
    expect(["AED", "KWD"]).toContain(low.currency);
    expect(low.amount).toBe(marinaFacts(db, low.currency === "AED" ? "m-dxm" : "m-kwt").fromDaily);
  });

  it("bill utilities in the marina's currency", () => {
    const db = createSeed();
    const rates = utilityRates(db, "m-dxm");
    expect(rates.currency).toBe("AED");
    expect(rates.powerPerKwh).toBeCloseTo(0.35 / DEFAULT_FX.AED, 2);
    const berth = db.berths.find((b) => b.marinaId === "m-dxm" && b.power)!;
    const last = db.meterReadings.filter((r) => r.berthId === berth.id && r.kind === "power").at(-1)!;
    const r = withMeterReading(db, { berthId: berth.id, kind: "power", value: last.value + 100, at: new Date().toISOString(), by: "Test" }, undefined);
    expect(r.charge).toBeCloseTo(100 * rates.powerPerKwh, 2);
  });
});

describe("lengths", () => {
  it("show feet with metres", () => {
    expect(ftM(40)).toBe("40 ft (12.2 m)");
    expect(ftM(undefined)).toBe("");
  });
});
