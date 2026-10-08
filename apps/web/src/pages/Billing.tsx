import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, CircleAlert, CircleCheck, CircleDollarSign, Clock, DollarSign, Download, Eye, Printer, Send } from "lucide-react";
import { useStore } from "@/data/store";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@marina/shared";
import { tn, t, linesTotal, withMessage, ftM } from "@marina/shared";
import { daysBetween, fmtDate, monthKey, today } from "@marina/shared";
import { money, money2, roundMoney } from "@marina/shared";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, ConfirmDialog, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, StatCard, Table, Toolbar, useSort } from "@/components/ui";
import { InvoiceBadge } from "@/components/status";
import { Badge } from "@/components/ui";
import { CompanyMark, useBrandColor } from "@/components/CompanyMark";

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
    if (!quiet) toast(t("Reminder sent to {email}", { email: owner.email }));
  };
  return { remind };
}

function RecordPayment({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const balance = ix.balance(invoice);
  const cur = ix.curOfInvoice(invoice);
  const [f, setF] = useState({ date: today(), method: "Card" as PaymentMethod, amount: String(balance) });
  const [error, setError] = useState("");
  const save = () => {
    const amount = roundMoney(Number(f.amount), cur);
    if (!(amount > 0)) return setError(t("Enter an amount above zero."));
    if (amount > balance) return setError(t("That's more than the {amount} still owed.", { amount: money2(balance, cur) }));
    if (f.date > today()) return setError(t("Payment date can't be in the future."));
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
      { text: `Recorded ${money2(amount, cur)} ${full ? "payment" : "part payment"} for ${invoice.number} (${f.method})`, to: `/billing?open=${invoice.id}`, marinaId: ix.marinaOfInvoice(invoice) },
    );
    toast(full ? t("{number} is now paid", { number: invoice.number }) : t("{amount} recorded. {amount2} still owed.", { amount: money2(amount, cur), amount2: money2(balance - amount, cur) }), before);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t("Record payment for {number}", { number: invoice.number })}
      description={t("{amount} still owed of {amount2}", { amount: money2(balance, cur), amount2: money2(invoice.amount, cur) })}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Record payment")}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("Amount")} hint={t("Less than the balance records a part payment")} error={error}>{(id) => <Input id={id} type="number" min={0.01} step="0.01" max={balance} value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setError(""); }} />}</Field>
        <Field label={t("Paid on")}>{(id) => <Input id={id} type="date" max={today()} value={f.date} onChange={(e) => { setF({ ...f, date: e.target.value }); setError(""); }} />}</Field>
        <Field label={t("Method")}>{(id) => <Select id={id} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}>{(["Card", "Bank transfer", "Cash", "Check"] as const).map((m) => <option key={m} value={m}>{t(m)}</option>)}</Select>}</Field>
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
      {part && <Badge tone="info" icon={CircleDollarSign}>{t("Part paid")}</Badge>}
    </span>
  );
}

