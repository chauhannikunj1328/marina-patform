// Invoices and receipts: what's owed, paying online, and a printable invoice or receipt.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Printer, Receipt } from "lucide-react";
import { amountDue, daysBetween, fmtDate, linesTotal, money2, ownerInvoices, t, today, withCardPayment } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, ButtonLink, Card, EmptyState, Field, Input, Modal, Notice, flip, usePageTitle } from "@/components/ui";
import { InvoiceStatus } from "./status";

export function MyInvoices() {
  const { db, ix, owner } = useStore();
  usePageTitle(t("Invoices"));
  if (!owner) return null;
  const invoices = ownerInvoices(db, owner.id);
  const open = invoices.filter((i) => amountDue(i) > 0);
  return (
    <div>
      <h2 className="mb-2 text-[22px] leading-[30px] font-medium">{t("Invoices")}</h2>
      <p className="mb-6 text-[13px] text-ink-3">{open.length ? t("{amount} to pay across your open invoices.", { amount: money2(open.reduce((s, i) => s + amountDue(i), 0)) }) : t("You're all paid up.")}</p>
      {invoices.length === 0 ? (
        <Card><EmptyState icon={Receipt} title={t("No invoices yet")} body={t("The marina sends an invoice once it confirms a booking.")} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {invoices.map((inv, i) => {
              const b = ix.booking(inv.bookingId);
              return (
                <li key={inv.id} className={i ? "border-t border-line" : undefined}>
                  <Link to={`/account/invoices/${inv.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-row-hover">
                    <span>
                      <span className="font-medium"><bdi>{inv.number}</bdi></span> <span className="text-[13px] text-ink-3">· {b && ix.marinaOfBerth(b.berthId)?.name}</span>
                      <span className="block text-xs text-ink-3">{t("Issued {date}", { date: fmtDate(inv.issued) })} · {t("due {date}", { date: fmtDate(inv.due) })}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num text-[15px] font-semibold">{money2(amountDue(inv) || inv.amount)}</span>
                      <InvoiceStatus inv={inv} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PayDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const inv = db.invoices.find((i) => i.id === invoiceId)!;
  const due = amountDue(inv);
  const [amount, setAmount] = useState(due.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const pay = () => {
    const a = Math.round(Number(amount) * 100) / 100;
    if (!(a > 0)) return setError(t("Enter an amount to pay."));
    if (a > due) return setError(t("That's more than the {amount} still owed.", { amount: money2(due) }));
    update((d) => withCardPayment(d, inv.id, a, { now: today(), at: new Date().toISOString() }));
    toast(a >= due ? t("{number} is paid. Thank you!", { number: inv.number }) : t("Payment of {amount} received", { amount: money2(a) }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Pay {number}", { number: inv.number })} description={t("{amount} still owed", { amount: money2(due) })}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" icon={CreditCard} onClick={pay}>{t("Pay {amount}", { amount: money2(Math.max(0, Number(amount) || 0)) })}</Button></>}>
      <div className="space-y-4">
        <Field label={t("Amount")} hint={t("Pay the full balance or part of it.")}>{(id) => <Input id={id} type="number" inputMode="decimal" min={0.01} max={due} step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} />}</Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Notice>{t("Preview: no card is charged. Card payments go live when the website is connected to the payment provider.")}</Notice>
      </div>
    </Modal>
  );
}

export function InvoicePage() {
  const { id = "" } = useParams();
  const { db, ix, owner } = useStore();
  const [paying, setPaying] = useState(false);
  const inv = owner ? ownerInvoices(db, owner.id).find((i) => i.id === id) : undefined;
  usePageTitle(inv?.number);
  if (!inv) return <Card><EmptyState icon={Receipt} title={t("We couldn't find that invoice")} action={<ButtonLink to="/account/invoices">{t("All invoices")}</ButtonLink>} /></Card>;
  const b = ix.booking(inv.bookingId);
  const marina = b ? ix.marinaOfBerth(b.berthId) : undefined;
  const boat = b ? ix.boat(b.boatId) : undefined;
  const due = amountDue(inv);
  const stay = inv.amount - linesTotal(inv);
  const receipt = inv.status === "paid";
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link to="/account/invoices" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"><ArrowLeft className={`size-4 ${flip(ArrowLeft) ?? ""}`} aria-hidden /> {t("All invoices")}</Link>
        <div className="flex gap-2">
          <Button size="sm" icon={Printer} onClick={() => window.print()}>{receipt ? t("Print receipt") : t("Print invoice")}</Button>
          {due > 0 && <Button size="sm" variant="primary" icon={CreditCard} onClick={() => setPaying(true)}>{t("Pay {amount}", { amount: money2(due) })}</Button>}
        </div>
      </div>
      <Card className="print-area p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-label text-ink-3">{receipt ? t("Receipt") : t("Invoice")}</p>
            <h2 className="mt-1 text-[28px] leading-9 font-medium"><bdi>{inv.number}</bdi></h2>
            <p className="mt-1 text-[13px] text-ink-3">{t("Issued {date}", { date: fmtDate(inv.issued) })} · {t("due {date}", { date: fmtDate(inv.due) })}</p>
          </div>
          <div className="text-end">
            <InvoiceStatus inv={inv} />
            <p className="mt-3 text-[13px] font-medium">{db.settings.company}</p>
            <p className="text-xs text-ink-3">{marina?.name}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 text-[13px] sm:grid-cols-2">
          <div><p className="text-ink-3">{t("Billed to")}</p><p className="mt-1 font-medium">{owner?.name}</p><p className="text-ink-2"><bdi>{owner?.email}</bdi></p></div>
          {b && <div><p className="text-ink-3">{t("Stay")}</p><p className="mt-1 font-medium">{boat?.name} · {t("Berth {code}", { code: ix.berth(b.berthId)?.code })}</p><p className="text-ink-2">{fmtDate(b.start)} – {fmtDate(b.end)} (<bdi>{b.code}</bdi>)</p></div>}
        </div>
        <table className="mt-8 w-full text-[13px]">
          <thead className="text-xs text-ink-3"><tr><th scope="col" className="pb-2 text-start font-medium">{t("Description")}</th><th scope="col" className="pb-2 text-end font-medium">{t("Amount")}</th></tr></thead>
          <tbody>
            <tr className="border-t border-line"><td className="py-2.5">{b ? t("Berth, {n} nights", { n: daysBetween(b.start, b.end) }) : t("Berth")}</td><td className="num py-2.5 text-end">{money2(stay)}</td></tr>
            {(inv.lines ?? []).map((l, i) => <tr key={i} className="border-t border-line"><td className="py-2.5">{t(l.label)} <span className="text-ink-3">· {l.qty} {t(l.unit)} × {money2(l.unitPrice)}</span></td><td className="num py-2.5 text-end">{money2(l.amount)}</td></tr>)}
            <tr className="border-t border-line-strong font-semibold"><td className="py-2.5">{t("Total")}</td><td className="num py-2.5 text-end">{money2(inv.amount)}</td></tr>
            {inv.payments.map((p, i) => <tr key={`p${i}`} className="text-success-fg"><td className="py-1.5">{t("Paid {date} by {method}", { date: fmtDate(p.date), method: t(p.method) })}</td><td className="num py-1.5 text-end">−{money2(p.amount)}</td></tr>)}
            <tr className="border-t border-line-strong text-[15px] font-semibold"><td className="py-3">{t("Balance")}</td><td className="num py-3 text-end">{money2(due)}</td></tr>
          </tbody>
        </table>
        {inv.status === "void" && <p className="mt-4 text-[13px] text-ink-3">{t("This invoice was cancelled. Nothing is owed on it.")}</p>}
      </Card>
      {paying && <PayDialog invoiceId={inv.id} onClose={() => setPaying(false)} />}
    </div>
  );
}
