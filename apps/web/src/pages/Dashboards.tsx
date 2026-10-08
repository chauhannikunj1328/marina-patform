
import { Link, useNavigate, useParams } from "react-router-dom";
import { Anchor, ArrowUpRight, CalendarDays, CalendarPlus, CircleAlert, DollarSign, Download, FileText, Gauge, LogIn, LogOut, Plus, Wrench } from "lucide-react";
import { useStore } from "@/data/store";
import { tn, t, tx, fmtDateTime, lastMonths, zoneOf } from "@marina/shared";
import { count, money, pct } from "@marina/shared";
import { Button, Card, CardHeader, HighlightPill, Meter, PageHeader, Select, StatCard, Table } from "@/components/ui";
import { MAX_SERIES, OccupancyChart, RevenueChart, RingChart } from "@/components/charts";
import { downloadCsv } from "@/lib/csv";

const MONTHS = 6;

function KpiRow({ ids, scopeLabel }: { ids: string[]; scopeLabel: string }) {
  const { ix } = useStore();
  const m = ix.metrics(ids);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-4">
      <StatCard label={t("Marinas")} icon={Anchor} value={count(m.marinas)} sub={scopeLabel} to="/marinas" />
      <StatCard
        label={t("Berths occupied today")}
        icon={Gauge}
        value={`${count(m.occupied)} / ${count(m.berths)}`}
        sub={t("{available} free · {reserved} reserved this week · {maintenance} in repair", { available: m.available, reserved: m.reserved, maintenance: m.maintenance })}
        to="/berths"
        hint={t("Berths with a confirmed or checked-in boat today, out of all berths.")}
      />
      <StatCard
        label={t("Revenue booked this month")}
        icon={DollarSign}
        value={money(m.revenue)}
        trend={{ value: m.revenueChange }}
        to="/billing"
        hint={t("Price of every confirmed, checked-in or completed stay, counted for the nights that fall in this month. Includes stays booked for later this month.")}
      />
      <StatCard
        label={t("Occupancy rate")}
        icon={CalendarDays}
        value={pct(m.occupancy)}
        trend={{ value: m.occupancy - m.occupancyPrev, label: t("vs 30 days ago"), unit: "pts" }}
        to="/analytics"
        hint={t("Occupied berths today divided by all berths, including berths in repair.")}
      />
    </div>
  );
}

