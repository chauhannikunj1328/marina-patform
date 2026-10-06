import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, CircleAlert, CircleCheck, CircleDollarSign, Clock, DollarSign, Download, Eye, Printer, Send } from "lucide-react";
import { useStore } from "@/data/store";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@marina/shared";
import { withMessage } from "@marina/shared";
import { daysBetween, fmtDate, monthKey, today } from "@marina/shared";
import { money, money2 } from "@marina/shared";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, ConfirmDialog, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, StatCard, Table, Toolbar, useSort } from "@/components/ui";
import { InvoiceBadge } from "@/components/status";
import { Badge } from "@/components/ui";
import { Logomark } from "@/components/Logo";

function useInvoiceActions() {
  const { ix, update, toast } = useStore();
  const remind = (inv: Invoice, quiet = false) => {
    const bk = ix.booking(inv.bookingId);
    const owner = bk && ix.ownerOfBooking(bk);
    if (!owner) return;
    update(
      (d) => withMessage({ ...d, invoices: d.invoices.map((i) => (i.id === inv.id ? { ...i, reminders: [...i.reminders, today()] } : i)) }, { to: owner.email, subject: `Payment reminder for ${inv.number}`, kind: "reminder", ref: inv.id }),
      { text: `Sent payment reminder for ${inv.number} to ${owner.name}`, to: `/billing?open=${inv.id}`, marinaId: ix.berth(bk.berthId)?.marinaId },
    );
    if (!quiet) toast(`Reminder sent to ${owner.email}`);
  };
  return { remind };
}

function RecordPayment({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const balance = ix.balance(invoice);
  const [f, setF] = useState({ date: today(), method: "Card" as PaymentMethod, amount: String(balance) });
  const [error, setError] = useState("");
  const save = () => {
    const amount = Math.round(Number(f.amount) * 100) / 100;
    if (!(amount > 0)) return setError("Enter an amount above zero.");
    if (amount > balance) return setError(`That's more than the ${money2(balance)} still owed.`);
    if (f.date > today()) return setError("Payment date can't be in the future.");
    const before = db;
    const full = amount >= balance;
    update(
      (d) => ({
        ...d,
        invoices: d.invoices.map((i) =>
          i.id === invoice.id
            ? { ...i, payments: [...i.payments, { date: f.date, amount, method: f.method }], ...(full ? { status: "paid" as const, paidAt: f.date, method: f.method } : {}) }
            : i,
        ),
      }),
      { text: `Recorded ${money2(amount)} ${full ? "payment" : "part payment"} for ${invoice.number} (${f.method})`, to: `/billing?open=${invoice.id}`, marinaId: ix.marinaOfInvoice(invoice) },
    );
    toast(full ? `${invoice.number} is now paid` : `${money2(amount)} recorded. ${money2(balance - amount)} still owed.`, before);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Record payment for ${invoice.number}`}
      description={`${money2(balance)} still owed of ${money2(invoice.amount)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Record payment</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Amount" hint="Less than the balance records a part payment" error={error}>{(id) => <Input id={id} type="number" min={0.01} step="0.01" max={balance} value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setError(""); }} />}</Field>
        <Field label="Paid on">{(id) => <Input id={id} type="date" max={today()} value={f.date} onChange={(e) => { setF({ ...f, date: e.target.value }); setError(""); }} />}</Field>
        <Field label="Method">{(id) => <Select id={id} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}>{(["Card", "Bank transfer", "Cash", "Check"] as const).map((m) => <option key={m}>{m}</option>)}</Select>}</Field>
      </div>
    </Modal>
  );
}

/** Status badge that also shows when an open invoice is partly paid. */
function InvoiceStatus({ inv }: { inv: Invoice }) {
  const { ix } = useStore();
  const part = (inv.status === "due" || inv.status === "overdue") && ix.paidSoFar(inv) > 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <InvoiceBadge status={inv.status} />
      {part && <Badge tone="info" icon={CircleDollarSign}>Part paid</Badge>}
    </span>
  );
}

