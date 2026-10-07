import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Plus, Trash } from "lucide-react";
import { useStore } from "@/data/store";
import type { Role } from "@marina/shared";
import { ADMIN_ONLY, AREAS, DEFAULT_PERMISSIONS, LEVEL_LABEL, type Area, type Level } from "@marina/shared";
import { Button, Card, CardHeader, ConfirmDialog, Field, IconButton, Input, Modal, PageHeader, Pagination, paginate, SearchInput, Select, Table, Toolbar, useDirty } from "@/components/ui";
import { addDays, fmtDate, fmtDateTime, fmtShort, fromISO, nowInZone, today } from "@marina/shared";
import { bookingAmount, DEFAULT_PRICING, DEFAULT_UTILITIES, priceNote, type PricingRules } from "@marina/shared";
import { money, money2, pct } from "@marina/shared";
import { ROLE_LABEL } from "./People";

function LevelCell({ level }: { level: Level }) {
  const off = level === "none";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${off ? "text-ink-3" : ""}`}>
      {off ? <Minus className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function AccessControl() {
  const { db, update, toast } = useStore();
  const roles: Role[] = ["admin", "manager", "staff"];
  const perms = db.settings.permissions;
  const changed = JSON.stringify(perms) !== JSON.stringify(DEFAULT_PERMISSIONS);

  const setLevel = (area: Area, role: "manager" | "staff", level: Level) => {
    const before = db;
    const label = AREAS.find((a) => a.key === area)?.label.split(":")[0];
    update(
      (d) => ({ ...d, settings: { ...d.settings, permissions: { ...d.settings.permissions, [area]: { ...d.settings.permissions[area], [role]: level } } } }),
      `Set ${ROLE_LABEL[role].toLowerCase()} access to ${label}: ${LEVEL_LABEL[level]}`,
    );
    toast(`${ROLE_LABEL[role]}: ${label} set to ${LEVEL_LABEL[level].toLowerCase()}`, before);
  };

  return (
    <>
      <PageHeader title="Access Control" description="What each role can see and do. Assign roles on the Users tab." actions={<Link to="/users?tab=users"><Button>Manage users</Button></Link>} />
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {roles.map((r) => (
          <Card key={r} className="p-6">
            <p className="text-[15px] font-semibold">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-3">
              {r === "admin" ? "Runs the whole company: every marina, billing, users and settings. Always has full access." : r === "manager" ? "Runs one or more marinas day to day." : "Handles day-to-day work at assigned marinas."}
            </p>
            <p className="num mt-3 text-[13px] font-medium">{db.users.filter((u) => u.role === r).length} users</p>
          </Card>
        ))}
      </div>
      <Card className="mb-4">
        <CardHeader
          title="Permissions"
          description="Changes apply right away. “No access” hides the page; “View only” hides create and edit actions."
          actions={
            changed && (
              <Button
                size="sm"
                onClick={() => {
                  const before = db;
                  update((d) => ({ ...d, settings: { ...d.settings, permissions: DEFAULT_PERMISSIONS } }), "Reset role permissions to defaults");
                  toast("Permissions reset to defaults", before);
                }}
              >
                Reset to defaults
              </Button>
            )
          }
        />
        <Table head={["Area", ...roles.map((r) => ROLE_LABEL[r])]}>
          {AREAS.map((a) => (
            <tr key={a.key}>
              <td className="font-medium">{a.label}</td>
              <td className="!text-left"><LevelCell level="full" /></td>
              {(["manager", "staff"] as const).map((r) => (
                <td key={r} className="!text-left">
                  <Select aria-label={`${ROLE_LABEL[r]} access to ${a.label}`} value={perms[a.key][r]} onChange={(e) => setLevel(a.key, r, e.target.value as Level)} className="w-48">
                    {(["own", "view", "none"] as const).map((l) => (
                      <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                    ))}
                  </Select>
                </td>
              ))}
            </tr>
          ))}
          {ADMIN_ONLY.map((a) => (
            <tr key={a.label}>
              <td className="font-medium">{a.label}<span className="block text-xs font-normal text-ink-3">Admins only</span></td>
              <td className="!text-left"><LevelCell level="full" /></td>
              <td className="!text-left"><LevelCell level="none" /></td>
              <td className="!text-left"><LevelCell level="none" /></td>
            </tr>
          ))}
        </Table>
      </Card>
      <AuditLog />
    </>
  );
}

function AuditLog() {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const rows = db.activity.filter((a) => !q || `${a.by} ${a.text}`.toLowerCase().includes(q.toLowerCase()));
  const pg = paginate(rows, page, 12);
  return (
    <Card>
      <CardHeader title="Audit log" description="Every change made in the system, newest first, with before and after values" />
      <Toolbar><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by person or action" /></Toolbar>
      <Table head={["When", "Who", "What", ""]} empty={rows.length === 0}>
        {pg.rows.map((a) => (
          <tr key={a.id}>
            <td className="whitespace-nowrap align-top text-ink-2">{fmtDateTime(a.at)}</td>
            <td className="whitespace-nowrap align-top font-medium">{a.by}</td>
            <td>
              {a.text}
              {a.changes && a.changes.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-semibold text-green-text">{a.changes.length} {a.changes.length === 1 ? "change" : "changes"}: before and after</summary>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {a.changes.map((c, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="py-1 pr-3 font-medium">{c.record}</td>
                          {c.kind === "changed" ? (
                            <>
                              <td className="py-1 pr-3 text-ink-3">{c.field}</td>
                              <td className="py-1 pr-3 text-ink-2 line-through decoration-ink-3/60">{c.before}</td>
                              <td className="py-1 font-medium">{c.after}</td>
                            </>
                          ) : (
                            <td colSpan={3} className="py-1 text-ink-2">{c.kind === "added" ? "Added" : "Removed"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </td>
            <td className="align-top">{a.to && <Link to={a.to} className="text-[13px] font-semibold text-green-text hover:underline">Open</Link>}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={pg.page} pages={pg.pages} total={rows.length} onPage={setPage} />
    </Card>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${checked ? "bg-primary" : "bg-surface-3"}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-surface shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function DailySummary({ onClose }: { onClose: () => void }) {
  const { db, ix, scope, user } = useStore();
  const m = ix.metrics(scope);
  const overdue = db.invoices.filter((i) => i.status === "overdue" && scope.includes(ix.marinaOfInvoice(i) ?? ""));
  const urgent = db.tasks.filter((t) => scope.includes(t.marinaId) && t.priority === "high" && t.status !== "done").length;
  const rows: [string, string][] = [
    ["Arrivals today", String(m.arrivalsToday)],
    ["Departures today", String(m.departuresToday)],
    ["Berths occupied", `${m.occupied} of ${m.berths} (${pct(m.occupancy)})`],
    ["Bookings awaiting approval", String(m.pending)],
    ["Overdue invoices", `${overdue.length} · ${money(overdue.reduce((t, i) => t + ix.balance(i), 0))}`],
    ["High priority work orders", String(urgent)],
  ];
  return (
    <Modal open onClose={onClose} title="Daily summary preview" description={`What ${user?.name.split(" ")[0]} would receive at 7 am`} footer={<Button onClick={onClose}>Close</Button>}>
      <div className="rounded-[16px] border border-line bg-sidebar p-5">
        <div className="rounded-[12px] bg-surface p-5">
          <p className="text-xs text-ink-3">From Marina · {fmtDate(today())}</p>
          <p className="mt-2 text-[18px] leading-[26px] font-medium">Good morning, here's today at a glance</p>
          <dl className="mt-4 divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-2">{k}</dt>
                <dd className="num font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-3">Sending this email needs an email service on a server. The preview uses live data from this browser.</p>
    </Modal>
  );
}


/** Admin pricing rules: weekend surcharge, long-stay discount and seasons. They apply to bookings made from now on. */
function PricingCard() {
  const { db, update, toast } = useStore();
  const saved = db.settings.pricing ?? DEFAULT_PRICING;
  const util = db.settings.utilities ?? DEFAULT_UTILITIES;
  const [f, setF] = useState(() => ({ weekend: String(saved.weekendPct), longPct: String(saved.longStayPct), longNights: String(saved.longStayNights), seasons: saved.seasons, power: String(util.powerPerKwh), water: String(util.waterPerGallon) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const rules: PricingRules = { weekendPct: Number(f.weekend) || 0, longStayPct: Number(f.longPct) || 0, longStayNights: Number(f.longNights) || 7, seasons: f.seasons };
  const sample = db.berths.find((b) => b.dailyRate >= 50) ?? db.berths[0];
  const previews = [
    { label: "2 weeknights", start: nextWeekday(1), nights: 2 },
    { label: "Weekend (Fri–Sun)", start: nextWeekday(5), nights: 2 },
    { label: `${rules.longStayNights} nights`, start: nextWeekday(1), nights: rules.longStayNights },
  ];
  const setSeason = (i: number, patch: Partial<PricingRules["seasons"][number]>) => setF({ ...f, seasons: f.seasons.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const save = () => {
    const e: Record<string, string> = {};
    const pct = (v: string, min: number, max: number) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max;
    if (!pct(f.weekend, -50, 100)) e.weekend = "Use −50 to 100.";
    if (!pct(f.longPct, 0, 50)) e.longPct = "Use 0 to 50.";
    if (!(Number.isInteger(Number(f.longNights)) && Number(f.longNights) >= 2 && Number(f.longNights) < db.settings.monthlyFromNights)) e.longNights = `Use 2 to ${db.settings.monthlyFromNights - 1} nights (monthly rate starts at ${db.settings.monthlyFromNights}).`;
    if (!(Number(f.power) >= 0 && Number(f.power) <= 5)) e.power = "Use 0 to 5.";
    if (!(Number(f.water) >= 0 && Number(f.water) <= 1)) e.water = "Use 0 to 1.";
    f.seasons.forEach((x, i) => {
      if (!x.name.trim()) e[`s${i}`] = "Name the season.";
      else if (!/^\d{2}-\d{2}$/.test(x.from) || !/^\d{2}-\d{2}$/.test(x.to)) e[`s${i}`] = "Dates as MM-DD, e.g. 06-15.";
      else if (!pct(String(x.pct), -50, 100)) e[`s${i}`] = "Adjustment −50 to 100%.";
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    const before = db;
    update((d) => ({ ...d, settings: { ...d.settings, pricing: rules, utilities: { powerPerKwh: Number(f.power), waterPerGallon: Number(f.water) } } }), "Updated pricing rules");
    toast("Pricing saved. New bookings use it; existing bookings keep their price.", before);
  };
  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Pricing" description="Seasonal rates, weekend surcharge, long-stay discount and utility rates. Bookings already made keep their price." />
      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Weekend surcharge (%)" hint="Friday and Saturday nights" error={errors.weekend}>{(id) => <Input id={id} type="number" value={f.weekend} onChange={(e) => setF({ ...f, weekend: e.target.value })} />}</Field>
            <Field label="Long-stay discount (%)" hint="0 turns it off" error={errors.longPct}>{(id) => <Input id={id} type="number" min={0} value={f.longPct} onChange={(e) => setF({ ...f, longPct: e.target.value })} />}</Field>
            <Field label="Long stay from (nights)" error={errors.longNights}>{(id) => <Input id={id} type="number" min={2} value={f.longNights} onChange={(e) => setF({ ...f, longNights: e.target.value })} />}</Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Electricity ($ per kWh)" hint="Billed from meter readings" error={errors.power}>{(id) => <Input id={id} type="number" step="0.01" min={0} value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} />}</Field>
            <Field label="Water ($ per gallon)" hint="Billed from meter readings" error={errors.water}>{(id) => <Input id={id} type="number" step="0.001" min={0} value={f.water} onChange={(e) => setF({ ...f, water: e.target.value })} />}</Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium">Seasons</p>
              <Button size="sm" icon={Plus} onClick={() => setF({ ...f, seasons: [...f.seasons, { id: `se-${Date.now()}`, name: "", from: "06-15", to: "09-15", pct: 20 }] })}>Add season</Button>
            </div>
            {f.seasons.length === 0 && <p className="text-[13px] text-ink-3">No seasons. Every night uses the berth&apos;s daily rate.</p>}
            <div className="space-y-3">
              {f.seasons.map((x, i) => (
                <div key={x.id} className="grid grid-cols-2 items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_110px_110px_110px_auto]">
                  <Field label="Name" error={errors[`s${i}`]}>{(id) => <Input id={id} value={x.name} placeholder="Summer" onChange={(e) => setSeason(i, { name: e.target.value })} />}</Field>
                  <Field label="From (MM-DD)">{(id) => <Input id={id} value={x.from} onChange={(e) => setSeason(i, { from: e.target.value })} />}</Field>
                  <Field label="To (MM-DD)">{(id) => <Input id={id} value={x.to} onChange={(e) => setSeason(i, { to: e.target.value })} />}</Field>
                  <Field label="Rate change (%)">{(id) => <Input id={id} type="number" value={String(x.pct)} onChange={(e) => setSeason(i, { pct: Number(e.target.value) })} />}</Field>
                  <IconButton icon={Trash} label={`Remove ${x.name || "season"}`} onClick={() => setF({ ...f, seasons: f.seasons.filter((_, j) => j !== i) })} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-md bg-surface-2 p-4 text-[13px]">
          <p className="mb-1 font-semibold">Preview</p>
          <p className="mb-3 text-xs text-ink-3">Berth {sample?.code} at {money2(sample?.dailyRate ?? 0)} a night</p>
          {sample && previews.map((p) => {
            const end = addDays(p.start, p.nights);
            const now = bookingAmount(p.start, end, sample, db.settings.monthlyFromNights, rules);
            const base = p.nights * sample.dailyRate;
            return (
              <div key={p.label} className="flex items-baseline justify-between border-b border-line py-2 last:border-0">
                <span>{p.label}<span className="block text-xs text-ink-3">{fmtShort(p.start)} · {priceNote(p.start, end, db.settings.monthlyFromNights, rules)}</span></span>
                <span className="num text-right font-semibold">{money2(now)}{now !== base && <span className="block text-xs font-normal text-ink-3 line-through">{money2(base)}</span>}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button variant="primary" disabled={!dirty} onClick={save}>Save pricing</Button>
      </div>
    </Card>
  );
}

/** Next date (from tomorrow) falling on a weekday, 0 = Sunday. */
function nextWeekday(day: number): string {
  let d = addDays(today(), 1);
  while (fromISO(d).getDay() !== day) d = addDays(d, 1);
  return d;
}

export function Settings() {
  const { db, user, update, toast, resetData } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [org, setOrg] = useState({
    company: db.settings.company,
    currency: db.settings.currency,
    timezone: db.settings.timezone,
    dueDays: String(db.settings.invoiceDueDays),
    monthlyFrom: String(db.settings.monthlyFromNights),
  });
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [notify, setNotify] = useState(db.settings.notify);
  const [preview, setPreview] = useState(false);
  const isAdmin = user?.role === "admin";

  const saveOrg = () => {
    const e: Record<string, string> = {};
    if (!org.company.trim()) e.company = "Enter the company name.";
    const due = Number(org.dueDays), monthly = Number(org.monthlyFrom);
    if (!(Number.isInteger(due) && due >= 1 && due <= 90)) e.dueDays = "Use 1 to 90 days.";
    if (!(Number.isInteger(monthly) && monthly >= 7 && monthly <= 60)) e.monthlyFrom = "Use 7 to 60 nights.";
    setOrgErrors(e);
    if (Object.keys(e).length) return;
    update(
      (d) => ({ ...d, settings: { ...d.settings, company: org.company.trim(), currency: org.currency, timezone: org.timezone, invoiceDueDays: due, monthlyFromNights: monthly } }),
      "Updated company defaults",
    );
    toast("Company defaults saved");
  };

  return (
    <>
      <PageHeader title="Settings" description="Your profile, company defaults and notifications" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Your profile" />
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!profile.name.trim()) return toast("Name can't be empty", undefined, "error");
              update((d) => ({ ...d, users: d.users.map((u) => (u.id === user?.id ? { ...u, name: profile.name.trim() } : u)) }), "Updated their profile");
              toast("Profile saved");
            }}
          >
            <Field label="Full name">{(id) => <Input id={id} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />}</Field>
            <Field label="Email" hint="Ask an admin to change your sign-in email.">{(id) => <Input id={id} value={profile.email} disabled />}</Field>
            <Field label="Role">{(id) => <Input id={id} value={user ? ROLE_LABEL[user.role] : ""} disabled />}</Field>
            <div className="flex justify-end"><Button type="submit" variant="primary">Save profile</Button></div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="What shows in the bell menu and in emails to you" />
          <div className="divide-y divide-line px-5">
            <Toggle label="Booking needs approval" checked={notify.pending} onChange={(v) => setNotify({ ...notify, pending: v })} />
            <Toggle label="Invoice becomes overdue" checked={notify.overdue} onChange={(v) => setNotify({ ...notify, overdue: v })} />
            <Toggle label="High priority work order" checked={notify.maintenance} onChange={(v) => setNotify({ ...notify, maintenance: v })} />
            <Toggle label="Daily summary email" hint="Arrivals, departures and occupancy at 7 am" checked={notify.digest} onChange={(v) => setNotify({ ...notify, digest: v })} />
            <div className="py-3">
              <button onClick={() => setPreview(true)} className="text-[13px] font-semibold text-green-text hover:underline cursor-pointer">Preview daily summary</button>
            </div>
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button variant="primary" onClick={() => { update((d) => ({ ...d, settings: { ...d.settings, notify } }), "Updated notification preferences"); toast("Notification preferences saved"); }}>Save preferences</Button>
          </div>
        </Card>

        {isAdmin && (
          <Card className="xl:col-span-2">
            <CardHeader title="Company defaults" description="Apply to every marina" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company name" hint="Shown on invoices" error={orgErrors.company}>{(id) => <Input id={id} value={org.company} onChange={(e) => setOrg({ ...org, company: e.target.value })} />}</Field>
              <Field label="Currency">{(id) => <Select id={id} value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value as typeof org.currency })}><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></Select>}</Field>
              <Field label="Time zone" hint={`Times in the app show in this zone. Now: ${nowInZone(org.timezone)}`}>{(id) => <Select id={id} value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })}><option value="America/Los_Angeles">Pacific Time</option><option value="America/Denver">Mountain Time</option><option value="America/Chicago">Central Time</option><option value="America/New_York">Eastern Time</option></Select>}</Field>
              <Field label="Invoice due after (days)" hint="For invoices created from now on" error={orgErrors.dueDays}>{(id) => <Input id={id} type="number" min={1} value={org.dueDays} onChange={(e) => setOrg({ ...org, dueDays: e.target.value })} />}</Field>
              <Field label="Monthly rate applies from (nights)" hint="Shorter stays use the daily rate. Changes booking prices." error={orgErrors.monthlyFrom}>{(id) => <Input id={id} type="number" min={7} value={org.monthlyFrom} onChange={(e) => setOrg({ ...org, monthlyFrom: e.target.value })} />}</Field>
            </div>
            <div className="flex justify-end border-t border-line px-5 py-3">
              <Button variant="primary" onClick={saveOrg}>Save defaults</Button>
            </div>
          </Card>
        )}

        {isAdmin && <PricingCard />}

        <Card className="xl:col-span-2">
          <CardHeader title="Demo data" description="This prototype keeps your changes in this browser until midnight." />
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-[13px] text-ink-2">Reset to discard every booking, marina, staff and invoice change you've made and start from fresh sample data.</p>
            <Button onClick={() => setConfirmReset(true)}>Reset demo data</Button>
          </div>
        </Card>
      </div>
      {preview && <DailySummary onClose={() => setPreview(false)} />}
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        body="All changes made in this browser are discarded. This can't be undone."
        confirmLabel="Reset data"
        onConfirm={() => {
          resetData();
          toast("Demo data reset");
        }}
      />
    </>
  );
}
