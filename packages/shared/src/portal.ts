// What boat owners can do on the public website: find a free berth, book it, pay invoices, sign
// contracts and keep their boats up to date. Plain functions over the data, like actions.ts, so
// the same rules apply when a real backend takes over.
import type { Db } from "./seed";
import type { Berth, Boat, BoatOwner, Booking, Invoice, WaitlistEntry } from "./types";
import { BLOCKING } from "./selectors";
import { bookingAmount } from "./pricing";
import { daysBetween } from "./date";
import { nextId } from "./util";

/** Longest stay the website takes in one booking (longer stays go on a contract). */
export const MAX_ONLINE_NIGHTS = 180;

export interface BerthSearch {
  start: string;
  end: string;
  /** Boat length in feet. */
  length: number;
  marinaId?: string;
}

/** Why a search can't run, or undefined when it's fine. */
export function searchProblem(q: BerthSearch, now: string): string | undefined {
  if (!q.start || !q.end) return "Choose your arrival and departure dates.";
  if (q.start < now) return "Arrival can't be in the past.";
  const nights = daysBetween(q.start, q.end);
  if (nights < 1) return "Departure must be at least one night after arrival.";
  if (nights > MAX_ONLINE_NIGHTS) return "For stays over 6 months, ask us about a contract.";
  if (!(q.length > 0) || q.length > 200) return "Enter your boat's length in feet.";
  return undefined;
}

/** True when nothing else holds the berth for any of the nights [start, end). */
export function berthIsFree(d: Db, berthId: string, start: string, end: string, ignoreBookingId?: string): boolean {
  return !d.bookings.some((b) => b.berthId === berthId && b.id !== ignoreBookingId && BLOCKING.includes(b.status) && b.start < end && start < b.end);
}

/** Berths a boat fits in and can have for the whole stay, at open marinas, smallest berth first. */
export function availableBerths(d: Db, q: BerthSearch): Berth[] {
  const open = new Set(d.marinas.filter((m) => m.status === "active" && (!q.marinaId || m.id === q.marinaId)).map((m) => m.id));
  return d.berths
    .filter((b) => open.has(b.marinaId) && !b.underMaintenance && b.maxLength >= q.length && berthIsFree(d, b.id, q.start, q.end))
    .sort((a, b) => a.maxLength - b.maxLength || a.dailyRate - b.dailyRate || a.code.localeCompare(b.code));
}

/** Price of a stay at today's rules (the same the front desk uses). */
export const quote = (d: Db, berth: Berth, start: string, end: string) => bookingAmount(start, end, berth, d.settings.monthlyFromNights, d.settings.pricing);

const nextCode = (prefix: string, codes: string[]) =>
  `${prefix}-${String(codes.reduce((m, c) => Math.max(m, Number(c.split("-").pop()) || 0), 0) + 1).padStart(4, "0")}`;

const logged = (d: Db, entry: Omit<Db["activity"][number], "id">): Db => ({ ...d, activity: [{ id: nextId("a", d.activity), ...entry }, ...d.activity].slice(0, 200) });

/**
 * A booking made online. It waits for the marina to approve it (and invoice it), like every
 * booking request; the berth is held meanwhile. Fails if the berth was taken in the meantime.
 */
export function withOnlineBooking(
  d: Db,
  r: { boatId: string; berthId: string; start: string; end: string; guests: number; now: string; at: string },
): { db: Db; booking?: Booking; error?: string } {
  const berth = d.berths.find((b) => b.id === r.berthId);
  const boat = d.boats.find((b) => b.id === r.boatId);
  if (!berth || !boat) return { db: d, error: "That berth or boat no longer exists." };
  if (boat.length > berth.maxLength) return { db: d, error: "Your boat is too long for this berth." };
  if (!berthIsFree(d, berth.id, r.start, r.end)) return { db: d, error: "Someone just booked this berth. Choose another one." };
  const booking: Booking = {
    id: nextId("bk", d.bookings),
    code: nextCode("BK", d.bookings.map((b) => b.code)),
    boatId: boat.id,
    berthId: berth.id,
    start: r.start,
    end: r.end,
    guests: Math.max(1, Math.round(r.guests)),
    status: "pending",
    createdAt: r.now,
    price: quote(d, berth, r.start, r.end),
  };
  const marina = d.marinas.find((m) => m.id === berth.marinaId);
  const next = logged({ ...d, bookings: [...d.bookings, booking] }, { at: r.at, by: "Online booking", text: `New booking ${booking.code} for ${boat.name} at ${marina?.name}`, to: `/bookings?q=${booking.code}`, marinaId: berth.marinaId });
  return { db: next, booking };
}

