import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeed } from "../src/seed";
import { amountDue, availableBerths, berthIsFree, ownerBookings, ownerInvoices, quote, searchProblem, withBoat, withCardPayment, withContractSigned, withOnlineBooking, withOwner, withRequestCancelled } from "../src/portal";
import { addDays } from "../src/date";

const NOW = "2026-10-08";
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 12));
});
afterAll(() => vi.useRealTimers());

const stay = { start: addDays(NOW, 4), end: addDays(NOW, 7) };

describe("berth search", () => {
  it("rejects searches that can't be booked", () => {
    expect(searchProblem({ ...stay, length: 30 }, NOW)).toBeUndefined();
    expect(searchProblem({ start: addDays(NOW, -1), end: NOW, length: 30 }, NOW)).toBeDefined();
    expect(searchProblem({ start: stay.start, end: stay.start, length: 30 }, NOW)).toBeDefined();
    expect(searchProblem({ start: stay.start, end: addDays(stay.start, 200), length: 30 }, NOW)).toBeDefined();
    expect(searchProblem({ ...stay, length: 0 }, NOW)).toBeDefined();
  });

  it("only offers free berths the boat fits, at open marinas, out of repair", () => {
    const db = createSeed();
    const found = availableBerths(db, { ...stay, length: 40 });
    expect(found.length).toBeGreaterThan(0);
    for (const b of found) {
      expect(b.maxLength).toBeGreaterThanOrEqual(40);
      expect(b.underMaintenance).toBe(false);
      expect(db.marinas.find((m) => m.id === b.marinaId)?.status).toBe("active");
      expect(berthIsFree(db, b.id, stay.start, stay.end)).toBe(true);
    }
    const closed = { ...db, marinas: db.marinas.map((m) => ({ ...m, status: "inactive" as const })) };
    expect(availableBerths(closed, { ...stay, length: 40 })).toEqual([]);
  });
});

describe("online booking", () => {
  it("holds the berth as a request waiting for the marina, at today's price", () => {
    const db = createSeed();
    const berth = availableBerths(db, { ...stay, length: 30 })[0];
    const boat = db.boats.find((b) => b.length <= berth.maxLength)!;
    const r = withOnlineBooking(db, { boatId: boat.id, berthId: berth.id, ...stay, guests: 2, now: NOW, at: `${NOW}T12:00:00Z` });
    expect(r.error).toBeUndefined();
    expect(r.booking).toMatchObject({ status: "pending", berthId: berth.id, boatId: boat.id, price: quote(db, berth, stay.start, stay.end) });
    expect(r.booking!.code).toMatch(/^BK-\d{4}$/);
    expect(db.bookings.some((b) => b.code === r.booking!.code)).toBe(false);
    expect(berthIsFree(r.db, berth.id, stay.start, stay.end)).toBe(false);
    expect(r.db.activity[0]).toMatchObject({ by: "Online booking", marinaId: berth.marinaId });
  });

  it("refuses a berth that's taken, or too short for the boat", () => {
    const db = createSeed();
    const berth = availableBerths(db, { ...stay, length: 30 })[0];
    const boat = db.boats.find((b) => b.length <= berth.maxLength)!;
    const first = withOnlineBooking(db, { boatId: boat.id, berthId: berth.id, ...stay, guests: 1, now: NOW, at: NOW });
    expect(withOnlineBooking(first.db, { boatId: boat.id, berthId: berth.id, ...stay, guests: 1, now: NOW, at: NOW }).error).toBeDefined();
    const long = db.boats.find((b) => b.length > berth.maxLength);
    if (long) expect(withOnlineBooking(db, { boatId: long.id, berthId: berth.id, ...stay, guests: 1, now: NOW, at: NOW }).error).toBeDefined();
  });

  it("lets the owner cancel a request the marina hasn't approved", () => {
    const db = createSeed();
    const berth = availableBerths(db, { ...stay, length: 30 })[0];
    const boat = db.boats.find((b) => b.length <= berth.maxLength)!;
    const r = withOnlineBooking(db, { boatId: boat.id, berthId: berth.id, ...stay, guests: 1, now: NOW, at: NOW });
    const cancelled = withRequestCancelled(r.db, r.booking!.id, NOW);
    expect(cancelled.bookings.find((b) => b.id === r.booking!.id)?.status).toBe("cancelled");
    expect(berthIsFree(cancelled, berth.id, stay.start, stay.end)).toBe(true);
    // Confirmed bookings go through the marina instead.
    const confirmed = db.bookings.find((b) => b.status === "confirmed")!;
    expect(withRequestCancelled(db, confirmed.id, NOW)).toBe(db);
  });
});

