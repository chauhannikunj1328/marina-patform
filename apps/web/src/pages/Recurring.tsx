// Maintenance › Recurring jobs: routine work that repeats. Each plan creates its work order a week
// before it's due; finishing it isn't needed for the next one to appear on time.
import { useState } from "react";
import { Pause, Pencil, Play, Plus, Repeat } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import { t, addDays, fmtDate, PLAN_LEAD_DAYS, RECURRENCE_LABEL, today, withRecurringTasks, type MaintenancePlan, type Priority, type Recurrence } from "@marina/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Field, IconButton, Input, Modal, Select, Table, useDirty } from "@/components/ui";
import { PriorityBadge } from "@/components/status";

export function RecurringPlans({ ids, canEdit }: { ids: string[]; canEdit: boolean }) {
  const { db, ix, update, toast } = useStore();
  const [editing, setEditing] = useState<MaintenancePlan | "new" | undefined>();
  const plans = (db.maintenancePlans ?? []).filter((p) => ids.includes(p.marinaId)).sort((a, b) => Number(b.active) - Number(a.active) || a.nextDue.localeCompare(b.nextDue));
  const toggle = (p: MaintenancePlan) => {
    const before = db;
    update((d) => withRecurringTasks({ ...d, maintenancePlans: (d.maintenancePlans ?? []).map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)) }), { text: `${p.active ? "Paused" : "Resumed"} recurring job: ${p.title}`, to: "/maintenance", marinaId: p.marinaId });
    toast(p.active ? `${p.title} paused` : `${p.title} resumed`, before);
  };
  return (
    <Card className="mt-4">
      <CardHeader title={t("Recurring jobs")} description={t("Routine work. Each work order is created {PLANLEADDAYS} days before it's due.", { PLANLEADDAYS: PLAN_LEAD_DAYS })} icon={Repeat} actions={canEdit && <Button size="sm" icon={Plus} onClick={() => setEditing("new")}>{t("New recurring job")}</Button>} />
      {plans.length === 0 ? (
        <EmptyState icon={Repeat} title={t("No recurring jobs")} body={t("For example: clean the pump-out station every week, inspect pilings every month.")} />
      ) : (
        <Table head={["Job", "Location", "How often", "Next due", "Assigned to", "Priority", "Actions"]}>
          {plans.map((p) => (
            <tr key={p.id} className={p.active ? undefined : "text-ink-3"}>
              <td className="font-medium">{p.title}{!p.active && <span className="ms-2"><Badge tone="muted">{t("Paused")}</Badge></span>}</td>
              <td>{ix.marina(p.marinaId)?.name}<span className="block text-xs text-ink-3">{p.berthId ? t("Berth {code}", { code: ix.berth(p.berthId)?.code }) : t("Facility")}</span></td>
              <td>{t(RECURRENCE_LABEL[p.every])}</td>
              <td className="whitespace-nowrap">{p.active ? fmtDate(p.nextDue) : "—"}</td>
              <td>{ix.staffMember(p.assigneeId)?.name ?? <span className="text-ink-3">{t("Unassigned")}</span>}</td>
              <td><PriorityBadge priority={p.priority} /></td>
              <td className="whitespace-nowrap">
                {canEdit && (
                  <>
                    <IconButton icon={Pencil} label={t("Edit {title}", { title: p.title })} onClick={() => setEditing(p)} />
                    <IconButton icon={p.active ? Pause : Play} label={`${p.active ? "Pause" : "Resume"} ${p.title}`} onClick={() => toggle(p)} />
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <PlanForm plan={editing === "new" ? undefined : editing} ids={ids} onClose={() => setEditing(undefined)} />}
    </Card>
  );
}

function PlanForm({ plan, ids, onClose }: { plan?: MaintenancePlan; ids: string[]; onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const [f, setF] = useState({ title: plan?.title ?? "", marinaId: plan?.marinaId ?? ids[0], berthId: plan?.berthId ?? "", every: plan?.every ?? ("month" as Recurrence), nextDue: plan?.nextDue ?? addDays(today(), 14), priority: plan?.priority ?? ("medium" as Priority), assigneeId: plan?.assigneeId ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setErrors({}); };
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = t("Say what the job is.");
    if (f.nextDue < today()) e.nextDue = t("Pick today or later.");
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { title: f.title.trim(), marinaId: f.marinaId, berthId: f.berthId || undefined, every: f.every, nextDue: f.nextDue, priority: f.priority, assigneeId: f.assigneeId || undefined };
    update(
      (d) => withRecurringTasks({
        ...d,
        maintenancePlans: plan ? (d.maintenancePlans ?? []).map((x) => (x.id === plan.id ? { ...x, ...data } : x)) : [...(d.maintenancePlans ?? []), { id: nextId("mp", d.maintenancePlans ?? []), active: true, ...data }],
      }),
      { text: `${plan ? "Updated" : "Added"} recurring job: ${data.title} (${RECURRENCE_LABEL[data.every].toLowerCase()})`, to: "/maintenance", marinaId: data.marinaId },
    );
    toast(plan ? t("Recurring job saved") : t("Recurring job added. The first work order appears {v}.", { v: data.nextDue <= addDays(today(), 7) ? "now" : `on ${fmtDate(addDays(data.nextDue, -7))}` }));
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={plan ? t("Edit recurring job") : t("New recurring job")} footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{plan ? t("Save") : t("Add job")}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label={t("Job")} error={errors.title}>{(id) => <Input id={id} value={f.title} placeholder={t("e.g. Clean pump-out station")} onChange={(e) => set({ title: e.target.value })} />}</Field></div>
        <Field label={t("Marina")}>{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set({ marinaId: e.target.value, berthId: "", assigneeId: "" })}>{db.marinas.filter((m) => ids.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label={t("Berth (optional)")}>{(id) => <Select id={id} value={f.berthId} onChange={(e) => set({ berthId: e.target.value })}><option value="">{t("Facility, not a berth")}</option>{ix.berthsIn([f.marinaId]).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select>}</Field>
        <Field label={t("How often")}>{(id) => <Select id={id} value={f.every} onChange={(e) => set({ every: e.target.value as Recurrence })}>{(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => <option key={r} value={r}>{t(RECURRENCE_LABEL[r])}</option>)}</Select>}</Field>
        <Field label={t("Next due")} error={errors.nextDue}>{(id) => <Input id={id} type="date" min={today()} value={f.nextDue} onChange={(e) => set({ nextDue: e.target.value })} />}</Field>
        <Field label={t("Priority")}>{(id) => <Select id={id} value={f.priority} onChange={(e) => set({ priority: e.target.value as Priority })}><option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option></Select>}</Field>
        <Field label={t("Assign to")}>{(id) => <Select id={id} value={f.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}><option value="">{t("Unassigned")}</option>{db.staff.filter((s) => s.marinaId === f.marinaId && s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.name} · {s.position}</option>)}</Select>}</Field>
      </div>
    </Modal>
  );
}
