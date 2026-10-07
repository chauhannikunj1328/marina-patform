// Rates and fees: nightly and monthly rates by marina, contracts, extras and how to pay.
import { useState } from "react";
import { Link } from "react-router-dom";
import { addDays, CONTRACT_TERMS, DEFAULT_UTILITIES, money, money2, quote, RENEWAL_NOTICE_DAYS, SERVICES, t, today, type ContractTerm } from "@marina/shared";
import { useStore } from "@/data/store";
import { SearchForm } from "@/components/SearchForm";
import { Card, Container, Field, Input, PageTitle, Select, usePageTitle } from "@/components/ui";
import { marinaFacts, openMarinas, termFee } from "@/lib/marinas";

/** Rough price for a stay: the cheapest berth the boat fits, at the marina's rules (not a booking). */
function Estimate() {
  const { db } = useStore();
  const marinas = openMarinas(db);
  const [marinaId, setMarinaId] = useState(marinas[0]?.id ?? "");
  const [length, setLength] = useState("30");
  const [nights, setNights] = useState("3");
  const n = Math.min(365, Math.max(1, Math.round(Number(nights) || 1)));
  const start = addDays(today(), 1);
  const fits = db.berths.filter((b) => b.marinaId === marinaId && b.maxLength >= (Number(length) || 0)).sort((a, b) => a.dailyRate - b.dailyRate);
  const price = fits[0] ? quote(db, fits[0], start, addDays(start, n)) : undefined;
  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-medium">{t("Estimate a stay")}</h2>
      <p className="mt-1 text-[13px] text-ink-3">{t("The cheapest berth your boat fits, starting tomorrow. Search to see what's free on your dates.")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Field label={t("Marina")}>{(id) => <Select id={id} value={marinaId} onChange={(e) => setMarinaId(e.target.value)}>{marinas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label={t("Boat length (ft)")}>{(id) => <Input id={id} type="number" min={10} max={200} inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} />}</Field>
        <Field label={t("Nights")}>{(id) => <Input id={id} type="number" min={1} max={365} inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} />}</Field>
      </div>
      <p className="mt-5 text-[13px] text-ink-2" aria-live="polite">
        {price === undefined ? t("No berth at this marina takes a boat that long.") : (
          <>
            {t("About")} <span className="num text-[22px] font-semibold text-ink">{money(price)}</span>{" "}
            {n >= db.settings.monthlyFromNights ? t("(monthly rate, prorated)") : t("({n} nights at {rate} a night)", { n, rate: money(fits[0].dailyRate) })}
          </>
        )}
      </p>
    </Card>
  );
}

