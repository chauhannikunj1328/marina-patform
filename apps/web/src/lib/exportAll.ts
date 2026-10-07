// "Export all data": every table in the marinas this person can see, as one Excel workbook.
import type { Db, Index } from "@marina/shared";
import { daysBetween } from "@marina/shared";
import type { Sheet } from "./csv";

export function allDataSheets(db: Db, ix: Index, scope: string[]): Sheet[] {
  const inScope = new Set(scope);
  const berthIds = new Set(db.berths.filter((b) => inScope.has(b.marinaId)).map((b) => b.id));
  const bookings = db.bookings.filter((b) => berthIds.has(b.berthId));
  const bookingIds = new Set(bookings.map((b) => b.id));
  const invoices = db.invoices.filter((i) => bookingIds.has(i.bookingId));
  const boatIds = new Set(bookings.map((b) => b.boatId));
  const ownerIds = new Set(db.boats.filter((b) => boatIds.has(b.id)).map((b) => b.ownerId));
  return [
    { name: "Marinas", head: ["ID", "Name", "City", "County", "Address", "Phone", "Email", "Status", "Berths"], rows: db.marinas.filter((m) => inScope.has(m.id)).map((m) => [m.id, m.name, ix.city(m.cityId)?.name ?? "", ix.countyOfCity(m.cityId)?.name ?? "", m.address, m.phone, m.email, m.status, db.berths.filter((b) => b.marinaId === m.id).length]) },
    { name: "Berths", head: ["ID", "Marina", "Code", "Max length (ft)", "Type", "Daily rate", "Monthly rate", "Power", "Water", "Status today"], rows: db.berths.filter((b) => inScope.has(b.marinaId)).map((b) => [b.id, ix.marina(b.marinaId)?.name ?? "", b.code, b.maxLength, b.type, b.dailyRate, b.monthlyRate, b.power ? "Yes" : "No", b.water ? "Yes" : "No", ix.berthStatus(b)]) },
    { name: "Bookings", head: ["Code", "Marina", "Berth", "Boat", "Owner", "Arrival", "Departure", "Nights", "Guests", "Status", "Price", "Created"], rows: bookings.map((b) => [b.code, ix.marinaOfBerth(b.berthId)?.name ?? "", ix.berth(b.berthId)?.code ?? "", ix.boat(b.boatId)?.name ?? "", ix.ownerOfBooking(b)?.name ?? "", b.start, b.end, daysBetween(b.start, b.end), b.guests, b.status, ix.amount(b), b.createdAt]) },
    { name: "Boat owners", head: ["ID", "Name", "Email", "Phone", "Customer since", "Boats"], rows: db.owners.filter((o) => ownerIds.has(o.id)).map((o) => [o.id, o.name, o.email, o.phone, o.since, db.boats.filter((b) => b.ownerId === o.id).map((b) => b.name).join(", ")]) },
    { name: "Boats", head: ["ID", "Name", "Owner", "Type", "Length (ft)", "Registration"], rows: db.boats.filter((b) => ownerIds.has(b.ownerId)).map((b) => [b.id, b.name, ix.owner(b.ownerId)?.name ?? "", b.type, b.length, b.registration]) },
    { name: "Invoices", head: ["Number", "Booking", "Marina", "Issued", "Due", "Amount", "Paid", "Balance", "Status", "Reminders"], rows: invoices.map((i) => [i.number, ix.booking(i.bookingId)?.code ?? "", ix.marina(ix.marinaOfInvoice(i) ?? "")?.name ?? "", i.issued, i.due, i.amount, ix.paidSoFar(i), ix.balance(i), i.status, i.reminders.length]) },
    { name: "Payments", head: ["Invoice", "Date", "Amount", "Method"], rows: invoices.flatMap((i) => i.payments.map((p) => [i.number, p.date, p.amount, p.method])) },
    { name: "Service charges", head: ["Invoice", "Service", "Quantity", "Unit", "Unit price", "Amount", "Date", "By"], rows: invoices.flatMap((i) => (i.lines ?? []).map((l) => [i.number, l.label, l.qty, l.unit, l.unitPrice, l.amount, l.at.slice(0, 10), l.by])) },
    { name: "Staff", head: ["ID", "Name", "Position", "Department", "Marina", "Shift", "Status", "Email", "Phone"], rows: db.staff.filter((s) => inScope.has(s.marinaId)).map((s) => [s.id, s.name, s.position, s.department, ix.marina(s.marinaId)?.name ?? "", s.shift, s.status, s.email, s.phone]) },
    { name: "Work orders", head: ["Code", "Title", "Marina", "Berth", "Priority", "Status", "Created", "Due", "Done", "Assigned to"], rows: db.tasks.filter((t) => inScope.has(t.marinaId)).map((t) => [t.code, t.title, ix.marina(t.marinaId)?.name ?? "", t.berthId ? ix.berth(t.berthId)?.code ?? "" : "Facility", t.priority, t.status, t.created, t.due, t.doneAt ?? "", ix.staffMember(t.assigneeId)?.name ?? ""]) },
    { name: "Contracts", head: ["Code", "Owner", "Boat", "Marina", "Berth", "Term", "Start", "End", "Monthly fee", "Renews", "Status"], rows: (db.contracts ?? []).filter((c) => inScope.has(c.marinaId)).map((c) => [c.code, ix.owner(c.ownerId)?.name ?? "", ix.boat(c.boatId)?.name ?? "", ix.marina(c.marinaId)?.name ?? "", ix.berth(c.berthId)?.code ?? "", c.term, c.start, c.end, c.monthlyFee, c.autoRenew ? "Yes" : "No", c.status]) },
  ];
}
