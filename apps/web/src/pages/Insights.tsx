import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Clock, Download, FileDown, FileText, Ruler, Sailboat, Sheet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CompanyMark, useBrandColor } from "@/components/CompanyMark";
import { useStore } from "@/data/store";
import { t, daysBetween, fmtDate, fmtMonth, lastMonths, monthKey, REVENUE, today } from "@marina/shared";
import { money, money2, pct } from "@marina/shared";
import { downloadCsv, downloadWorkbook } from "@/lib/csv";
import { allDataSheets } from "@/lib/exportAll";
import { ReportSchedules } from "./ReportSchedules";
import { Button, Card, CardHeader, Field, PageHeader, Select, StatCard, Table } from "@/components/ui";
import { MAX_SERIES, OccupancyChart, RevenueChart } from "@/components/charts";

type ReportKind = "marina-summary" | "bookings" | "receivables" | "owners" | "services";

export const REPORTS: { value: ReportKind; label: string; description: string }[] = [
  { value: "marina-summary", label: "Marina performance", description: "Revenue, occupancy and bookings per marina for the chosen month" },
  { value: "bookings", label: "Bookings by status", description: "How many bookings started in the month, grouped by status" },
  { value: "receivables", label: "Unpaid invoices", description: "Every due and overdue invoice, oldest first" },
  { value: "owners", label: "Top boat owners", description: "Owners ranked by revenue in the chosen month" },
  { value: "services", label: "Fuel, services and utilities", description: "Fuel, pump-outs, ice, laundry, electricity and water charged in the month, by marina" },
];

