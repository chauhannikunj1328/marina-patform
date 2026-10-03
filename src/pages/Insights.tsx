import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Clock, Download, FileDown, FileText, Ruler, Sailboat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/data/store";
import { daysBetween, fmtDate, fmtMonth, lastMonths, monthKey, nightsInMonth, today } from "@/lib/date";
import { money, pct } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, CardHeader, Field, PageHeader, Select, StatCard, Table } from "@/components/ui";
import { MAX_SERIES, OccupancyChart, RevenueChart } from "@/components/charts";

type ReportKind = "marina-summary" | "bookings" | "receivables" | "owners";

const REPORTS: { value: ReportKind; label: string; description: string }[] = [
  { value: "marina-summary", label: "Marina performance", description: "Revenue, occupancy and bookings per marina for the chosen month" },
  { value: "bookings", label: "Bookings by status", description: "How many bookings started in the month, grouped by status" },
  { value: "receivables", label: "Unpaid invoices", description: "Every due and overdue invoice, oldest first" },
  { value: "owners", label: "Top boat owners", description: "Owners ranked by revenue in the chosen month" },
];

export function Reports() {
  const { db, ix, scope } = useStore();
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
        return [s[0].toUpperCase() + s.slice(1), list.length, list.reduce((t, b) => t + daysBetween(b.start, b.end), 0), list.reduce((t, b) => t + ix.amount(b), 0)];
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
          return [i.number, owner?.name ?? "", ix.marinaOfBerth(bk.berthId)?.name ?? "", i.due, Math.max(0, daysBetween(i.due, now)), ix.balance(i)];
        });
      return { head: ["Invoice", "Boat owner", "Marina", "Due", "Days late", "Balance due"], rows, display: rows.map((r) => [...r.slice(0, 5), money(Number(r[5]))]) };
    }
    const byOwner = new Map<string, number>();
    for (const b of ix.bookingsIn(scope)) {
      if (b.status === "cancelled" || b.status === "pending") continue;
      const n = nightsInMonth(b.start, b.end, month);
      if (!n) continue;
      const o = ix.boat(b.boatId)?.ownerId ?? "";
      byOwner.set(o, (byOwner.get(o) ?? 0) + (ix.amount(b) * n) / daysBetween(b.start, b.end));
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
      <PageHeader title="Reports" description="Pick a report, preview it, and download it as CSV" />
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <Field label="Report">{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>{REPORTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>}</Field>
          <Field label="Month">{(id) => <Select id={id} value={month} onChange={(e) => setMonth(e.target.value)} disabled={kind === "receivables"}>{[...months].reverse().map((m) => <option key={m} value={m}>{fmtMonth(m)} {m.slice(0, 4)}{m === months[months.length - 1] ? " (to date)" : ""}</option>)}</Select>}</Field>
          <div className="flex gap-2">
            <Button icon={Download} onClick={() => downloadCsv(`${kind}-${kind === "receivables" ? today() : month}.csv`, report.head, report.rows)}>CSV</Button>
            <Button variant="primary" icon={FileDown} onClick={() => window.print()}>Download PDF</Button>
          </div>
        </div>
      </Card>
      {/* Guide 14 Exports: header with logo, Ink text, Neutral table lines. Printed via "Save as PDF". */}
      <div className="print-area pointer-events-none fixed top-0 left-[-10000px] w-[800px] text-[12px]" aria-hidden>
        <div className="mb-6 flex items-center justify-between border-b border-[#e5e5e1] pb-4">
          <Logo />
          <span className="text-[#656565]">{db.settings.company}</span>
        </div>
        <h1 className="text-[22px] font-medium">{info.label}</h1>
        <p className="mt-1 mb-5 text-[#484848]">
          {info.description}. {kind === "receivables" ? `As of ${fmtDate(today())}` : `${fmtMonth(month)} ${month.slice(0, 4)}`} · Generated {fmtDate(today())}
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>{report.head.map((h) => <th key={h} className="border-b border-[#d9d9d6] py-2 pr-3 text-left text-[10px] font-medium text-[#656565] uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(report.display ?? report.rows).map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className="num border-b border-[#e5e5e1] py-2 pr-3">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[10px] text-[#656565]">Marina Management System · Sample data for demonstration</p>
      </div>
      <Card>
        <CardHeader title={info.label} description={info.description} icon={FileText} />
        <Table head={report.head} empty={report.rows.length === 0}>
          {(report.display ?? report.rows).map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "font-medium" : "num"}>{c}</td>)}</tr>
          ))}
        </Table>
      </Card>
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
          <Tooltip cursor={{ fill: "var(--surface-3)" }} contentStyle={{ background: "var(--raised)", border: "1px solid var(--table-line)", borderRadius: 12, fontSize: 12, boxShadow: "var(--shadow-2)" }} formatter={(v) => [`${v} ${unit}`, ""]} />
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
  ].map((b) => ({ label: `${b.label} nights`, value: stays.filter((s) => s >= b.min && s <= b.max).length }));

  const types = new Map<string, number>();
  bookings.forEach((b) => {
    const t = ix.boat(b.boatId)?.type ?? "Other";
    types.set(t, (types.get(t) ?? 0) + 1);
  });

  const series = (marinaId === "all" ? db.marinas.filter((m) => scope.includes(m.id)) : db.marinas.filter((m) => m.id === marinaId)).map((m) => ({ name: m.name, ids: [m.id] }));
  const shown = series.length > MAX_SERIES ? [...series.slice(0, MAX_SERIES - 1), { name: "Other marinas", ids: series.slice(MAX_SERIES - 1).flatMap((s) => s.ids) }] : series;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Trends over the last 12 months"
        actions={
          <Select look="plain" aria-label="Filter by marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)}>
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        }
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
          <StatCard label="Average stay" icon={CalendarRange} value={`${avgStay.toFixed(1)} nights`} />
          <StatCard label="Average booking lead time" icon={Clock} value={`${avgLead.toFixed(0)} days`} sub="Booked this far ahead of arrival" />
          <StatCard to="/bookings?status=cancelled" label="Cancellation rate" icon={Sailboat} value={pct(cancelRate)} />
          <StatCard label="Average boat length" icon={Ruler} value={`${avgLen.toFixed(0)} ft`} />
        </div>
        <Card>
          <CardHeader title="Revenue by marina" description="Last 12 months · this month includes confirmed upcoming stays" />
          <div className="p-4"><RevenueChart months={months} series={shown.map((s) => ({ name: s.name, values: ix.revenueByMonth(s.ids, months) }))} /></div>
        </Card>
        <Card>
          <CardHeader title="Occupancy by marina" description="Booked berth-nights, last 12 months" />
          <div className="p-4"><OccupancyChart months={months} series={shown.map((s) => ({ name: s.name, values: ix.occupancyByMonth(s.ids, months) }))} /></div>
        </Card>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Length of stay" description="Number of bookings" />
            <div className="p-4"><Histogram data={stayBuckets} unit="bookings" /></div>
          </Card>
          <Card>
            <CardHeader title="Boat types" description="Bookings per boat type" />
            <div className="p-4"><Histogram data={[...types.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} unit="bookings" /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
