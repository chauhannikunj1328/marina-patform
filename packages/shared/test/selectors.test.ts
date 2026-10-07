import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeed } from "../src/seed";
import { Index } from "../src/selectors";
import { hasOwnPoint } from "../src/geo";

// The sample data is built around "today", so pin the date to keep the numbers stable.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 12));
});
afterAll(() => vi.useRealTimers());

describe("dashboard numbers", () => {
  it("add up: every marina's figures sum to the all-marinas figures", () => {
    const db = createSeed();
    const ix = new Index(db);
    const ids = db.marinas.map((m) => m.id);
    const all = ix.metrics(ids);
    const each = ids.map((id) => ix.metrics([id]));
    const sum = (k: keyof typeof all) => each.reduce((s, m) => s + (m[k] as number), 0);
    for (const k of ["berths", "occupied", "reserved", "maintenance", "available", "revenue", "pending", "checkedIn"] as const) expect(all[k]).toBe(sum(k));
  });

  it("calculate occupancy as occupied ÷ all berths, and berth states add up", () => {
    const db = createSeed();
    const ix = new Index(db);
    const m = ix.metrics(db.marinas.map((x) => x.id));
    expect(m.occupancy).toBeCloseTo(m.occupied / m.berths);
    expect(m.occupied + m.reserved + m.maintenance + m.available).toBe(m.berths);
    expect(m.berths).toBe(db.berths.length);
  });

  it("are the same every time the sample data is built", () => {
    const a = new Index(createSeed()).metrics(["m-gg"]);
    const b = new Index(createSeed()).metrics(["m-gg"]);
    expect(a).toEqual(b);
  });
});

describe("sample data", () => {
  it("gives every marina a map position and valid references", () => {
    const db = createSeed();
    const ix = new Index(db);
    expect(db.marinas.every(hasOwnPoint)).toBe(true);
    expect(db.marinas.every((m) => ix.city(m.cityId))).toBe(true);
    expect(db.berths.every((b) => ix.marina(b.marinaId))).toBe(true);
    expect(db.bookings.every((b) => ix.berth(b.berthId) && ix.boat(b.boatId))).toBe(true);
  });

  it("has no double-booked berths", () => {
    const db = createSeed();
    const active = db.bookings.filter((b) => b.status === "confirmed" || b.status === "checked-in");
    const clashes = active.filter((a) => active.some((b) => b !== a && b.berthId === a.berthId && b.start < a.end && a.start < b.end));
    expect(clashes.map((b) => b.code)).toEqual([]);
  });
});

describe("monthly revenue", () => {
  it("splits a booking across months in whole dollars that add up to its price", () => {
    const db = createSeed();
    const ix = new Index(db);
    const bk = { ...db.bookings[0], start: "2026-09-29", end: "2026-10-02", price: 100 }; // 2 nights in Sept, 1 in Oct
    expect(ix.monthShare(bk, "2026-09")).toBe(67);
    expect(ix.monthShare(bk, "2026-10")).toBe(33);
    expect(ix.monthShare(bk, "2026-11")).toBe(0);
  });
});