function InvoiceDetail({ invoice: inv, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const navigate = useNavigate();
  const { remind } = useInvoiceActions();
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const live = db.invoices.find((i) => i.id === inv.id) ?? inv;
  const bk = ix.booking(live.bookingId)!;
  const boat = ix.boat(bk.boatId);
  const owner = ix.ownerOfBooking(bk);
  const berth = ix.berth(bk.berthId);
  const marina = ix.marina(berth?.marinaId ?? "");
  const nights = daysBetween(bk.start, bk.end);
  const monthly = nights >= db.settings.monthlyFromNights;
  const open = live.status === "due" || live.status === "overdue";

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={live.number}
      description={`Booking ${bk.code}`}
      footer={
        <>
          <Button icon={Printer} onClick={() => window.print()}>Print</Button>
          {open && <Button icon={Ban} onClick={() => setVoiding(true)}>Void</Button>}
          {open && <Button icon={Send} onClick={() => remind(live)}>Send reminder</Button>}
          {open && <Button variant="primary" icon={CircleCheck} onClick={() => setPaying(true)}>Record payment</Button>}
        </>
      }
    >
      <div className="print-area text-[13px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logomark size={36} />
            <div>
              <p className="font-semibold">{db.settings.company}</p>
              <p className="text-ink-3">{marina?.name} · {marina?.address}</p>
            </div>
          </div>
          <div className="text-right">
            <InvoiceStatus inv={live} />
            <p className="mt-2 text-ink-3">Issued {fmtDate(live.issued)}</p>
            <p className="text-ink-3">Due {fmtDate(live.due)}</p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-3">Bill to</p>
            <p className="font-medium">{owner?.name}</p>
            <p className="text-ink-3">{owner?.email}</p>
            {owner?.phone && <p className="text-ink-3">{owner.phone}</p>}
          </div>
          <div>
            <p className="text-xs text-ink-3">Vessel</p>
            <p className="font-medium">{boat?.name}</p>
            <p className="text-ink-3">{boat?.type} · {boat?.length} ft · {boat?.registration}</p>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-3">
                Berth {berth?.code} ({berth?.maxLength} ft {berth?.type.toLowerCase()})
                <span className="block text-xs text-ink-3">{fmtDate(bk.start)} – {fmtDate(bk.end)}</span>
              </td>
              <td className="py-3 text-right num">{monthly ? `${(nights / 30).toFixed(2)} mo` : `${nights} nights`}</td>
              <td className="py-3 text-right num">{money2(monthly ? berth?.monthlyRate ?? 0 : berth?.dailyRate ?? 0)}</td>
              <td className="py-3 text-right num">{money2(live.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right font-semibold">Total</td>
              <td className="pt-3 text-right text-base font-semibold num">{money2(live.amount)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-6 space-y-1 rounded-md bg-surface-2 p-4 text-[13px]">
          {live.payments.length > 0 && (
            <ul className="mb-2 space-y-1">
              {live.payments.map((p, k) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>Paid {fmtDate(p.date)} by {p.method.toLowerCase()}</span>
                  <span className="num font-medium">{money2(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {open && <p className="flex justify-between gap-4"><strong>Balance due</strong><span className="num font-semibold">{money2(ix.balance(live))}</span></p>}
          {live.status === "overdue" && <p><strong>{daysBetween(live.due, today())} {daysBetween(live.due, today()) === 1 ? "day" : "days"} overdue.</strong></p>}
          {live.status === "void" && <p><strong>Void.</strong> This invoice is no longer payable.</p>}
          <p className="text-ink-3">{live.reminders.length ? `Reminders sent: ${live.reminders.map(fmtDate).join(", ")}` : "No reminders sent."}</p>
        </div>
      </div>
      <button className="mt-4 text-[13px] font-semibold text-green-text hover:underline cursor-pointer print:hidden" onClick={() => navigate(`/bookings?q=${bk.code}`)}>Open booking {bk.code}</button>
      {paying && <RecordPayment invoice={live} onClose={() => setPaying(false)} />}
      <ConfirmDialog
        open={voiding}
        onClose={() => setVoiding(false)}
        title={`Void ${live.number}?`}
        body="The invoice will no longer be payable or count as outstanding. The booking itself is not cancelled."
        confirmLabel="Void invoice"
        onConfirm={() => {
          const before = db;
          update((d) => ({ ...d, invoices: d.invoices.map((i) => (i.id === live.id ? { ...i, status: "void" } : i)) }), { text: `Voided ${live.number}`, to: `/billing?open=${live.id}`, marinaId: ix.marinaOfInvoice(live) });
          toast(`${live.number} voided`, before);
        }}
      />
    </Modal>
  );
}

export function Billing() {
  const { db, ix, scope, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const { remind } = useInvoiceActions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>((params.get("status") as InvoiceStatus) ?? "all");
  const [marinaId, setMarinaId] = useState("all");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<Invoice | undefined>();
  const now = today();
  const ids = marinaId === "all" ? scope : [marinaId];
  const openId = params.get("open");
  const opened = openId ? db.invoices.find((i) => i.id === openId && scope.includes(ix.marinaOfInvoice(i) ?? "")) : undefined;

  const invoices = useMemo(() => {
    const set = new Set(ids);
    return db.invoices.map((i) => ({ i, bk: ix.booking(i.bookingId)! })).filter((r) => r.bk && set.has(ix.berth(r.bk.berthId)?.marinaId ?? ""));
  }, [db.invoices, ix, ids]);

  const rows = invoices
    .filter((r) => status === "all" || r.i.status === status)
    .filter((r) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return r.i.number.toLowerCase().includes(s) || r.bk.code.toLowerCase().includes(s) || ix.ownerOfBooking(r.bk)?.name.toLowerCase().includes(s);
    })
    .sort((a, b) => b.i.issued.localeCompare(a.i.issued));
  const { sorted, sort } = useSort(rows, {
    number: (r) => r.i.number,
    owner: (r) => ix.ownerOfBooking(r.bk)?.name ?? "",
    issued: (r) => r.i.issued,
    due: (r) => r.i.due,
    amount: (r) => r.i.amount,
    status: (r) => r.i.status,
  });
  const pg = paginate(sorted, page);
  const filters = (q ? 1 : 0) + (status !== "all" ? 1 : 0) + (marinaId !== "all" ? 1 : 0);
  const clearFilters = () => { setQ(""); setStatus("all"); setMarinaId("all"); setPage(1); };
  const overdueVisible = rows.filter((r) => r.i.status === "overdue");
  const [bulkRemind, setBulkRemind] = useState(false);

  const sum = (f: (i: Invoice) => boolean) => invoices.filter((r) => f(r.i)).reduce((s, r) => s + ix.balance(r.i), 0);
  const outstanding = sum((i) => i.status === "due" || i.status === "overdue");
  const overdue = sum((i) => i.status === "overdue");
  // Every payment received this month, including part payments.
  const collected = invoices.reduce((t, r) => t + r.i.payments.filter((p) => monthKey(p.date) === monthKey(now)).reduce((a, p) => a + p.amount, 0), 0);
  const open = (id: string) => setParams((p) => { p.set("open", id); return p; });

  return (
    <>
      <PageHeader
        title="Billing & Invoicing"
        description={`Invoices are created when a booking is confirmed and are due after ${db.settings.invoiceDueDays} days`}
        actions={
          <Button
            icon={Download}
            onClick={() =>
              downloadCsv("invoices.csv", ["Invoice", "Booking", "Boat owner", "Marina", "Issued", "Due", "Amount", "Paid so far", "Balance", "Status", "Paid on", "Method"], rows.map((r) => [
                r.i.number, r.bk.code, ix.ownerOfBooking(r.bk)?.name ?? "", ix.marinaOfBerth(r.bk.berthId)?.name ?? "", r.i.issued, r.i.due, r.i.amount, ix.paidSoFar(r.i), ix.balance(r.i), r.i.status, r.i.paidAt ?? "", r.i.method ?? "",
              ]))
            }
          >
            Export CSV
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard active={status === "due"} onClick={() => { setStatus(status === "due" ? "all" : "due"); setPage(1); }} label="Outstanding" icon={Clock} value={money(outstanding)} sub={`${invoices.filter((r) => r.i.status === "due" || r.i.status === "overdue").length} invoices`} />
        <StatCard active={status === "overdue"} onClick={() => { setStatus(status === "overdue" ? "all" : "overdue"); setPage(1); }} label="Overdue" icon={CircleAlert} value={money(overdue)} sub={`${invoices.filter((r) => r.i.status === "overdue").length} invoices`} />
        <StatCard active={status === "paid"} onClick={() => { setStatus(status === "paid" ? "all" : "paid"); setPage(1); }} label="Collected this month" icon={CircleCheck} value={money(collected)} sub="Payments received this month, including part payments" />
        <StatCard to="/analytics" label="Revenue booked this month" icon={DollarSign} value={money(ix.metrics(ids).revenue)} sub="From stays this month, paid or not" />
      </div>
      <Card>
        <Toolbar active={filters} onClear={clearFilters}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search invoice, booking or owner" />
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => { setMarinaId(e.target.value); setPage(1); }} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="sm:w-40">
            <option value="all">All statuses</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </Select>
        </Toolbar>
        {status === "overdue" && overdueVisible.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-[13px]">
            <span>{overdueVisible.length} invoices are overdue.</span>
            <Button size="sm" variant="primary" icon={Send} onClick={() => setBulkRemind(true)}>Send {overdueVisible.length} reminders</Button>
          </div>
        )}
        <Table
          sort={sort}
          empty={rows.length === 0}
          head={[{ label: "Invoice", sortKey: "number" }, { label: "Boat owner", sortKey: "owner" }, "Marina", { label: "Issued", sortKey: "issued" }, { label: "Due", sortKey: "due" }, { label: "Amount", sortKey: "amount" }, { label: "Status", sortKey: "status" }, "Actions"]}
        >
          {pg.rows.map(({ i, bk }) => {
            const late = i.status === "overdue" ? daysBetween(i.due, now) : 0;
            return (
              <tr key={i.id} className="cursor-pointer hover:bg-row-hover" onClick={() => open(i.id)}>
                <td><span className="font-medium">{i.number}</span><span className="block text-xs text-ink-3">{bk.code}</span></td>
                <td>{ix.ownerOfBooking(bk)?.name}<span className="block text-xs text-ink-3">{ix.boat(bk.boatId)?.name}</span></td>
                <td>{ix.marinaOfBerth(bk.berthId)?.name}</td>
                <td className="whitespace-nowrap">{fmtDate(i.issued)}</td>
                <td className="whitespace-nowrap">{fmtDate(i.due)}{late > 0 && <span className="block text-xs font-semibold">{late} {late === 1 ? "day" : "days"} late</span>}</td>
                <td className={`font-medium num ${i.status === "void" ? "text-ink-3 line-through" : ""}`}>
                  {money(i.amount)}
                  {ix.paidSoFar(i) > 0 && ix.balance(i) > 0 && <span className="block text-xs font-normal text-ink-3">{money(ix.balance(i))} left</span>}
                </td>
                <td><InvoiceStatus inv={i} /></td>
                <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Eye} label={`Open ${i.number}`} onClick={() => open(i.id)} />
                  {(i.status === "due" || i.status === "overdue") && (
                    <>
                      <IconButton icon={Send} label={`Send reminder for ${i.number}`} onClick={() => remind(i)} />
                      <IconButton icon={CircleCheck} label={`Record payment for ${i.number}`} onClick={() => setPaying(i)} />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={pg.page} pages={pg.pages} total={rows.length} onPage={setPage} />
      </Card>
      {opened && <InvoiceDetail invoice={opened} onClose={() => setParams((p) => { p.delete("open"); return p; })} />}
      {paying && <RecordPayment invoice={paying} onClose={() => setPaying(undefined)} />}
      <ConfirmDialog
        open={bulkRemind}
        onClose={() => setBulkRemind(false)}
        title={`Send ${overdueVisible.length} payment reminders?`}
        body="Each boat owner with an overdue invoice in this list gets a reminder email, and the date is saved on the invoice."
        confirmLabel={`Send ${overdueVisible.length} reminders`}
        onConfirm={() => {
          overdueVisible.forEach((r) => remind(r.i, true));
          toast(`${overdueVisible.length} reminders sent`);
        }}
      />
    </>
  );
}
