// Approving and declining bookings and staff requests. Same rules as the web app: approving a
// booking confirms it and creates its invoice; declining cancels it and voids any unpaid invoice.
import { BLOCKING, withInvoice, type Booking, type Db, type Index, type StaffRequest } from "@marina/shared";
import { useStore } from "../store";

/** Another active booking on the same berth that overlaps this one, or an out-of-service berth. */
export function clashFor(ix: Index, bk: Booking): string | undefined {
  const berth = ix.berth(bk.berthId);
  if (berth?.underMaintenance) return `Berth ${berth.code} is out of service.`;
  const other = (ix.bookingsByBerth.get(bk.berthId) ?? []).find(
    (b) => b.id !== bk.id && b.status !== "pending" && BLOCKING.includes(b.status) && b.start < bk.end && b.end > bk.start,
  );
  return other ? `Clashes with ${ix.boat(other.boatId)?.name} (${other.code}) on berth ${berth?.code}.` : undefined;
}

const approveIn = (d: Db, ix: Index, bk: Booking): Db =>
  withInvoice({ ...d, bookings: d.bookings.map((x) => (x.id === bk.id ? { ...x, status: "confirmed" as const } : x)) }, bk.id, ix.amount(bk));

export function useApprovals() {
  const { db, ix, update, toast, user } = useStore();

  const approve = (bk: Booking) => {
    const clash = clashFor(ix, bk);
    if (clash) return toast(clash, undefined, "warning");
    const before = db;
    const boat = ix.boat(bk.boatId);
    update((d) => approveIn(d, ix, bk), { text: `${bk.code} approved and invoiced (${boat?.name})`, to: `/bookings?q=${bk.code}`, marinaId: ix.berth(bk.berthId)?.marinaId });
    toast(`${boat?.name} approved and invoiced`, before);
  };

  const decline = (bk: Booking) => {
    const before = db;
    const boat = ix.boat(bk.boatId);
    update(
      (d) => ({
        ...d,
        bookings: d.bookings.map((x) => (x.id === bk.id ? { ...x, status: "cancelled" as const } : x)),
        invoices: d.invoices.map((i) => (i.bookingId === bk.id && i.status !== "paid" ? { ...i, status: "void" as const } : i)),
      }),
      { text: `${bk.code} declined (${boat?.name})`, to: `/bookings?q=${bk.code}`, marinaId: ix.berth(bk.berthId)?.marinaId },
    );
    toast(`${boat?.name} declined`, before);
  };

  /** Approves every booking that doesn't clash; clashing ones are left for a decision. */
  const approveAll = (list: Booking[]) => {
    const ok = list.filter((b) => !clashFor(ix, b));
    if (!ok.length) return toast("Every booking here clashes with another one. Open each to decide.", undefined, "warning");
    const before = db;
    update((d) => ok.reduce((acc, b) => approveIn(acc, ix, b), d), { text: `Approved ${ok.length} pending ${ok.length === 1 ? "booking" : "bookings"}` });
    const skipped = list.length - ok.length;
    toast(`${ok.length} approved and invoiced${skipped ? `. ${skipped} with clashes left to check.` : ""}`, before);
  };

  const decide = (r: StaffRequest, status: "approved" | "declined") => {
    const before = db;
    const who = ix.staffMember(r.staffId);
    update(
      (d) => ({ ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, status, decidedBy: user?.name, decidedAt: new Date().toISOString() } : x)) }),
      { text: `${status === "approved" ? "Approved" : "Declined"} ${who?.name}'s ${r.kind === "leave" ? "time off" : "shift swap"} request`, to: "/staff?tab=requests", marinaId: who?.marinaId },
    );
    toast(`${status === "approved" ? "Approved" : "Declined"}. ${who?.name.split(" ")[0]} sees it in the app.`, before);
  };

  return { approve, decline, approveAll, decide };
}
