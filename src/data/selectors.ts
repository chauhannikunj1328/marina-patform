// All dashboard numbers come from these functions, so every page agrees.
import type { Berth, Booking } from "./types";
import type { Db } from "./seed";
import { bookingAmount } from "./pricing";
import { addDays, daysBetween, daysInMonth, lastMonths, monthKey, nightsInMonth, today } from "@/lib/date";

export type BerthStatus = "available" | "occupied" | "reserved" | "maintenance";

export const BLOCKING: Booking["status"][] = ["pending", "confirmed", "checked-in"];
export const REVENUE: Booking["status"][] = ["confirmed", "checked-in", "completed"];

export class Index {
  berthById: Map<string, Berth>;
  bookingsByBerth: Map<string, Booking[]>;
  constructor(public db: Db) {
    this.berthById = new Map(db.berths.map((b) => [b.id, b]));
    this.bookingsByBerth = new Map();
    for (const bk of db.bookings) {
      const list = this.bookingsByBerth.get(bk.berthId) ?? [];
      list.push(bk);
      this.bookingsByBerth.set(bk.berthId, list);
    }
  }

  marina = (id: string) => this.db.marinas.find((m) => m.id === id);
  city = (id: string) => this.db.cities.find((c) => c.id === id);
  county = (id: string) => this.db.counties.find((c) => c.id === id);
  boat = (id: string) => this.db.boats.find((b) => b.id === id);
  owner = (id: string) => this.db.owners.find((o) => o.id === id);
  staffMember = (id?: string) => (id ? this.db.staff.find((s) => s.id === id) : undefined);
  berth = (id: string) => this.berthById.get(id);
  booking = (id: string) => this.db.bookings.find((b) => b.id === id);

  marinaOfBerth = (berthId: string) => this.marina(this.berth(berthId)?.marinaId ?? "");
  cityOfMarina = (marinaId: string) => this.city(this.marina(marinaId)?.cityId ?? "");
  countyOfCity = (cityId: string) => this.county(this.city(cityId)?.countyId ?? "");

  amount = (bk: Booking) => {
    const b = this.berth(bk.berthId);
    return b ? bookingAmount(bk.start, bk.end, b, this.db.settings.monthlyFromNights) : 0;
  };

  invoiceOf = (bookingId: string) => this.db.invoices.find((i) => i.bookingId === bookingId);
  marinaOfInvoice = (inv: { bookingId: string }) => this.berth(this.booking(inv.bookingId)?.berthId ?? "")?.marinaId;

  /** Boat owners who have booked at one of these marinas, plus new owners with no bookings yet. */
  ownersIn(marinaIds: string[], all: boolean) {
    if (all) return this.db.owners;
    const set = new Set(marinaIds);
    const boatsBooked = new Map<string, boolean>();
    for (const bk of this.db.bookings) {
      const inScope = set.has(this.berth(bk.berthId)?.marinaId ?? "");
      if (inScope || !boatsBooked.has(bk.boatId)) boatsBooked.set(bk.boatId, inScope || (boatsBooked.get(bk.boatId) ?? false));
    }
    return this.db.owners.filter((o) => {
      const boats = this.db.boats.filter((b) => b.ownerId === o.id);
      const booked = boats.filter((b) => boatsBooked.has(b.id));
      return booked.length === 0 || booked.some((b) => boatsBooked.get(b.id));
    });
  }
  ownerOfBooking = (bk: Booking) => this.owner(this.boat(bk.boatId)?.ownerId ?? "");

  /** Booking occupying the berth on a given day, if any. */
  currentBooking(berthId: string, day = today()): Booking | undefined {
    return this.bookingsByBerth
      .get(berthId)
      ?.find((bk) => (bk.status === "checked-in" || bk.status === "confirmed") && bk.start <= day && bk.end > day);
  }

  nextBooking(berthId: string, day = today()): Booking | undefined {
    return this.bookingsByBerth
      .get(berthId)
      ?.filter((bk) => (bk.status === "confirmed" || bk.status === "pending") && bk.start > day)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
  }

  berthStatus(berth: Berth, day = today()): BerthStatus {
    if (berth.underMaintenance) return "maintenance";
    if (this.currentBooking(berth.id, day)) return "occupied";
    const next = this.nextBooking(berth.id, day);
    if (next && daysBetween(day, next.start) <= 7) return "reserved";
    return "available";
  }

