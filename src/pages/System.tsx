import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import { useStore } from "@/data/store";
import type { Role } from "@/data/types";
import { Button, Card, CardHeader, ConfirmDialog, Field, Input, PageHeader, Pagination, paginate, SearchInput, Select, Table, Toolbar } from "@/components/ui";
import { fmtDateTime } from "@/lib/date";
import { ROLE_LABEL } from "./People";

const PERMISSIONS: { area: string; actions: Record<Role, "full" | "own" | "view" | "none"> }[] = [
  { area: "Global, county and city dashboards", actions: { admin: "full", manager: "own", staff: "none" } },
  { area: "Marinas: add, edit, deactivate", actions: { admin: "full", manager: "own", staff: "view" } },
  { area: "Berths: add, edit, maintenance", actions: { admin: "full", manager: "own", staff: "own" } },
  { area: "Bookings: create, approve, check in/out", actions: { admin: "full", manager: "own", staff: "own" } },
  { area: "Staff and shifts", actions: { admin: "full", manager: "own", staff: "view" } },
  { area: "Work orders", actions: { admin: "full", manager: "own", staff: "own" } },
  { area: "Billing: invoices, payments, reminders", actions: { admin: "full", manager: "own", staff: "none" } },
  { area: "Reports and analytics", actions: { admin: "full", manager: "own", staff: "none" } },
  { area: "Locations (counties and cities)", actions: { admin: "full", manager: "none", staff: "none" } },
  { area: "Users and access control", actions: { admin: "full", manager: "none", staff: "none" } },
];

const LEVEL = {
  full: { label: "All marinas", icon: true },
  own: { label: "Assigned marinas", icon: true },
  view: { label: "View only", icon: true },
  none: { label: "No access", icon: false },
};

export function AccessControl() {
  const { db } = useStore();
  const roles: Role[] = ["admin", "manager", "staff"];
  return (
    <>
      <PageHeader title="Access Control" description="What each role can see and do. Assign roles on the Users tab." actions={<Link to="/users"><Button>Manage users</Button></Link>} />
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {roles.map((r) => (
          <Card key={r} className="p-5">
            <p className="font-semibold">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-[13px] text-ink-3">
              {r === "admin" ? "Runs the whole company: every marina, billing, users and settings." : r === "manager" ? "Runs one or more marinas day to day, including billing for them." : "Handles bookings, berths and work orders at assigned marinas."}
            </p>
            <p className="mt-3 text-[13px] font-medium">{db.users.filter((u) => u.role === r).length} users</p>
          </Card>
        ))}
      </div>
      <Card className="mb-4">
        <CardHeader title="Permissions" />
        <Table head={["Area", ...roles.map((r) => ROLE_LABEL[r])]}>
          {PERMISSIONS.map((p) => (
            <tr key={p.area}>
              <td className="font-medium">{p.area}</td>
              {roles.map((r) => {
                const l = LEVEL[p.actions[r]];
                return (
                  <td key={r} className="!text-left">
                    <span className={`inline-flex items-center gap-1.5 text-[13px] ${l.icon ? "" : "text-ink-3"}`}>
                      {l.icon ? <Check className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                      {l.label}
                    </span>
                  </td>
                );
              })}
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
      <CardHeader title="Audit log" description="Every change made in the system, newest first" />
      <Toolbar><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by person or action" /></Toolbar>
      <Table head={["When", "Who", "What", ""]} empty={rows.length === 0}>
        {pg.rows.map((a) => (
          <tr key={a.id}>
            <td className="whitespace-nowrap text-ink-2">{fmtDateTime(a.at)}</td>
            <td className="whitespace-nowrap font-medium">{a.by}</td>
            <td>{a.text}</td>
            <td>{a.to && <Link to={a.to} className="text-[13px] font-semibold text-green-text hover:underline">Open</Link>}</td>
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
            <Toggle label="Daily summary email" hint="Arrivals, departures and occupancy at 7 AM" checked={notify.digest} onChange={(v) => setNotify({ ...notify, digest: v })} />
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
              <Field label="Time zone">{(id) => <Select id={id} value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })}><option value="America/Los_Angeles">Pacific Time</option><option value="America/Denver">Mountain Time</option><option value="America/Chicago">Central Time</option><option value="America/New_York">Eastern Time</option></Select>}</Field>
              <Field label="Invoice due after (days)" hint="For invoices created from now on" error={orgErrors.dueDays}>{(id) => <Input id={id} type="number" min={1} value={org.dueDays} onChange={(e) => setOrg({ ...org, dueDays: e.target.value })} />}</Field>
              <Field label="Monthly rate applies from (nights)" hint="Shorter stays use the daily rate. Changes booking prices." error={orgErrors.monthlyFrom}>{(id) => <Input id={id} type="number" min={7} value={org.monthlyFrom} onChange={(e) => setOrg({ ...org, monthlyFrom: e.target.value })} />}</Field>
            </div>
            <div className="flex justify-end border-t border-line px-5 py-3">
              <Button variant="primary" onClick={saveOrg}>Save defaults</Button>
            </div>
          </Card>
        )}

        <Card className="xl:col-span-2">
          <CardHeader title="Demo data" description="This prototype keeps your changes in this browser until midnight." />
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-[13px] text-ink-2">Reset to discard every booking, marina, staff and invoice change you've made and start from fresh sample data.</p>
            <Button onClick={() => setConfirmReset(true)}>Reset demo data</Button>
          </div>
        </Card>
      </div>
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