describe("paying an invoice", () => {
  it("records part payments, and marks the invoice paid when the balance is cleared", () => {
    const db = createSeed();
    const inv = db.invoices.find((i) => i.status === "due" && i.payments.length === 0 && i.amount > 50)!;
    const part = withCardPayment(db, inv.id, 20, { now: NOW, at: NOW });
    const after = part.invoices.find((i) => i.id === inv.id)!;
    expect(after.status).toBe("due");
    expect(amountDue(after)).toBeCloseTo(inv.amount - 20);
    const full = withCardPayment(part, inv.id, 999999, { now: NOW, at: NOW });
    const paid = full.invoices.find((i) => i.id === inv.id)!;
    expect(paid).toMatchObject({ status: "paid", paidAt: NOW, method: "Card" });
    expect(paid.payments.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(inv.amount);
    expect(amountDue(paid)).toBe(0);
  });
});

describe("contracts, boats and owners", () => {
  it("signs a contract once, with the owner's name", () => {
    const db = createSeed();
    const c = db.contracts[0];
    const signed = withContractSigned(db, c.id, "  Ada Lovelace ", `${NOW}T10:00:00Z`);
    expect(signed.contracts.find((x) => x.id === c.id)?.signed).toEqual({ name: "Ada Lovelace", at: `${NOW}T10:00:00Z` });
    expect(withContractSigned(signed, c.id, "Someone Else", NOW)).toBe(signed);
    expect(withContractSigned(db, c.id, "   ", NOW)).toBe(db);
  });

  it("adds and edits only the owner's own boats", () => {
    const db = createSeed();
    const { db: d1, owner } = withOwner(db, { name: "New Owner", email: "new@example.com", phone: "" }, NOW);
    const { db: d2, boat } = withBoat(d1, owner.id, { name: "Sea Breeze", type: "Sailboat", length: 32, registration: "" });
    expect(d2.boats.find((b) => b.id === boat.id)?.ownerId).toBe(owner.id);
    const { db: d3 } = withBoat(d2, owner.id, { ...boat, length: 34 });
    expect(d3.boats.find((b) => b.id === boat.id)?.length).toBe(34);
    expect(d3.boats.length).toBe(d2.boats.length);
    // Someone else's boat id is treated as a new boat, never an edit.
    const other = db.boats[0];
    const { db: d4 } = withBoat(d3, owner.id, { ...other, name: "Hijacked" });
    expect(d4.boats.find((b) => b.id === other.id)?.name).toBe(other.name);
  });

  it("lists an owner's bookings and invoices", () => {
    const db = createSeed();
    const c = db.contracts[0];
    const bookings = ownerBookings(db, c.ownerId);
    expect(bookings.some((b) => b.id === c.bookingId)).toBe(true);
    const boats = new Set(db.boats.filter((b) => b.ownerId === c.ownerId).map((b) => b.id));
    expect(bookings.every((b) => boats.has(b.boatId))).toBe(true);
    expect(ownerInvoices(db, c.ownerId).every((i) => bookings.some((b) => b.id === i.bookingId))).toBe(true);
  });
});

describe("demo owner", () => {
  it("has a believable history without changing any dashboard number", async () => {
    const { Index } = await import("../src/selectors");
    const { withDemoOwner } = await import("../src/portal");
    const db = createSeed();
    const out = withDemoOwner(db, "owner@marina.com", NOW);
    const owner = out.owners.find((o) => o.email === "owner@marina.com")!;
    const stays = ownerBookings(out, owner.id).filter((b) => b.status !== "cancelled");
    expect(stays.length).toBeGreaterThan(0);
    expect(stays.length).toBeLessThanOrEqual(8);
    expect(stays.filter((a) => stays.some((b) => b !== a && b.boatId === a.boatId && b.start < a.end && a.start < b.end))).toEqual([]);
    expect(out.contracts.some((c) => c.ownerId === owner.id && c.status === "active")).toBe(true);
    // Every contract still matches its booking's boat and that boat's owner.
    for (const c of out.contracts) {
      const b = out.bookings.find((x) => x.id === c.bookingId)!;
      expect(c.boatId).toBe(b.boatId);
      expect(c.ownerId).toBe(out.boats.find((x) => x.id === b.boatId)!.ownerId);
    }
    const ids = db.marinas.map((m) => m.id);
    expect(new Index(out).metrics(ids)).toEqual(new Index(db).metrics(ids));
    // Boats still fit their berths.
    for (const b of out.bookings) expect(out.boats.find((x) => x.id === b.boatId)!.length).toBeLessThanOrEqual(out.berths.find((x) => x.id === b.berthId)!.maxLength);
    expect(withDemoOwner(out, "owner@marina.com", NOW)).toBe(out);
  });
});

describe("waitlist", () => {
  it("adds a request for the marina's waitlist once, and lists it for the owner", async () => {
    const { withWaitlistRequest, ownerWaitlist } = await import("../src/portal");
    const db = createSeed();
    const req = { marinaId: db.marinas[0].id, name: " Sam Lee ", email: "Sam@Example.com", phone: "", boatName: "Osprey", boatLength: 38, ...stay, now: NOW, at: NOW };
    const r = withWaitlistRequest(db, req);
    expect(r.duplicate).toBe(false);
    expect(r.entry).toMatchObject({ status: "waiting", name: "Sam Lee", email: "sam@example.com", createdAt: NOW });
    expect(r.db.waitlist?.length).toBe((db.waitlist ?? []).length + 1);
    expect(r.db.activity[0]).toMatchObject({ by: "Website", marinaId: db.marinas[0].id });
    const again = withWaitlistRequest(r.db, req);
    expect(again.duplicate).toBe(true);
    expect(again.db).toBe(r.db);
    expect(ownerWaitlist(r.db, "sam@example.com").map((w) => w.id)).toEqual([r.entry.id]);
  });
});