function InvoiceDetail({ invoice: inv, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const brand = useBrandColor();
  const navigate = useNavigate();
  const { remind } = useInvoiceActions();
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const live = db.invoices.find((i) => i.id === inv.id) ?? inv;
  const cur = ix.curOfInvoice(live);
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
      description={t("Booking {code}", { code: bk.code })}
      footer={
        <>
          <Button icon={Printer} onClick={() => window.print()}>{t("Print")}</Button>
          {open && <Button icon={Ban} onClick={() => setVoiding(true)}>{t("Void")}</Button>}
          {open && <Button icon={Send} onClick={() => remind(live)}>{t("Send reminder")}</Button>}
          {open && <Button variant="primary" icon={CircleCheck} onClick={() => setPaying(true)}>{t("Record payment")}</Button>}
        </>
      }
    >
      <div className="print-area text-[13px]">
        <div className="mb-6 h-1 rounded-full" style={{ backgroundColor: brand }} aria-hidden />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CompanyMark size={36} />
            <div>
              <p className="font-semibold">{db.settings.company}</p>
              <p className="text-ink-3">{marina?.name} · {marina?.address}</p>
            </div>
          </div>
          <div className="text-end">
            <InvoiceStatus inv={live} />
            <p className="mt-2 text-ink-3">{t("Issued")} {fmtDate(live.issued)}</p>
            <p className="text-ink-3">{t("Due")} {fmtDate(live.due)}</p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-3">{t("Bill to")}</p>
            <p className="font-medium">{owner?.name}</p>
            <p className="text-ink-3">{owner?.email}</p>
            {owner?.phone && <p className="text-ink-3">{owner.phone}</p>}
          </div>
          <div>
            <p className="text-xs text-ink-3">{t("Vessel")}</p>
            <p className="font-medium">{boat?.name}</p>
            <p className="text-ink-3">{t(boat?.type)} · {ftM(boat?.length)} · {boat?.registration}</p>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-start text-xs text-ink-3">
              <th className="py-2 font-medium">{t("Description")}</th>
              <th className="py-2 text-end font-medium">{t("Qty")}</th>
              <th className="py-2 text-end font-medium">{t("Rate")}</th>
              <th className="py-2 text-end font-medium">{t("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-3">
                {t("Berth")} {berth?.code} ({ftM(berth?.maxLength)} {berth?.type.toLowerCase()})
                <span className="block text-xs text-ink-3">{fmtDate(bk.start)} – {fmtDate(bk.end)}</span>
              </td>
              <td className="py-3 text-end num">{monthly ? t("{n} mo", { n: (nights / 30).toFixed(2) }) : tn(nights, "{n} night", "{n} nights")}</td>
              <td className="py-3 text-end num">{money2(monthly ? berth?.monthlyRate ?? 0 : berth?.dailyRate ?? 0, cur)}</td>
              <td className="py-3 text-end num">{money2(live.amount - linesTotal(live), cur)}</td>
            </tr>
            {(live.lines ?? []).map((l, k) => (
              <tr key={k} className="border-b border-line">
                <td className="py-3">{t(l.label)}<span className="block text-xs text-ink-3">{fmtDate(l.at.slice(0, 10))} {t("· added by")} {l.by}</span></td>
                <td className="py-3 text-end num">{l.qty} {l.unit}</td>
                <td className="py-3 text-end num">{money2(l.unitPrice, cur)}</td>
                <td className="py-3 text-end num">{money2(l.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-end font-semibold">{t("Total")}</td>
              <td className="pt-3 text-end text-base font-semibold num" style={{ color: brand }}>{money2(live.amount, cur)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-6 space-y-1 rounded-md bg-surface-2 p-4 text-[13px]">
          {live.payments.length > 0 && (
            <ul className="mb-2 space-y-1">
              {live.payments.map((p, k) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>{t("Paid")} {fmtDate(p.date)} {t("by")} {p.method.toLowerCase()}</span>
                  <span className="num font-medium">{money2(p.amount, cur)}</span>
                </li>
              ))}
            </ul>
          )}
          {open && <p className="flex justify-between gap-4"><strong>{t("Balance due")}</strong><span className="num font-semibold">{money2(ix.balance(live), cur)}</span></p>}
          {live.status === "overdue" && <p><strong>{tn(daysBetween(live.due, today()), "{n} day overdue.", "{n} days overdue.")}</strong></p>}
          {live.status === "void" && <p><strong>{t("Void.")}</strong> {t("This invoice is no longer payable.")}</p>}
          <p className="text-ink-3">{live.reminders.length ? t("Reminders sent: {join}", { join: live.reminders.map(fmtDate).join(", ") }) : t("No reminders sent.")}</p>
        </div>
        {db.settings.branding?.invoiceFooter && <p className="mt-6 border-t border-line pt-3 text-xs whitespace-pre-line text-ink-3">{db.settings.branding.invoiceFooter}</p>}
      </div>
      <button className="mt-4 text-[13px] font-semibold text-green-text hover:underline cursor-pointer print:hidden" onClick={() => navigate(`/bookings?q=${bk.code}`)}>{t("Open booking")} {bk.code}</button>
      {paying && <RecordPayment invoice={live} onClose={() => setPaying(false)} />}
      <ConfirmDialog
        open={voiding}
        onClose={() => setVoiding(false)}
        title={t("Void {number}?", { number: live.number })}
        body={t("The invoice will no longer be payable or count as outstanding. The booking itself is not cancelled.")}
        confirmLabel={t("Void invoice")}
        onConfirm={() => {
          const before = db;
          update((d) => ({ ...d, invoices: d.invoices.map((i) => (i.id === live.id ? { ...i, status: "void" } : i)) }), { text: `Voided ${live.number}`, to: `/billing?open=${live.id}`, marinaId: ix.marinaOfInvoice(live) });
          toast(t("{number} voided", { number: live.number }), before);
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
  const ids = useMemo(() => (marinaId === "all" ? scope : [marinaId]), [marinaId, scope]);
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

  // Totals are in the reporting currency: each invoice's balance or payment is converted from its marina's currency.
  const sum = (f: (i: Invoice) => boolean) => invoices.filter((r) => f(r.i)).reduce((s, r) => s + ix.invoiceToReporting(r.i, ix.balance(r.i)), 0);
  const outstanding = sum((i) => i.status === "due" || i.status === "overdue");
  const overdue = sum((i) => i.status === "overdue");
  // Every payment received this month, including part payments.
  const collected = invoices.reduce((t, r) => t + r.i.payments.filter((p) => monthKey(p.date) === monthKey(now)).reduce((a, p) => a + ix.invoiceToReporting(r.i, p.amount), 0), 0);
  const open = (id: string) => setParams((p) => { p.set("open", id); return p; });

  return (
    <>
      <PageHeader
        title={t("Billing & Invoicing")}
        description={t("Invoices are created when a booking is confirmed and are due after {invoiceDueDays} days", { invoiceDueDays: db.settings.invoiceDueDays })}
        actions={
          <Button
            icon={Download}
            onClick={() =>
              downloadCsv("invoices.csv", ["Invoice", "Booking", "Boat owner", "Marina", "Issued", "Due", "Currency", "Amount", "Paid so far", "Balance", "Status", "Paid on", "Method"], rows.map((r) => [
                r.i.number, r.bk.code, ix.ownerOfBooking(r.bk)?.name ?? "", ix.marinaOfBerth(r.bk.berthId)?.name ?? "", r.i.issued, r.i.due, ix.curOfInvoice(r.i), r.i.amount, ix.paidSoFar(r.i), ix.balance(r.i), r.i.status, r.i.paidAt ?? "", r.i.method ?? "",
              ]))
            }
          >
            {t("Export CSV")}
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard active={status === "due"} onClick={() => { setStatus(status === "due" ? "all" : "due"); setPage(1); }} label={t("Outstanding")} icon={Clock} value={money(outstanding)} sub={tn(invoices.filter((r) => r.i.status === "due" || r.i.status === "overdue").length, "{n} invoice", "{n} invoices")} />
        <StatCard active={status === "overdue"} onClick={() => { setStatus(status === "overdue" ? "all" : "overdue"); setPage(1); }} label={t("Overdue")} icon={CircleAlert} value={money(overdue)} sub={tn(invoices.filter((r) => r.i.status === "overdue").length, "{n} invoice", "{n} invoices")} />
        <StatCard active={status === "paid"} onClick={() => { setStatus(status === "paid" ? "all" : "paid"); setPage(1); }} label={t("Collected this month")} icon={CircleCheck} value={money(collected)} sub={t("Payments received this month, including part payments")} />
        <StatCard to="/analytics" label={t("Revenue booked this month")} icon={DollarSign} value={money(ix.metrics(ids).revenue)} sub={t("From stays this month, paid or not")} />
      </div>
      <Card>
        <Toolbar active={filters} onClear={clearFilters}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t("Search invoice, booking or owner")} />
          <Select aria-label={t("Filter by marina")} value={marinaId} onChange={(e) => { setMarinaId(e.target.value); setPage(1); }} className="sm:w-56">
            <option value="all">{t("All marinas")}</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label={t("Filter by status")} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="sm:w-40">
            <option value="all">{t("All statuses")}</option>
            <option value="due">{t("Due")}</option>
            <option value="overdue">{t("Overdue")}</option>
            <option value="paid">{t("Paid")}</option>
            <option value="void">{t("Void")}</option>
          </Select>
        </Toolbar>
        {status === "overdue" && overdueVisible.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-[13px]">
            <span>{overdueVisible.length} {t("invoices are overdue.")}</span>
            <Button size="sm" variant="primary" icon={Send} onClick={() => setBulkRemind(true)}>{t("Send")} {overdueVisible.length} {t("reminders")}</Button>
          </div>
        )}
        <Table
          sort={sort}
          empty={rows.length === 0}
          head={[{ label: t("Invoice"), sortKey: "number" }, { label: t("Boat owner"), sortKey: "owner" }, "Marina", { label: t("Issued"), sortKey: "issued" }, { label: t("Due"), sortKey: "due" }, { label: t("Amount"), sortKey: "amount" }, { label: t("Status"), sortKey: "status" }, "Actions"]}
        >
          {pg.rows.map(({ i, bk }) => {
            const late = i.status === "overdue" ? daysBetween(i.due, now) : 0;
            return (
              <tr key={i.id} className="cursor-pointer hover:bg-row-hover" onClick={() => open(i.id)}>
                <td><span className="font-medium">{i.number}</span><span className="block text-xs text-ink-3">{bk.code}</span></td>
                <td>{ix.ownerOfBooking(bk)?.name}<span className="block text-xs text-ink-3">{ix.boat(bk.boatId)?.name}</span></td>
                <td>{ix.marinaOfBerth(bk.berthId)?.name}</td>
                <td className="whitespace-nowrap">{fmtDate(i.issued)}</td>
                <td className="whitespace-nowrap">{fmtDate(i.due)}{late > 0 && <span className="block text-xs font-semibold">{tn(late, "{n} day late", "{n} days late")}</span>}</td>
                <td className={`font-medium num ${i.status === "void" ? "text-ink-3 line-through" : ""}`}>
                  {money(i.amount, ix.curOfInvoice(i))}
                  {ix.paidSoFar(i) > 0 && ix.balance(i) > 0 && <span className="block text-xs font-normal text-ink-3">{money(ix.balance(i), ix.curOfInvoice(i))} {t("left")}</span>}
                </td>
                <td><InvoiceStatus inv={i} /></td>
                <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Eye} label={t("Open {number}", { number: i.number })} onClick={() => open(i.id)} />
                  {(i.status === "due" || i.status === "overdue") && (
                    <>
                      <IconButton icon={Send} label={t("Send reminder for {number}", { number: i.number })} onClick={() => remind(i)} />
                      <IconButton icon={CircleCheck} label={t("Record payment for {number}", { number: i.number })} onClick={() => setPaying(i)} />
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
        title={t("Send {n} payment reminders?", { n: overdueVisible.length })}
        body={t("Each boat owner with an overdue invoice in this list gets a reminder email, and the date is saved on the invoice.")}
        confirmLabel={t("Send {n} reminders", { n: overdueVisible.length })}
        onConfirm={() => {
          overdueVisible.forEach((r) => remind(r.i, true));
          toast(t("{n} reminders sent", { n: overdueVisible.length }));
        }}
      />
    </>
  );
}
