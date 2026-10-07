// Small helpers shared by pages that change data, so every page creates records the same way.
import type { Db } from "./seed";
import type { Contract, Invoice, InvoiceLine, MaintenancePlan, MaintenanceTask, MeterKind, MeterReading, Message, Recurrence } from "./types";
import { nextId } from "./util";
import { addDays, addMonths, daysBetween, today } from "./date";

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

export const DEFAULT_UTILITIES = { powerPerKwh: 0.35, waterPerGallon: 0.02 };
export const METER_UNIT: Record<MeterKind, string> = { power: "kWh", water: "gal" };

/** Latest reading on a berth's meter. */
export const lastReading = (d: Db, berthId: string, kind: MeterKind): MeterReading | undefined =>
  (d.meterReadings ?? []).filter((r) => r.berthId === berthId && r.kind === kind).sort((a, b) => b.at.localeCompare(a.at))[0];

/**
 * Record a meter reading. When a boat is in the berth, the usage since the last reading is added to
 * its invoice as a line (at the company's utility rates).
 */
export function withMeterReading(d: Db, reading: Omit<MeterReading, "id" | "charged" | "bookingId">, booking: { id: string; amount: number } | undefined): { db: Db; usage: number; charge: number } {
  const prev = lastReading(d, reading.berthId, reading.kind);
  const usage = prev ? Math.max(0, reading.value - prev.value) : 0;
  const rates = d.settings.utilities ?? DEFAULT_UTILITIES;
  const charge = Math.round(usage * (reading.kind === "power" ? rates.powerPerKwh : rates.waterPerGallon) * 100) / 100;
  const id = nextId("mr", d.meterReadings ?? []);
  let next: Db = { ...d, meterReadings: [...(d.meterReadings ?? []), { ...reading, id, charged: booking && charge > 0 ? charge : undefined, bookingId: booking && charge > 0 ? booking.id : undefined }] };
  if (booking && charge > 0) {
    next = withServiceCharge(next, booking.id, booking.amount, {
      label: reading.kind === "power" ? "Electricity" : "Water", qty: usage, unit: METER_UNIT[reading.kind], unitPrice: reading.kind === "power" ? rates.powerPerKwh : rates.waterPerGallon, amount: charge, at: reading.at, by: reading.by,
    });
  }
  return { db: next, usage, charge };
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = { week: "Every week", month: "Every month", quarter: "Every 3 months" };
export const nextRecurrence = (from: string, every: Recurrence) => (every === "week" ? addDays(from, 7) : addMonths(from, every === "month" ? 1 : 3));

/** Work orders are created this many days before they're due. */
export const PLAN_LEAD_DAYS = 7;

/**
 * Create the work orders that recurring plans owe (due within the next week and not already open),
 * and move each plan on to its following date. Safe to run any time: it never creates duplicates.
 */
export function withRecurringTasks(d: Db, now = today()): Db {
  const plans = d.maintenancePlans ?? [];
  if (!plans.some((p) => p.active && p.nextDue <= addDays(now, PLAN_LEAD_DAYS))) return d;
  let tasks = d.tasks;
  const updated = plans.map((p) => {
    if (!p.active) return p;
    let plan = p;
    // Catch up at most a few cycles, so a long pause doesn't flood the list.
    for (let i = 0; i < 4 && plan.nextDue <= addDays(now, PLAN_LEAD_DAYS); i++) {
      const exists = tasks.some((x) => x.planId === plan.id && x.due === plan.nextDue);
      if (!exists && !tasks.some((x) => x.planId === plan.id && x.status !== "done")) {
        const id = nextId("t", tasks);
        const task: MaintenanceTask = {
          id, code: `WO-${String(tasks.length + 1).padStart(3, "0")}`, title: plan.title, marinaId: plan.marinaId, berthId: plan.berthId, assigneeId: plan.assigneeId,
          priority: plan.priority, status: "open", created: now, due: plan.nextDue < now ? now : plan.nextDue, notes: [{ at: now, by: "Schedule", text: `${RECURRENCE_LABEL[plan.every]} (recurring).` }], planId: plan.id,
        };
        tasks = [...tasks, task];
      }
      plan = { ...plan, nextDue: nextRecurrence(plan.nextDue, plan.every) };
    }
    return plan;
  });
  return { ...d, tasks, maintenancePlans: updated as MaintenancePlan[] };
}