export function Reports() {
  const { db, ix, scope } = useStore();
  const brand = useBrandColor();
  const months = lastMonths(12);
  const [kind, setKind] = useState<ReportKind>("marina-summary");
  const [month, setMonth] = useState(months[months.length - 1]);

  const report = useMemo((): { head: string[]; rows: (string | number)[][]; display?: (string | number)[][] } => {
    const marinas = db.marinas.filter((m) => scope.includes(m.id));
    const inMonth = ix.bookingsIn(scope).filter((b) => monthKey(b.start) === month);
    if (kind === "marina-summary") {
      const rows = marinas.map((m) => {
        const [rev] = ix.revenueByMonth([m.id], [month]);
        const [occ] = ix.occupancyByMonth([m.id], [month]);
        const bks = inMonth.filter((b) => ix.berth(b.berthId)?.marinaId === m.id && b.status !== "cancelled").length;
        return [m.name, ix.city(m.cityId)?.name ?? "", db.berths.filter((b) => b.marinaId === m.id).length, bks, pct(occ), rev];
      });
      return { head: ["Marina", "City", "Berths", "Bookings started", "Occupancy", "Revenue"], rows, display: rows.map((r) => [...r.slice(0, 5), money(Number(r[5]))]) };
    }
    if (kind === "bookings") {
      const statuses = ["pending", "confirmed", "checked-in", "completed", "cancelled"] as const;
      const rows = statuses.map((s) => {
        const list = inMonth.filter((b) => b.status === s);
        return [s[0].toUpperCase() + s.slice(1), list.length, list.reduce((t, b) => t + daysBetween(b.start, b.end), 0), Math.round(list.reduce((t, b) => t + ix.toReporting(ix.amount(b), ix.berth(b.berthId)?.marinaId), 0))];
      });
      return { head: ["Status", "Bookings", "Nights", "Value"], rows, display: rows.map((r) => [r[0], r[1], r[2], money(Number(r[3]))]) };
    }
    if (kind === "receivables") {
      const now = today();
      const rows = db.invoices
        .filter((i) => (i.status === "due" || i.status === "overdue") && scope.includes(ix.marinaOfBerth(ix.booking(i.bookingId)?.berthId ?? "")?.id ?? ""))
        .sort((a, b) => a.due.localeCompare(b.due))
        .map((i) => {
          const bk = ix.booking(i.bookingId)!;
          const owner = ix.owner(ix.boat(bk.boatId)?.ownerId ?? "");
          return [i.number, owner?.name ?? "", ix.marinaOfBerth(bk.berthId)?.name ?? "", i.due, Math.max(0, daysBetween(i.due, now)), ix.balance(i), ix.curOfInvoice(i)];
        });
      // Each balance is in its marina's currency.
      return { head: ["Invoice", "Boat owner", "Marina", "Due", "Days late", "Balance due", "Currency"], rows, display: rows.map((r) => [...r.slice(0, 5), money2(Number(r[5]), String(r[6])), r[6]]) };
    }
    if (kind === "services") {
      const totals = new Map<string, { service: string; marina: string; currency: string; qty: number; unit: string; count: number; amount: number }>();
      for (const inv of db.invoices) {
        if (inv.status === "void") continue;
        const marinaId = ix.marinaOfInvoice(inv) ?? "";
        if (!scope.includes(marinaId)) continue;
        for (const l of inv.lines ?? []) {
          if (monthKey(l.at.slice(0, 10)) !== month) continue;
          const key = `${l.label}|${marinaId}`;
          const t = totals.get(key) ?? { service: l.label, marina: ix.marina(marinaId)?.name ?? "", currency: ix.cur(marinaId), qty: 0, unit: l.unit, count: 0, amount: 0 };
          t.qty += l.qty;
          t.count += 1;
          t.amount += l.amount;
          totals.set(key, t);
        }
      }
      const rows = [...totals.values()].sort((a, b) => a.service.localeCompare(b.service) || b.amount - a.amount).map((t) => [t.service, t.marina, `${Math.round(t.qty * 10) / 10} ${t.unit}`, t.count, Math.round(t.amount * 1000) / 1000, t.currency]);
      return { head: ["Service", "Marina", "Quantity", "Charges", "Revenue", "Currency"], rows, display: rows.map((r) => [...r.slice(0, 4), money2(Number(r[4]), String(r[5])), r[5]]) };
    }
    const byOwner = new Map<string, number>();
    for (const b of ix.bookingsIn(scope)) {
      if (!REVENUE.includes(b.status)) continue;
      const share = ix.monthShare(b, month);
      if (!share) continue;
      const o = ix.boat(b.boatId)?.ownerId ?? "";
      byOwner.set(o, (byOwner.get(o) ?? 0) + ix.toReporting(share, ix.berth(b.berthId)?.marinaId));
    }
    const rows = [...byOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([o, v]) => {
      const owner = ix.owner(o);
      return [owner?.name ?? "", owner?.email ?? "", db.boats.filter((b) => b.ownerId === o).map((b) => b.name).join(", "), Math.round(v)];
    });
    return { head: ["Boat owner", "Email", "Boats", "Revenue"], rows, display: rows.map((r) => [...r.slice(0, 3), money(Number(r[3]))]) };
  }, [kind, month, db, ix, scope]);

  const info = REPORTS.find((r) => r.value === kind)!;

  return (
    <>
      <PageHeader title={t("Reports")} description={t("Pick a report, preview it, and download it as CSV, Excel or PDF")} actions={<Button icon={Sheet} onClick={() => downloadWorkbook(`marina-data-${today()}.xls`, allDataSheets(db, ix, scope))}>{t("Export all data (Excel)")}</Button>} />
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <Field label={t("Report")}>{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>{REPORTS.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}</Select>}</Field>
          <Field label={t("Month")}>{(id) => <Select id={id} value={month} onChange={(e) => setMonth(e.target.value)} disabled={kind === "receivables"}>{[...months].reverse().map((m) => <option key={m} value={m}>{fmtMonth(m)} {m.slice(0, 4)}{m === months[months.length - 1] ? t(" (to date)") : ""}</option>)}</Select>}</Field>
          <div className="flex gap-2">
            <Button icon={Download} onClick={() => downloadCsv(`${kind}-${kind === "receivables" ? today() : month}.csv`, report.head.map((h) => t(h)), report.rows)}>{t("CSV")}</Button>
            <Button icon={Sheet} onClick={() => downloadWorkbook(`${kind}-${kind === "receivables" ? today() : month}.xls`, [{ name: t(info.label), head: report.head.map((h) => t(h)), rows: report.rows }])}>{t("Excel")}</Button>
            <Button variant="primary" icon={FileDown} onClick={() => window.print()}>{t("Download PDF")}</Button>
          </div>
        </div>
      </Card>
      {/* Guide 14 Exports: header with logo, Ink text, Neutral table lines. Printed via "Save as PDF". */}
      <div className="print-area pointer-events-none fixed top-0 start-[-10000px] w-[800px] text-[12px]" aria-hidden>
        <div className="mb-6 flex items-center justify-between border-b-2 pb-4" style={{ borderColor: brand }}>
          {db.settings.branding?.logo ? <CompanyMark size={32} /> : <Logo />}
          <span className="text-[#656565]">{db.settings.company}</span>
        </div>
        <h1 className="text-[22px] font-medium">{t(info.label)}</h1>
        <p className="mt-1 mb-5 text-[#484848]">
          {t(info.description)}. {kind === "receivables" ? t("As of {date}", { date: fmtDate(today()) }) : `${fmtMonth(month)} ${month.slice(0, 4)}`} {t("· Generated")} {fmtDate(today())}
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>{report.head.map((h) => <th key={h} className="border-b border-[#d9d9d6] py-2 pe-3 text-start text-[10px] font-medium text-[#656565] uppercase">{t(h)}</th>)}</tr>
          </thead>
          <tbody>
            {(report.display ?? report.rows).map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className="num border-b border-[#e5e5e1] py-2 pe-3">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[10px] text-[#656565]">{t("Marina Management System · Sample data for demonstration")}</p>
      </div>
      <Card>
        <CardHeader title={t(info.label)} description={t(info.description)} icon={FileText} />
        <Table head={report.head} empty={report.rows.length === 0}>
          {(report.display ?? report.rows).map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "font-medium" : "num"}>{c}</td>)}</tr>
          ))}
        </Table>
      </Card>
      <ReportSchedules reports={REPORTS} />
    </>
  );
}

