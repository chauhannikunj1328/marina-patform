// Scheduled report emails: which report, how often and to whom. Saved now; sending starts once the
// app has a server (this prototype runs in the browser, so it can't send email on a timer).
import { useState } from "react";
import { CalendarClock, Mail, Plus, Trash } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { t, addDays, fmtDate, fromISO, today, type ReportSchedule } from "@marina/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Field, IconButton, Input, Modal, Select, Table } from "@/components/ui";

const FREQ: Record<ReportSchedule["frequency"], string> = { daily: "Every day, 7 am", weekly: "Mondays, 7 am", monthly: "1st of the month, 7 am" };

function nextSend(f: ReportSchedule["frequency"]): string {
  const now = today();
  if (f === "daily") return addDays(now, 1);
  if (f === "weekly") {
    let d = addDays(now, 1);
    while (fromISO(d).getDay() !== 1) d = addDays(d, 1);
    return d;
  }
  const n = fromISO(now);
  return `${n.getMonth() === 11 ? n.getFullYear() + 1 : n.getFullYear()}-${String(((n.getMonth() + 1) % 12) + 1).padStart(2, "0")}-01`;
}

export function ReportSchedules({ reports }: { reports: { value: string; label: string }[] }) {
  const { db, update, toast, user } = useStore();
  const [adding, setAdding] = useState(false);
  const list = db.settings.reportSchedules ?? [];
  const remove = (s: ReportSchedule) => {
    const before = db;
    update((d) => ({ ...d, settings: { ...d.settings, reportSchedules: (d.settings.reportSchedules ?? []).filter((x) => x.id !== s.id) } }), "Removed a scheduled report");
    toast(t("Schedule removed"), before);
  };
  return (
    <Card className="mt-4">
      <CardHeader title={t("Scheduled emails")} description={t("Send a report to people automatically")} icon={CalendarClock} actions={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>{t("Schedule a report")}</Button>} />
      <p className="border-b border-line bg-surface-2 px-5 py-2.5 text-xs text-ink-2">{t("Schedules are saved now. Emails start going out once Marina is connected to its server; until then use Download.")}</p>
      {list.length === 0 ? (
        <EmptyState icon={Mail} title={t("No scheduled reports")} body={t("For example: Marina performance to the owners on the 1st of every month.")} />
      ) : (
        <Table head={["Report", "When", "Recipients", "Next", "Actions"]}>
          {list.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{t(reports.find((r) => r.value === s.report)?.label) ?? s.report}<span className="block text-xs font-normal text-ink-3">{t("by")} {s.createdBy}</span></td>
              <td>{FREQ[s.frequency]}</td>
              <td className="max-w-72 truncate">{s.recipients.join(", ")}</td>
              <td className="whitespace-nowrap">{fmtDate(nextSend(s.frequency))} <Badge tone="outline">{t("Not sending yet")}</Badge></td>
              <td><IconButton icon={Trash} label={t("Remove schedule")} onClick={() => remove(s)} /></td>
            </tr>
          ))}
        </Table>
      )}
      {adding && <ScheduleForm reports={reports} by={user?.name ?? ""} onClose={() => setAdding(false)} />}
    </Card>
  );
}

function ScheduleForm({ reports, by, onClose }: { reports: { value: string; label: string }[]; by: string; onClose: () => void }) {
  const { update, toast, user } = useStore();
  const [f, setF] = useState({ report: reports[0].value, frequency: "monthly" as ReportSchedule["frequency"], recipients: user?.email ?? "" });
  const [error, setError] = useState("");
  const save = () => {
    const emails = f.recipients.split(/[,\s;]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return setError(t("Add at least one email address."));
    const bad = emails.find((e) => !/^\S+@\S+\.\S+$/.test(e));
    if (bad) return setError(t("{bad} doesn't look like an email address.", { bad: bad }));
    update((d) => ({ ...d, settings: { ...d.settings, reportSchedules: [...(d.settings.reportSchedules ?? []), { id: nextId("rs", d.settings.reportSchedules ?? []), report: f.report, frequency: f.frequency, recipients: emails, createdBy: by }] } }), "Scheduled a report email");
    toast(t("Report scheduled"));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Schedule a report")} description={t("Who gets which report, and how often.")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Save schedule")}</Button></>}>
      <div className="space-y-4">
        <Field label={t("Report")}>{(id) => <Select id={id} value={f.report} onChange={(e) => setF({ ...f, report: e.target.value })}>{reports.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}</Select>}</Field>
        <Field label={t("How often")}>{(id) => <Select id={id} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as ReportSchedule["frequency"] })}>{(Object.keys(FREQ) as ReportSchedule["frequency"][]).map((k) => <option key={k} value={k}>{FREQ[k]}</option>)}</Select>}</Field>
        <Field label={t("Send to")} hint={t("Separate email addresses with commas")} error={error}>{(id) => <Input id={id} value={f.recipients} onChange={(e) => { setF({ ...f, recipients: e.target.value }); setError(""); }} />}</Field>
      </div>
    </Modal>
  );
}
