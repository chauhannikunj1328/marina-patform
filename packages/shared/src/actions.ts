// Small helpers shared by pages that change data, so every page creates records the same way.
import type { Db } from "./seed";
import type { Contract, Invoice, InvoiceLine, Message } from "./types";
import { nextId } from "./util";
import { addDays, daysBetween, today } from "./date";

export function withInvoice(d: Db, bookingId: string, amount: number): Db {
  if (d.invoices.some((i) => i.bookingId === bookingId && i.status !== "void")) return d;
  const id = nextId("inv", d.invoices);
  const now = today();
  const invoice: Invoice = {
    id,
    number: `INV-${10000 + Number(id.split("-")[1])}`,
    bookingId,
    issued: now,
    due: addDays(now, d.settings.invoiceDueDays),
    amount,
    status: "due",
    reminders: [],
    payments: [],
  };
  return { ...d, invoices: [...d.invoices, invoice] };
}

export function withMessage(d: Db, msg: Omit<Message, "id" | "at">): Db {
  return { ...d, messages: [{ ...msg, id: nextId("msg", d.messages), at: new Date().toISOString() }, ...d.messages] };
}

/** Services staff can charge to a stay. */
export const SERVICES = [
  { id: "gas", label: "Gasoline", unit: "gal", price: 5.4, step: 5 },
  { id: "diesel", label: "Diesel", unit: "gal", price: 5.1, step: 5 },
  { id: "pumpout", label: "Pump-out", unit: "each", price: 25, step: 1 },
  { id: "ice", label: "Ice", unit: "bag", price: 4, step: 1 },
  { id: "laundry", label: "Laundry", unit: "load", price: 8, step: 1 },
] as const;

export const linesTotal = (inv?: Pick<Invoice, "lines">) => (inv?.lines ?? []).reduce((s, l) => s + l.amount, 0);

/**
 * Add a service charge to a booking's invoice (creating the invoice if there isn't one yet).
 * A paid invoice becomes due again for the new amount.
 */
export function withServiceCharge(d: Db, bookingId: string, stayAmount: number, line: InvoiceLine): Db {
  let next = d.invoices.some((i) => i.bookingId === bookingId && i.status !== "void") ? d : withInvoice(d, bookingId, stayAmount);
  next = {
    ...next,
    invoices: next.invoices.map((i) =>
      i.bookingId === bookingId && i.status !== "void"
        ? { ...i, lines: [...(i.lines ?? []), line], amount: Math.round((i.amount + line.amount) * 100) / 100, status: i.status === "paid" ? "due" : i.status }
        : i,
    ),
  };
  return next;
}

/** How early a contract is flagged for renewal: a week for monthly, a month for seasonal, two months for annual. */
export const RENEWAL_NOTICE_DAYS: Record<Contract["term"], number> = { monthly: 7, seasonal: 30, annual: 60 };

/** Active contracts ending within their notice period that haven't been renewed yet. */
export function renewalsDue(contracts: Contract[], now: string): Contract[] {
  const renewed = new Set(contracts.map((c) => c.renewedFromId).filter(Boolean));
  return contracts.filter((c) => c.status === "active" && c.end > now && !renewed.has(c.id) && daysBetween(now, c.end) <= RENEWAL_NOTICE_DAYS[c.term]);
}