  /** Bookings that overlap another active booking on the same berth. */
  conflicts(): [Booking, Booking][] {
    const out: [Booking, Booking][] = [];
    for (const list of this.bookingsByBerth.values()) {
      const active = list.filter((b) => BLOCKING.includes(b.status)).sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < active.length; i++)
        for (let j = i + 1; j < active.length && active[j].start < active[i].end; j++) out.push([active[i], active[j]]);
    }
    return out;
  }

  /** Active bookings in the next two weeks on berths that are out of service. */
  serviceConflicts(berthId?: string): Booking[] {
    const now = today();
    const soon = addDays(now, 14);
    return this.db.bookings.filter(
      (bk) => (!berthId || bk.berthId === berthId) && (bk.status === "pending" || bk.status === "confirmed") && bk.end > now && bk.start <= soon && (berthId || this.berth(bk.berthId)?.underMaintenance),
    );
  }

  isFree(berthId: string, start: string, end: string, ignoreId?: string): boolean {
    return !(this.bookingsByBerth.get(berthId) ?? []).some(
      (b) => b.id !== ignoreId && BLOCKING.includes(b.status) && b.start < end && b.end > start,
    );
  }

  // ---- scoped metrics --------------------------------------------------

  berthsIn(marinaIds: string[]) {
    const set = new Set(marinaIds);
    return this.db.berths.filter((b) => set.has(b.marinaId));
  }

  bookingsIn(marinaIds: string[]) {
    const set = new Set(marinaIds);
    return this.db.bookings.filter((bk) => set.has(this.berth(bk.berthId)?.marinaId ?? ""));
  }

  revenueByMonth(marinaIds: string[], months: string[]): number[] {
    const totals = months.map(() => 0);
    for (const bk of this.bookingsIn(marinaIds)) {
      if (!REVENUE.includes(bk.status)) continue;
      const nights = daysBetween(bk.start, bk.end);
      const amt = this.amount(bk);
      months.forEach((m, i) => {
        const n = nightsInMonth(bk.start, bk.end, m);
        if (n) totals[i] += (amt * n) / nights;
      });
    }
    return totals.map(Math.round);
  }

  /** Booked berth-nights divided by available berth-nights, per month (up to today for the current month). */
  occupancyByMonth(marinaIds: string[], months: string[]): number[] {
    const berths = this.berthsIn(marinaIds);
    const now = today();
    const nowKey = monthKey(now);
    const booked = months.map(() => 0);
    for (const bk of this.bookingsIn(marinaIds)) {
      if (!(bk.status === "checked-in" || bk.status === "completed" || bk.status === "confirmed")) continue;
      months.forEach((m, i) => {
        const end = m === nowKey ? (bk.end < addDays(now, 1) ? bk.end : addDays(now, 1)) : bk.end;
        if (end > bk.start) booked[i] += nightsInMonth(bk.start, end, m);
      });
    }
    return months.map((m, i) => {
      const days = m === nowKey ? Number(now.slice(8, 10)) : daysInMonth(m);
      const cap = berths.length * days;
      return cap ? booked[i] / cap : 0;
    });
  }

  metrics(marinaIds: string[]) {
    const now = today();
    const berths = this.berthsIn(marinaIds);
    const statuses = berths.map((b) => this.berthStatus(b, now));
    const occupied = statuses.filter((s) => s === "occupied").length;
    const maintenance = statuses.filter((s) => s === "maintenance").length;
    const reserved = statuses.filter((s) => s === "reserved").length;
    const months = lastMonths(2, now);
    const [prevRevenue, revenue] = this.revenueByMonth(marinaIds, months);
    const bookings = this.bookingsIn(marinaIds);
    const monthAgo = addDays(now, -30);
    const occupiedMonthAgo = berths.filter((b) =>
      this.bookingsByBerth.get(b.id)?.some((bk) => bk.status !== "cancelled" && bk.status !== "pending" && bk.start <= monthAgo && bk.end > monthAgo),
    ).length;
    return {
      marinas: marinaIds.length,
      berths: berths.length,
      occupied,
      reserved,
      maintenance,
      available: berths.length - occupied - maintenance - reserved,
      occupancy: berths.length ? occupied / berths.length : 0,
      occupancyPrev: berths.length ? occupiedMonthAgo / berths.length : 0,
      revenue,
      prevRevenue,
      revenueChange: prevRevenue ? (revenue - prevRevenue) / prevRevenue : 0,
      checkedIn: bookings.filter((b) => b.status === "checked-in").length,
      pending: bookings.filter((b) => b.status === "pending").length,
      upcoming: bookings.filter((b) => (b.status === "confirmed" || b.status === "pending") && b.start > now).length,
      arrivalsToday: bookings.filter((b) => b.start === now && b.status !== "cancelled").length,
      departuresToday: bookings.filter((b) => b.end === now && b.status !== "cancelled").length,
    };
  }

  marinaIdsInCity = (cityId: string) => this.db.marinas.filter((m) => m.cityId === cityId).map((m) => m.id);
  marinaIdsInCounty = (countyId: string) => {
    const cities = new Set(this.db.cities.filter((c) => c.countyId === countyId).map((c) => c.id));
    return this.db.marinas.filter((m) => cities.has(m.cityId)).map((m) => m.id);
  };
  allMarinaIds = () => this.db.marinas.map((m) => m.id);
}
