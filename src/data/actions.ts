// Small helpers shared by pages that change data, so every page creates records the same way.
import type { Db } from "./seed";
import type { Invoice, Message } from "./types";
import { nextId } from "./store";
import { addDays, today } from "@/lib/date";

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