/** Berth status ring in the brand's progress-ring style (guide 03: Secondary Teal for charts and rings). */
function BerthRing({ ids }: { ids: string[] }) {
  const { ix } = useStore();
  const m = ix.metrics(ids);
  const segments = [
    { label: t("Occupied"), value: m.occupied, color: "var(--ring-1)" },
    { label: t("Reserved this week"), value: m.reserved, color: "var(--ring-2)" },
    { label: t("Free"), value: m.available, color: "var(--ring-3)" },
    { label: t("In repair"), value: m.maintenance, color: "var(--ring-4)" },
  ];
  return (
    <Card>
      <CardHeader title={t("Berths today")} actions={<Link to="/berths" className="text-[13px] font-semibold text-green-text hover:underline">{t("View all")}</Link>} />
      <div className="px-6 pb-6">
        <RingChart segments={segments} center={<HighlightPill>{t("{pct} full", { pct: pct(m.occupancy).replace(".0", "") })}</HighlightPill>} />
        <ul className="mt-6 space-y-3">
          {segments.map((sg) => (
            <li key={sg.label} className="flex items-center justify-between gap-3 text-[15px]">
              <span className="flex items-center gap-2.5 text-ink-2">
                <span className="relative flex w-4 items-center" aria-hidden>
                  <span className="h-0.5 w-4 rounded-full" style={{ background: sg.color }} />
                  <span className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full" style={{ background: sg.color }} />
                </span>
                {t(sg.label)}
              </span>
              <span className="num font-semibold text-ink">
                {sg.value} <span className="font-normal text-ink-3">· {m.berths ? Math.round((sg.value / m.berths) * 100) : 0}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Guide 06/09: promo and update cards use the Accent grid backdrop. */
function UpdateCard({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="bg-promo relative overflow-hidden rounded-[20px] border border-transparent p-6 text-ink dark:border-line">
      <span className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">{t("New update")}</span>
      <p className="mt-4 max-w-[12ch] text-[26px] leading-[34px] font-medium tracking-[-0.005em]">{t("Monthly marina report")}</p>
      <p className="mt-2 max-w-[28ch] text-[13px] leading-5 text-ink-2">{t("Revenue, occupancy and berths for every marina in one CSV.")}</p>
      <button
        onClick={onDownload}
        aria-label={t("Download monthly report")}
        className="mt-5 inline-flex size-12 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover cursor-pointer"
      >
        <Download className="size-5" aria-hidden />
      </button>
      <FileText className="absolute -end-4 -bottom-6 size-36 text-promo-art" aria-hidden />
    </div>
  );
}

function TodayPanel({ ids }: { ids: string[] }) {
  const { ix, db } = useStore();
  const m = ix.metrics(ids);
  const set = new Set(ids);
  const openTasks = db.tasks.filter((t) => set.has(t.marinaId) && t.status !== "done").length;
  const rows = [
    { icon: LogIn, label: t("Arrivals today"), value: m.arrivalsToday, to: "/bookings?view=today" },
    { icon: LogOut, label: t("Departures today"), value: m.departuresToday, to: "/bookings?view=today" },
    { icon: CircleAlert, label: t("Bookings awaiting approval"), value: m.pending, to: "/bookings?status=pending" },
    { icon: Wrench, label: t("Open work orders"), value: openTasks, to: "/maintenance" },
  ];
  return (
    <Card>
      <CardHeader title={t("Today")} description={t("What needs attention")} />
      <ul>
        {rows.map((r) => (
          <li key={r.label} className="border-b border-line last:border-0">
            <Link to={r.to} className="flex items-center justify-between px-5 py-3 hover:bg-row-hover">
              <span className="flex items-center gap-3 text-[13px]">
                <r.icon className="size-4 text-ink-2" aria-hidden /> {t(r.label)}
              </span>
              <span className="flex items-center gap-1 font-semibold num">
                {r.value} <ArrowUpRight className="size-3.5 text-ink-3" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentActivity() {
  const { activity, user } = useStore();
  const items = activity.slice(0, 6);
  return (
    <Card>
      <CardHeader title={t("Recent activity")} actions={user?.role === "admin" && <Link to="/access" className="text-[13px] font-semibold text-green-text hover:underline">{t("Audit log")}</Link>} />
      {items.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-ink-3">{t("Nothing yet. Changes you make appear here.")}</p>
      ) : (
        <ol>
          {items.map((a) => {
            const body = (
              <>
                <p className="text-[13px]">{tx(a.text)}</p>
                <p className="text-xs text-ink-3">{t(a.by)} · {fmtDateTime(a.at, zoneOf(a.marinaId))}</p>
              </>
            );
            return (
              <li key={a.id} className="border-b border-line last:border-0">
                {a.to ? <Link to={a.to} className="block px-5 py-3 hover:bg-row-hover">{body}</Link> : <div className="px-5 py-3">{body}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/** Ranking table for a list of groups (cities, marinas…), all computed from the same metrics. */
function RankTable({ title, rows, nameHead }: { title: string; nameHead: string; rows: { id: string; name: string; sub: string; ids: string[]; to: string }[] }) {
  const { ix } = useStore();
  const data = rows
    .map((r) => ({ ...r, m: ix.metrics(r.ids) }))
    .sort((a, b) => b.m.revenue - a.m.revenue);
  // Rows that are single marinas don't need a marina count column.
  const showCount = data.some((r) => r.ids.length > 1);
  return (
    <Card>
      <CardHeader title={title} description={t("Ranked by revenue booked this month")} />
      <Table head={showCount ? [nameHead, "Marinas", "Berths", "Occupancy", "Revenue (month)", ""] : [nameHead, "Berths", "Occupancy", "Revenue (month)", ""]}>
        {data.map((r, i) => (
          <tr key={r.id}>
            <td>
              <span className="flex items-center gap-3">
                <span className="num w-6 text-ink-3">#{i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-medium whitespace-nowrap text-ink">{r.name}</span>
                  <span className="block text-xs text-ink-3">{r.sub}</span>
                </span>
              </span>
            </td>
            {showCount && <td className="num">{r.m.marinas}</td>}
            <td className="num">
              {r.m.occupied}/{r.m.berths}
            </td>
            <td className="w-44">
              <Meter value={r.m.occupancy} label={`${r.name} occupancy`} />
            </td>
            <td className="font-medium num">{money(r.m.revenue)}</td>
            <td>
              <Link to={r.to} className="text-[13px] font-semibold text-green-text hover:underline">
                {t("Open")}
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function Charts({ groups }: { groups: { name: string; ids: string[] }[] }) {
  const { ix } = useStore();
  const months = lastMonths(MONTHS);
  // Up to six series get their own color; any more are grouped as "Other".
  const shown = groups.length > MAX_SERIES ? [...groups.slice(0, MAX_SERIES - 1), { name: t("Other"), ids: groups.slice(MAX_SERIES - 1).flatMap((g) => g.ids) }] : groups;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title={t("Revenue")} description={t("Last {MONTHS} months · this month includes confirmed upcoming stays", { MONTHS: MONTHS })} />
        <div className="p-4">
          <RevenueChart months={months} series={shown.map((g) => ({ name: g.name, values: ix.revenueByMonth(g.ids, months) }))} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t("Occupancy")} description={t("Booked berth-nights, last {MONTHS} months", { MONTHS: MONTHS })} />
        <div className="p-4">
          <OccupancyChart months={months} series={shown.map((g) => ({ name: g.name, values: ix.occupancyByMonth(g.ids, months) }))} />
        </div>
      </Card>
    </div>
  );
}

function exportSummary(ix: ReturnType<typeof useStore>["ix"], rows: { name: string; ids: string[] }[], file: string) {
  downloadCsv(
    file,
    ["Name", "Marinas", "Berths", "Occupied today", "Occupancy", "Revenue this month", "Revenue last month"],
    rows.map((r) => {
      const m = ix.metrics(r.ids);
      return [r.name, m.marinas, m.berths, m.occupied, pct(m.occupancy), m.revenue, m.prevRevenue];
    }),
  );
}

export function GlobalOverview() {
  const { db, ix, scope, user } = useStore();
  const navigate = useNavigate();
  const counties = db.counties
    .map((c) => ({ c, ids: ix.marinaIdsInCounty(c.id).filter((id) => scope.includes(id)) }))
    .filter((x) => x.ids.length);
  return (
    <>
      <PageHeader
        title={user?.role === "admin" ? t("Global Overview") : t("Overview")}
        description={t("Performance across every marina you manage")}
        actions={
          <>
            <Button icon={Download} onClick={() => exportSummary(ix, counties.map((x) => ({ name: x.c.name, ids: x.ids })), "overview.csv")}>
              {t("Export CSV")}
            </Button>
            <Button variant="primary" icon={CalendarPlus} onClick={() => navigate("/bookings?new=1")}>
              {t("New booking")}
            </Button>
          </>
        }
      />
      <div className="space-y-4">
        <KpiRow ids={scope} scopeLabel={tn(counties.length, "{n} county", "{n} counties")} />
        <Charts groups={counties.map((x) => ({ name: x.c.name.replace(" County", ""), ids: x.ids }))} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <RankTable
              title={t("Marinas")}
              nameHead="Marina"
              rows={db.marinas
                .filter((m) => scope.includes(m.id))
                .map((m) => ({ id: m.id, name: m.name, sub: ix.city(m.cityId)?.name ?? "", ids: [m.id], to: `/marinas/${m.id}` }))}
            />
            <RecentActivity />
          </div>
          <div className="space-y-4">
            <BerthRing ids={scope} />
            <TodayPanel ids={scope} />
            <UpdateCard onDownload={() => exportSummary(ix, db.marinas.filter((m) => scope.includes(m.id)).map((m) => ({ name: m.name, ids: [m.id] })), "monthly-marina-report.csv")} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Plus} onClick={() => navigate("/marinas?new=1")}>{t("Add marina")}</Button>
          <Button icon={FileText} onClick={() => navigate("/reports")}>{t("View reports")}</Button>
        </div>
      </div>
    </>
  );
}

export function CountyDashboard() {
  const { db, ix, scope } = useStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const counties = db.counties.filter((c) => ix.marinaIdsInCounty(c.id).some((m) => scope.includes(m)));
  const county = counties.find((c) => c.id === id) ?? counties[0];
  if (!county) return <PageHeader title={t("County Dashboard")} description={t("You don't have access to any county yet.")} />;
  const ids = ix.marinaIdsInCounty(county.id).filter((m) => scope.includes(m));
  const cities = db.cities.filter((c) => c.countyId === county.id).map((c) => ({ c, ids: ix.marinaIdsInCity(c.id).filter((m) => scope.includes(m)) })).filter((x) => x.ids.length);
  return (
    <>
      <PageHeader
        title={county.name}
        description={`${t(county.state)} · ${tn(cities.length, "{n} city", "{n} cities")}`}
        actions={
          <>
            <Select look="plain" aria-label={t("Choose county")} value={county.id} onChange={(e) => navigate(`/county/${e.target.value}`)}>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button icon={Download} onClick={() => exportSummary(ix, cities.map((x) => ({ name: x.c.name, ids: x.ids })), `${county.name}.csv`)}>{t("Export CSV")}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <KpiRow ids={ids} scopeLabel={tn(cities.length, "in {n} city", "in {n} cities")} />
        <Charts groups={cities.map((x) => ({ name: x.c.name, ids: x.ids }))} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RankTable title={t("Cities in {name}", { name: county.name })} nameHead="City" rows={cities.map((x) => ({ id: x.c.id, name: x.c.name, sub: tn(x.ids.length, "{n} marina", "{n} marinas"), ids: x.ids, to: `/city/${x.c.id}` }))} />
          </div>
          <div className="space-y-4">
            <BerthRing ids={ids} />
            <TodayPanel ids={ids} />
          </div>
        </div>
      </div>
    </>
  );
}

export function CityDashboard() {
  const { db, ix, scope } = useStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const cities = db.cities.filter((c) => ix.marinaIdsInCity(c.id).some((m) => scope.includes(m)));
  const city = cities.find((c) => c.id === id) ?? cities[0];
  if (!city) return <PageHeader title={t("City Dashboard")} description={t("You don't have access to any city yet.")} />;
  const marinas = db.marinas.filter((m) => m.cityId === city.id && scope.includes(m.id));
  const ids = marinas.map((m) => m.id);
  const county = ix.county(city.countyId);
  return (
    <>
      <PageHeader
        title={city.name}
        description={`${county?.name}, ${county?.state}`}
        actions={
          <>
            <Select look="plain" aria-label={t("Choose city")} value={city.id} onChange={(e) => navigate(`/city/${e.target.value}`)}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button icon={Download} onClick={() => exportSummary(ix, marinas.map((m) => ({ name: m.name, ids: [m.id] })), `${city.name}.csv`)}>{t("Export CSV")}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <KpiRow ids={ids} scopeLabel={t("in {name}", { name: city.name })} />
        <Charts groups={marinas.map((m) => ({ name: m.name, ids: [m.id] }))} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RankTable title={t("Marinas in {name}", { name: city.name })} nameHead="Marina" rows={marinas.map((m) => ({ id: m.id, name: m.name, sub: m.address, ids: [m.id], to: `/marinas/${m.id}` }))} />
          </div>
          <div className="space-y-4">
            <BerthRing ids={ids} />
            <TodayPanel ids={ids} />
          </div>
        </div>
      </div>
    </>
  );
}