/** The owner cancels a request the marina hasn't approved yet. */
export function withRequestCancelled(d: Db, bookingId: string, at: string): Db {
  const b = d.bookings.find((x) => x.id === bookingId);
  if (!b || b.status !== "pending") return d;
  const marinaId = d.berths.find((x) => x.id === b.berthId)?.marinaId;
  return logged({ ...d, bookings: d.bookings.map((x) => (x.id === b.id ? { ...x, status: "cancelled" as const } : x)) }, { at, by: "Online booking", text: `Owner cancelled booking request ${b.code}`, to: `/bookings?q=${b.code}`, marinaId });
}

/** What's still owed on an invoice. */
export const amountDue = (inv: Invoice) => (inv.status === "paid" || inv.status === "void" ? 0 : Math.max(0, Math.round((inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100));

/** A card payment made in the owner portal. Paying the whole balance marks the invoice paid. */
export function withCardPayment(d: Db, invoiceId: string, amount: number, r: { now: string; at: string }): Db {
  const inv = d.invoices.find((i) => i.id === invoiceId);
  if (!inv) return d;
  const due = amountDue(inv);
  const paid = Math.min(due, Math.round(amount * 100) / 100);
  if (paid <= 0) return d;
  const full = paid >= due;
  const updated: Invoice = { ...inv, payments: [...inv.payments, { date: r.now, amount: paid, method: "Card" }], ...(full ? { status: "paid" as const, paidAt: r.now, method: "Card" as const } : {}) };
  const booking = d.bookings.find((b) => b.id === inv.bookingId);
  const marinaId = d.berths.find((b) => b.id === booking?.berthId)?.marinaId;
  return logged({ ...d, invoices: d.invoices.map((i) => (i.id === inv.id ? updated : i)) }, { at: r.at, by: "Owner portal", text: `Card payment of ${paid.toFixed(2)} for ${inv.number}${full ? " (paid in full)" : ""}`, to: `/billing?q=${inv.number}`, marinaId });
}

/** The owner signs a contract with their typed full name. */
export function withContractSigned(d: Db, contractId: string, name: string, at: string): Db {
  const c = d.contracts.find((x) => x.id === contractId);
  if (!c || c.signed || !name.trim()) return d;
  return logged({ ...d, contracts: d.contracts.map((x) => (x.id === c.id ? { ...x, signed: { name: name.trim(), at } } : x)) }, { at, by: "Owner portal", text: `${name.trim()} signed contract ${c.code}`, to: "/contracts", marinaId: c.marinaId });
}

/** Adds a boat for an owner, or updates one of theirs. */
export function withBoat(d: Db, ownerId: string, boat: Omit<Boat, "id" | "ownerId"> & { id?: string }): { db: Db; boat: Boat } {
  const existing = boat.id ? d.boats.find((b) => b.id === boat.id && b.ownerId === ownerId) : undefined;
  const saved: Boat = { ...boat, id: existing?.id ?? nextId("bt", d.boats), ownerId };
  return { db: { ...d, boats: existing ? d.boats.map((b) => (b.id === saved.id ? saved : b)) : [...d.boats, saved] }, boat: saved };
}

/** A new boat owner who signed up on the website. */
export function withOwner(d: Db, o: Omit<BoatOwner, "id" | "since">, now: string): { db: Db; owner: BoatOwner } {
  const owner: BoatOwner = { ...o, id: nextId("o", d.owners), since: now };
  return { db: { ...d, owners: [...d.owners, owner] }, owner };
}

/**
 * Asks to be told when a berth frees up at a full marina. The request lands on the web app's
 * Waitlist tab, where staff offer freed-up berths. Asking again for the same stay changes nothing.
 */
export function withWaitlistRequest(
  d: Db,
  r: Omit<WaitlistEntry, "id" | "status" | "createdAt" | "offeredBerthId"> & { now: string; at: string },
): { db: Db; entry: WaitlistEntry; duplicate: boolean } {
  const list = d.waitlist ?? [];
  const email = r.email.trim().toLowerCase();
  const same = list.find((w) => w.email.toLowerCase() === email && w.marinaId === r.marinaId && w.start === r.start && w.end === r.end && (w.status === "waiting" || w.status === "offered"));
  if (same) return { db: d, entry: same, duplicate: true };
  const { now, at, ...rest } = r;
  const entry: WaitlistEntry = { ...rest, email, name: r.name.trim(), boatName: r.boatName.trim(), note: r.note?.trim() || undefined, id: nextId("wl", list), status: "waiting", createdAt: now };
  const marina = d.marinas.find((m) => m.id === r.marinaId);
  const next = logged({ ...d, waitlist: [...list, entry] }, { at, by: "Website", text: `Waitlist request from ${entry.name} at ${marina?.name}`, to: "/bookings?view=waitlist", marinaId: r.marinaId });
  return { db: next, entry, duplicate: false };
}

/** Waitlist requests made with this email that are still open. */
export const ownerWaitlist = (d: Db, email: string) =>
  (d.waitlist ?? []).filter((w) => w.email.toLowerCase() === email.toLowerCase() && (w.status === "waiting" || w.status === "offered"));

/** An owner's bookings, newest stay first. */
export function ownerBookings(d: Db, ownerId: string): Booking[] {
  const boats = new Set(d.boats.filter((b) => b.ownerId === ownerId).map((b) => b.id));
  return d.bookings.filter((b) => boats.has(b.boatId)).sort((a, b) => b.start.localeCompare(a.start));
}

/** An owner's invoices, newest first. */
export function ownerInvoices(d: Db, ownerId: string): Invoice[] {
  const bookings = new Set(ownerBookings(d, ownerId).map((b) => b.id));
  return d.invoices.filter((i) => bookings.has(i.bookingId)).sort((a, b) => b.issued.localeCompare(a.issued));
}

/**
 * Gives the demo owner account a believable history. The sample data books boats at random, so
 * most sample owners have overlapping stays at several marinas. This picks the owner of a current
 * contract, keeps a handful of their stays that don't overlap (the contract, an unpaid invoice, an
 * upcoming stay and a few past ones) and moves their other bookings to other sample boats that
 * fit. Berths, dates and prices don't change, so every dashboard number stays the same.
 */
export function withDemoOwner(d: Db, email: string, now: string, keep = 8): Db {
  if (d.owners.some((o) => o.email === email)) return d;
  const contract = d.contracts.find((c) => c.status === "active" && c.end > now);
  const owner = d.owners.find((o) => o.id === (contract?.ownerId ?? d.owners[0]?.id));
  if (!owner) return d;
  const mine = new Set(d.boats.filter((b) => b.ownerId === owner.id).map((b) => b.id));
  const owed = new Set(d.invoices.filter((i) => amountDue(i) > 0).map((i) => i.bookingId));
  const rank = (b: Booking) => (b.id === contract?.bookingId ? 0 : owed.has(b.id) ? 1 : b.start > now ? 2 : 3);
  const theirs = d.bookings.filter((b) => mine.has(b.boatId)).sort((a, b) => rank(a) - rank(b) || b.start.localeCompare(a.start));
  const kept: Booking[] = [];
  for (const b of theirs) {
    const clash = kept.some((k) => k.boatId === b.boatId && k.start < b.end && b.start < k.end);
    if (!clash && kept.length < keep) kept.push(b);
  }
  const keptIds = new Set(kept.map((b) => b.id));
  const others = d.boats.filter((b) => !mine.has(b.id));
  const berthLength = new Map(d.berths.map((b) => [b.id, b.maxLength]));
  const moved = new Map<string, string>();
  const bookings = d.bookings.map((b, i) => {
    if (!mine.has(b.boatId) || keptIds.has(b.id)) return b;
    const fits = others.filter((x) => x.length <= (berthLength.get(b.berthId) ?? 0));
    const boat = fits.length ? fits[i % fits.length] : undefined;
    if (!boat) return b;
    moved.set(b.id, boat.id);
    return { ...b, boatId: boat.id };
  });
  const ownerOfBoat = new Map(d.boats.map((b) => [b.id, b.ownerId]));
  const contracts = d.contracts.map((c) => (moved.has(c.bookingId) ? { ...c, boatId: moved.get(c.bookingId)!, ownerId: ownerOfBoat.get(moved.get(c.bookingId)!)! } : c));
  return { ...d, bookings, contracts, owners: d.owners.map((o) => (o.id === owner.id ? { ...o, email } : o)) };
}