const axis = { fontSize: 11, fill: "var(--chart-axis)", fontFamily: "var(--font-num)" };

function Histogram({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--surface-3)" }} contentStyle={{ background: "var(--raised)", border: "1px solid var(--table-line)", borderRadius: 12, fontSize: 12, boxShadow: "var(--shadow-2)" }} formatter={(v) => [`${v} ${t(unit)}`, ""]} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={300} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Analytics() {
  const { db, ix, scope } = useStore();
  const months = lastMonths(12);
  const [marinaId, setMarinaId] = useState("all");
  const ids = marinaId === "all" ? scope : [marinaId];

  const bookings = ix.bookingsIn(ids).filter((b) => b.status !== "cancelled" && b.status !== "pending");
  const all = ix.bookingsIn(ids);
  const stays = bookings.map((b) => daysBetween(b.start, b.end));
  const avgStay = stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : 0;
  const lead = bookings.map((b) => daysBetween(b.createdAt, b.start));
  const avgLead = lead.length ? lead.reduce((a, b) => a + b, 0) / lead.length : 0;
  const cancelRate = all.length ? all.filter((b) => b.status === "cancelled").length / all.length : 0;
  const boatLen = bookings.map((b) => ix.boat(b.boatId)?.length ?? 0);
  const avgLen = boatLen.length ? boatLen.reduce((a, b) => a + b, 0) / boatLen.length : 0;

  const stayBuckets = [
    { label: "1–3", min: 1, max: 3 }, { label: "4–7", min: 4, max: 7 }, { label: "8–14", min: 8, max: 14 },
    { label: "15–27", min: 15, max: 27 }, { label: "28+", min: 28, max: 999 },
  ].map((b) => ({ label: t("{range} nights", { range: b.label }), value: stays.filter((s) => s >= b.min && s <= b.max).length }));

  const types = new Map<string, number>();
  bookings.forEach((b) => {
    const bt = ix.boat(b.boatId)?.type ?? "Other";
    types.set(bt, (types.get(bt) ?? 0) + 1);
  });

  const series = (marinaId === "all" ? db.marinas.filter((m) => scope.includes(m.id)) : db.marinas.filter((m) => m.id === marinaId)).map((m) => ({ name: m.name, ids: [m.id] }));
  const shown = series.length > MAX_SERIES ? [...series.slice(0, MAX_SERIES - 1), { name: t("Other marinas"), ids: series.slice(MAX_SERIES - 1).flatMap((s) => s.ids) }] : series;

  return (
    <>
      <PageHeader
        title={t("Analytics")}
        description={t("Trends over the last 12 months")}
        actions={
          <Select look="plain" aria-label={t("Filter by marina")} value={marinaId} onChange={(e) => setMarinaId(e.target.value)}>
            <option value="all">{t("All marinas")}</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        }
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
          <StatCard label={t("Average stay")} icon={CalendarRange} value={t("{n} nights", { n: avgStay.toFixed(1) })} />
          <StatCard label={t("Average booking lead time")} icon={Clock} value={t("{n} days", { n: avgLead.toFixed(0) })} sub={t("Booked this far ahead of arrival")} />
          <StatCard to="/bookings?status=cancelled" label={t("Cancellation rate")} icon={Sailboat} value={pct(cancelRate)} />
          <StatCard label={t("Average boat length")} icon={Ruler} value={t("{n} ft", { n: avgLen.toFixed(0) })} />
        </div>
        <Card>
          <CardHeader title={t("Revenue by marina")} description={t("Last 12 months · this month includes confirmed upcoming stays")} />
          <div className="p-4"><RevenueChart months={months} series={shown.map((s) => ({ name: s.name, values: ix.revenueByMonth(s.ids, months) }))} /></div>
        </Card>
        <Card>
          <CardHeader title={t("Occupancy by marina")} description={t("Booked berth-nights, last 12 months")} />
          <div className="p-4"><OccupancyChart months={months} series={shown.map((s) => ({ name: s.name, values: ix.occupancyByMonth(s.ids, months) }))} /></div>
        </Card>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title={t("Length of stay")} description={t("Number of bookings")} />
            <div className="p-4"><Histogram data={stayBuckets} unit="bookings" /></div>
          </Card>
          <Card>
            <CardHeader title={t("Boat types")} description={t("Bookings per boat type")} />
            <div className="p-4"><Histogram data={[...types.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: t(label), value }))} unit="bookings" /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