export function Pricing() {
  const { db } = useStore();
  usePageTitle(t("Rates and fees"));
  const marinas = openMarinas(db);
  const utilities = db.settings.utilities ?? DEFAULT_UTILITIES;
  const rules = db.settings.pricing;
  const lowestMonthly = Math.min(...marinas.map((m) => marinaFacts(db, m.id).fromMonthly));
  return (
    <Container className="py-12">
      <PageTitle title={t("Rates and fees")} intro={t("No booking fees. You pay for the nights you stay, plus anything you use at the dock.")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="text-[22px] leading-[30px] font-medium">{t("Rates by marina")}</h2>
          <p className="mt-1 text-[13px] text-ink-3">{t("Lowest rates. Larger berths cost more; you'll see the exact price before you book.")}</p>
          <div className="mt-4 overflow-x-auto rounded-[16px] border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-table-head text-xs text-ink-3">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-medium">{t("Marina")}</th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">{t("Boats up to")}</th>
                  <th scope="col" className="px-4 py-3 text-end font-medium">{t("Per night from")}</th>
                  <th scope="col" className="px-4 py-3 text-end font-medium">{t("Per month from")}</th>
                </tr>
              </thead>
              <tbody>
                {marinas.map((m) => {
                  const f = marinaFacts(db, m.id);
                  return (
                    <tr key={m.id} className="border-t border-table-line">
                      <td className="px-4 py-3"><Link to={`/marinas/${m.id}`} className="font-medium hover:underline">{m.name}</Link></td>
                      <td className="px-4 py-3 text-ink-2"><span className="num">{f.maxLength}</span> {t("ft")}</td>
                      <td className="num px-4 py-3 text-end">{money(f.fromDaily)}</td>
                      <td className="num px-4 py-3 text-end">{money(f.fromMonthly)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="space-y-4">
          <Estimate />
          <Card className="p-6">
            <h2 className="text-[17px] font-medium">{t("How the price is worked out")}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-[13px] leading-5 text-ink-2">
              <li>{t("Shorter stays: the berth's nightly rate for each night.")}</li>
              <li>{t("{n} nights or more: the monthly rate, prorated (a month counts as 30 nights).", { n: db.settings.monthlyFromNights })}</li>
              {rules?.weekendPct ? <li>{t("Friday and Saturday nights: +{pct}%.", { pct: rules.weekendPct })}</li> : null}
              {rules?.seasons.map((s) => <li key={s.id}>{t("{name} ({from} to {to}): {pct}% on the nightly rate.", { name: s.name, from: s.from, to: s.to, pct: (s.pct > 0 ? "+" : "") + s.pct })}</li>)}
              {rules?.longStayPct ? <li>{t("Stays of {n} nights or more (under a month): −{pct}%.", { n: rules.longStayNights, pct: rules.longStayPct })}</li> : null}
            </ul>
          </Card>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-[22px] leading-[30px] font-medium">{t("Berth contracts")}</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-3">{t("Keep the same berth for months at a time. The whole term is invoiced up front, and you can sign the contract online in your account.")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(Object.keys(CONTRACT_TERMS) as ContractTerm[]).map((k) => {
            const term = CONTRACT_TERMS[k];
            return (
              <Card key={k} className={k === "annual" ? "border-accent-strong p-6" : "p-6"}>
                <p className="text-[15px] font-medium">{t(term.label)}</p>
                <p className="mt-4 text-[13px] text-ink-3">{t("from")} <span className="num text-[28px] font-medium text-ink">{money(termFee(lowestMonthly, k))}</span> {t("/month")}</p>
                <p className="mt-3 text-[13px] text-ink-2">{term.discount ? t("{pct}% off the monthly rate", { pct: term.discount * 100 }) : t("The standard monthly rate")}</p>
                <p className="mt-1 text-xs text-ink-3">{t("We'll remind you {n} days before it ends.", { n: RENEWAL_NOTICE_DAYS[k] })}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[17px] font-medium">{t("Extras at the dock")}</h2>
          <p className="mt-1 text-[13px] text-ink-3">{t("Added to your invoice when you use them.")}</p>
          <table className="mt-4 w-full text-[13px]">
            <tbody>
              <tr className="border-t border-line"><td className="py-2.5">{t("Shore power (metered)")}</td><td className="num py-2.5 text-end">{money2(utilities.powerPerKwh)} / kWh</td></tr>
              <tr className="border-t border-line"><td className="py-2.5">{t("Fresh water (metered)")}</td><td className="num py-2.5 text-end">{money2(utilities.waterPerGallon)} / {t("gal")}</td></tr>
              {SERVICES.map((s) => (
                <tr key={s.id} className="border-t border-line"><td className="py-2.5">{t(s.label)}</td><td className="num py-2.5 text-end">{money2(s.price)} / {t(s.unit)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-6">
          <h2 className="text-[17px] font-medium">{t("Paying")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-[13px] leading-5 text-ink-2">
            <li>{t("The marina confirms your booking and sends the invoice. It's due within {n} days.", { n: db.settings.invoiceDueDays })}</li>
            <li>{t("Pay online by card from your account, in full or in part.")}</li>
            <li>{t("Or pay at the dock office by card, bank transfer, cash or check.")}</li>
            <li>{t("Receipts are in your account as soon as a payment is made.")}</li>
          </ul>
        </Card>
      </section>

      <Card className="mt-16 p-6 sm:p-8">
        <h2 className="mb-4 text-[17px] font-medium">{t("Find a berth")}</h2>
        <SearchForm />
      </Card>
    </Container>
  );
}
