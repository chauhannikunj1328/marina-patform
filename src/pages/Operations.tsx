import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleAlert, CircleCheck, Clock, Eye, Pencil, Plus, Trash, UserCheck, UserMinus, Users, Warehouse, Wrench } from "lucide-react";
import { nextId, useStore } from "@/data/store";
import type { MaintenanceTask, Priority, Shift, Staff, TaskStatus } from "@/data/types";
import { addDays, fmtDate, fmtShort, fromISO, relative, today } from "@/lib/date";
import { cx } from "@/lib/format";
import { Avatar, Button, Card, ConfirmDialog, Field, IconButton, Input, Modal, PageHeader, SearchInput, Select, StatCard, Table, Tabs, Textarea, Toolbar, useDirty } from "@/components/ui";
import { ActiveBadge, PriorityBadge, TaskBadge } from "@/components/status";

const SHIFT_HOURS: Record<Shift, string> = { Morning: "6 AM – 2 PM", Day: "9 AM – 5 PM", Evening: "2 PM – 10 PM", Night: "10 PM – 6 AM" };
const SHIFTS = Object.keys(SHIFT_HOURS) as Shift[];
const DEPARTMENTS: Staff["department"][] = ["Operations", "Maintenance", "Front Desk", "Security"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StaffForm({ member, onClose }: { member?: Staff; onClose: () => void }) {
  const { db, scope, update, toast } = useStore();
  const [f, setF] = useState<Omit<Staff, "id">>(
    () => member ?? { name: "", email: "", phone: "", position: "", department: "Operations", marinaId: scope[0], status: "active", shift: "Day", daysOff: [0, 6], hired: today() },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useDirty(f);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter a name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email.";
    else if (db.staff.some((s) => s.email.toLowerCase() === f.email.toLowerCase() && s.id !== member?.id)) e.email = "Someone already uses this email.";
    if (!f.position.trim()) e.position = "Enter a job title.";
    if (f.daysOff.length > 4) e.daysOff = "Choose at most 4 days off.";
    setErrors(e);
    if (Object.keys(e).length) return;
    update(
      (d) => (member ? { ...d, staff: d.staff.map((s) => (s.id === member.id ? { ...s, ...f } : s)) } : { ...d, staff: [...d.staff, { ...f, id: nextId("s", d.staff) }] }),
      { text: `${member ? "Updated" : "Added"} staff member ${f.name} (${f.position})`, marinaId: f.marinaId },
    );
    toast(member ? `${f.name} updated` : `${f.name} added to staff`);
    onClose();
  };
  return (
    <Modal open wide dirty={dirty} onClose={onClose} title={member ? `Edit ${member.name}` : "Add staff member"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{member ? "Save changes" : "Add staff member"}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Job title" error={errors.position}>{(id) => <Input id={id} value={f.position} onChange={(e) => set("position", e.target.value)} placeholder="e.g. Dock Hand" />}</Field>
        <Field label="Email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} value={f.phone} onChange={(e) => set("phone", e.target.value)} />}</Field>
        <Field label="Marina">{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}>{db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label="Department">{(id) => <Select id={id} value={f.department} onChange={(e) => set("department", e.target.value as Staff["department"])}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>}</Field>
        <Field label="Shift">{(id) => <Select id={id} value={f.shift} onChange={(e) => set("shift", e.target.value as Shift)}>{SHIFTS.map((s) => <option key={s} value={s}>{s} · {SHIFT_HOURS[s]}</option>)}</Select>}</Field>
        <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(e) => set("status", e.target.value as Staff["status"])}><option value="active">Active</option><option value="on-leave">On leave</option></Select>}</Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-medium">Regular days off</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = f.daysOff.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => set("daysOff", on ? f.daysOff.filter((x) => x !== i) : [...f.daysOff, i].sort())}
                  className={cx("w-12 rounded-full border py-1.5 text-xs font-semibold cursor-pointer", on ? "border-transparent bg-primary text-on-primary" : "border-line text-ink-2 hover:bg-sidebar")}>
                  {d}
                </button>
              );
            })}
          </div>
          {errors.daysOff && <p className="mt-1.5 text-xs font-medium">⚠ {errors.daysOff}</p>}
        </fieldset>
      </div>
    </Modal>
  );
}

function WeekSchedule({ staff }: { staff: Staff[] }) {
  const { ix } = useStore();
  const [offset, setOffset] = useState(0);
  const start = addDays(today(), -fromISO(today()).getDay() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const working = (s: Staff, i: number) => s.status === "active" && !s.daysOff.includes(i);
  const sorted = [...staff].sort((a, b) => SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift) || a.name.localeCompare(b.name));
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-semibold">Week of {fmtDate(days[0])}</p>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => setOffset(offset - 1)}>Previous</Button>
          <Button size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>This week</Button>
          <Button size="sm" onClick={() => setOffset(offset + 1)}>Next</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-y border-line bg-surface-2 text-left text-xs text-ink-2">
              <th className="px-4 py-2 font-medium">Staff member</th>
              {days.map((d, i) => (
                <th key={d} className={cx("px-2 py-2 text-center font-medium", d === today() && "text-ink")}>{DAYS[i]} {Number(d.slice(8))}{d === today() && " · today"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-b border-line">
                <td className="px-4 py-2"><span className="font-medium">{s.name}</span><span className="block text-xs text-ink-3">{s.position} · {ix.marina(s.marinaId)?.name}</span></td>
                {days.map((d, i) => (
                  <td key={d} className="px-1 py-1.5 text-center">
                    {s.status !== "active" ? (
                      <span className="block rounded-full bg-st-neutral-bg py-1.5 text-xs font-medium text-st-neutral-fg">Leave</span>
                    ) : working(s, i) ? (
                      <span className="block rounded-full bg-teal-strong py-1.5 text-xs font-semibold text-on-teal-strong" title={SHIFT_HOURS[s.shift]}>{s.shift}</span>
                    ) : (
                      <span className="block rounded-full border border-dashed border-line-strong py-1.5 text-xs text-ink-3">Off</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-2 text-xs">
              <td className="px-4 py-2 font-medium">Working</td>
              {days.map((d, i) => {
                const n = staff.filter((s) => working(s, i)).length;
                const gaps = SHIFTS.filter((sh) => !staff.some((s) => s.shift === sh && working(s, i)));
                return (
                  <td key={d} className="px-2 py-2 text-center" title={gaps.length ? `No one on: ${gaps.join(", ")}` : "All shifts covered"}>
                    <span className="font-semibold">{n}</span>
                    {gaps.length > 0 && <span className="block text-[11px] text-ink-2">⚠ {gaps.length} shift gap{gaps.length > 1 ? "s" : ""}</span>}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function StaffPage() {
  const { db, ix, scope, update, toast, can } = useStore();
  const canEditStaff = can("staff") !== "view";
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"directory" | "schedule" | "shifts">("directory");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [marinaId, setMarinaId] = useState("all");
  const [editing, setEditing] = useState<Staff | "new" | undefined>();
  const [removing, setRemoving] = useState<Staff | undefined>();
  const [leaveOnly, setLeaveOnly] = useState(false);
  const staff = db.staff.filter((s) => scope.includes(s.marinaId) && (marinaId === "all" || s.marinaId === marinaId));
  const rows = staff.filter((s) => {
    if (leaveOnly && s.status !== "on-leave") return false;
    const t = q.trim().toLowerCase();
    return !t || s.name.toLowerCase().includes(t) || s.email.toLowerCase().includes(t) || s.position.toLowerCase().includes(t);
  });
  const active = staff.filter((s) => s.status === "active");
  const filters = (q ? 1 : 0) + (marinaId !== "all" ? 1 : 0) + (leaveOnly ? 1 : 0);
  const todayIdx = fromISO(today()).getDay();
  const onToday = active.filter((s) => !s.daysOff.includes(todayIdx));

  return (
    <>
      <PageHeader title="Staff" description="Team members, roles and weekly schedules" actions={canEditStaff && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add staff member</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="Total staff" icon={Users} value={staff.length} active={tab === "directory" && !leaveOnly} onClick={() => { setTab("directory"); setLeaveOnly(false); }} />
        <StatCard label="Working today" icon={UserCheck} value={onToday.length} sub={`of ${active.length} active`} active={tab === "schedule"} onClick={() => setTab("schedule")} />
        <StatCard label="On leave" icon={UserMinus} value={staff.length - active.length} active={tab === "directory" && leaveOnly} onClick={() => { setTab("directory"); setLeaveOnly(!leaveOnly); }} />
        <StatCard active={tab === "shifts"} onClick={() => setTab("shifts")} label="Shifts covered today" icon={Clock} value={`${new Set(onToday.map((s) => s.shift)).size} / 4`} sub="Morning, Day, Evening, Night" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "directory", label: "Directory" }, { value: "schedule", label: "Weekly schedule" }, { value: "shifts", label: "Shift coverage" }]} />
      <Card>
        <Toolbar active={filters} onClear={() => { setQ(""); setMarinaId("all"); setLeaveOnly(false); }}>
          {tab === "directory" && <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or role" />}
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Toolbar>
        {tab === "directory" && (
          <Table head={["Name", "Role", "Marina", "Shift", "Days off", "Status", "Actions"]} empty={rows.length === 0}>
            {rows.map((s) => (
              <tr key={s.id} className={canEditStaff ? "cursor-pointer" : undefined} onClick={canEditStaff ? () => setEditing(s) : undefined}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="min-w-0"><p className="font-medium">{s.name}</p><p className="truncate text-xs text-ink-3">{s.email}{s.phone && ` · ${s.phone}`}</p></div>
                  </div>
                </td>
                <td>{s.position}<span className="block text-xs text-ink-3">{s.department}</span></td>
                <td>{ix.marina(s.marinaId)?.name}</td>
                <td className="whitespace-nowrap">{s.shift}<span className="block text-xs text-ink-3">{SHIFT_HOURS[s.shift]}</span></td>
                <td className="whitespace-nowrap">{s.daysOff.map((d) => DAYS[d]).join(", ") || "None"}</td>
                <td><ActiveBadge status={s.status} /></td>
                <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {canEditStaff && (
                    <>
                      <IconButton icon={Pencil} label={`Edit ${s.name}`} onClick={() => setEditing(s)} />
                      <IconButton icon={Trash} label={`Remove ${s.name}`} onClick={() => setRemoving(s)} />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {tab === "schedule" && <WeekSchedule staff={staff} />}
        {tab === "shifts" && (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            {SHIFTS.map((sh) => {
              const on = staff.filter((s) => s.shift === sh);
              const today_ = on.filter((s) => s.status === "active" && !s.daysOff.includes(todayIdx));
              return (
                <div key={sh} className="rounded-md border border-line">
                  <div className="border-b border-line px-4 py-3">
                    <p className="font-semibold">{sh}</p>
                    <p className="text-xs text-ink-3">{SHIFT_HOURS[sh]} · {today_.length} working today</p>
                  </div>
                  <ul className="p-2">
                    {on.length === 0 && <li className="flex items-center gap-2 px-2 py-3 text-[13px] text-ink-2"><CircleAlert className="size-4" aria-hidden /> No one assigned</li>}
                    {on.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 rounded px-2 py-2">
                        <span className="min-w-0"><span className="block truncate text-[13px] font-medium">{s.name}</span><span className="block truncate text-xs text-ink-3">{s.position} · {ix.marina(s.marinaId)?.name}</span></span>
                        {s.status !== "active" ? <ActiveBadge status={s.status} /> : s.daysOff.includes(todayIdx) && <span className="text-xs text-ink-3">Off today</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {editing && <StaffForm member={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(undefined)}
        title={`Remove ${removing?.name}?`}
        body="They will be removed from the staff list and unassigned from any open work orders."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!removing) return;
          const before = db;
          update((d) => ({ ...d, staff: d.staff.filter((s) => s.id !== removing.id), tasks: d.tasks.map((t) => (t.assigneeId === removing.id ? { ...t, assigneeId: undefined } : t)) }), { text: `Removed staff member ${removing.name}`, marinaId: removing.marinaId });
          toast(`${removing.name} removed`, before);
        }}
      />
    </>
  );
}

function TaskForm({ task, onClose }: { task?: MaintenanceTask; onClose: () => void }) {
  const { db, scope, update, toast } = useStore();
  const [f, setF] = useState(() => ({
    title: task?.title ?? "",
    marinaId: task?.marinaId ?? scope[0],
    berthId: task?.berthId ?? "",
    assigneeId: task?.assigneeId ?? "",
    priority: task?.priority ?? ("medium" as Priority),
    status: task?.status ?? ("open" as TaskStatus),
    due: task?.due ?? addDays(today(), 7),
    takeOut: false,
  }));
  const [error, setError] = useState("");
  const dirty = useDirty(f);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v, ...(k === "marinaId" ? { berthId: "", assigneeId: "" } : {}) }));
  const save = () => {
    if (!f.title.trim()) return setError("Describe the work needed.");
    update((d) => {
      const data = { title: f.title.trim(), marinaId: f.marinaId, berthId: f.berthId || undefined, assigneeId: f.assigneeId || undefined, priority: f.priority, status: f.status, due: f.due };
      const tasks = task
        ? d.tasks.map((t) => (t.id === task.id ? { ...t, ...data } : t))
        : [...d.tasks, { ...data, id: nextId("t", d.tasks), code: `WO-${String(d.tasks.length + 1).padStart(3, "0")}`, created: today(), notes: [] }];
      const berths = f.takeOut && f.berthId ? d.berths.map((b) => (b.id === f.berthId ? { ...b, underMaintenance: true } : b)) : d.berths;
      return { ...d, tasks, berths };
    }, { text: `${task ? "Updated" : "Created"} work order: ${f.title.trim()}`, marinaId: f.marinaId });
    toast(task ? "Work order updated" : "Work order created");
    onClose();
  };
  return (
    <Modal open dirty={dirty} onClose={onClose} title={task ? `Edit ${task.code}` : "New work order"} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{task ? "Save changes" : "Create work order"}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Work needed" error={error}>{(id) => <Input id={id} value={f.title} onChange={(e) => { set("title", e.target.value); setError(""); }} placeholder="e.g. Repair shore power pedestal" />}</Field></div>
        <Field label="Marina">{(id) => <Select id={id} value={f.marinaId} onChange={(e) => set("marinaId", e.target.value)}>{db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
        <Field label="Berth (optional)">{(id) => <Select id={id} value={f.berthId} onChange={(e) => set("berthId", e.target.value)}><option value="">Whole marina / facility</option>{db.berths.filter((b) => b.marinaId === f.marinaId).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select>}</Field>
        <Field label="Assign to">{(id) => <Select id={id} value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}><option value="">Unassigned</option>{db.staff.filter((s) => s.marinaId === f.marinaId && s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.name} · {s.position}</option>)}</Select>}</Field>
        <Field label="Due date">{(id) => <Input id={id} type="date" value={f.due} onChange={(e) => set("due", e.target.value)} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={f.priority} onChange={(e) => set("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>}</Field>
        <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="open">Open</option><option value="in-progress">In progress</option><option value="done">Done</option></Select>}</Field>
        {!task && f.berthId && (
          <label className="flex items-center gap-2 text-[13px] sm:col-span-2"><input type="checkbox" checked={f.takeOut} onChange={(e) => set("takeOut", e.target.checked)} className="size-4 accent-[var(--primary)]" /> Take this berth out of service until the work is done</label>
        )}
      </div>
    </Modal>
  );
}

function useCompleteTask() {
  const { db, update, toast } = useStore();
  return (t: MaintenanceTask) => {
    const before = db;
    update(
      (d) => ({
        ...d,
        tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: "done" } : x)),
        // Return the berth to service when its last open work order is done.
        berths: d.berths.map((b) => (b.id === t.berthId && !d.tasks.some((x) => x.id !== t.id && x.berthId === b.id && x.status !== "done") ? { ...b, underMaintenance: false } : b)),
      }),
      { text: `Completed work order ${t.code}: ${t.title}`, to: `/maintenance?open=${t.id}`, marinaId: t.marinaId },
    );
    toast(`${t.code} marked as done`, before);
  };
}

function TaskDetail({ task, onClose, onEdit }: { task: MaintenanceTask; onClose: () => void; onEdit: () => void }) {
  const { db, ix, user, update, toast } = useStore();
  const complete = useCompleteTask();
  const [note, setNote] = useState("");
  const t = db.tasks.find((x) => x.id === task.id) ?? task;
  const berth = t.berthId ? ix.berth(t.berthId) : undefined;
  const addNote = () => {
    if (!note.trim()) return;
    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, notes: [...x.notes, { at: today(), by: user?.name ?? "Staff", text: note.trim() }] } : x)) }), { text: `Added a note to ${t.code}`, to: `/maintenance?open=${t.id}`, marinaId: t.marinaId });
    setNote("");
    toast("Note added");
  };
  const setStatus = (status: TaskStatus) => {
    if (status === "done") return complete(t);
    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) }), { text: `${t.code} moved to ${status.replace("-", " ")}`, to: `/maintenance?open=${t.id}`, marinaId: t.marinaId });
  };
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={t.title}
      description={`${t.code} · opened ${fmtDate(t.created)}`}
      footer={
        <>
          <Button icon={Pencil} onClick={onEdit}>Edit</Button>
          {t.status === "open" && <Button onClick={() => setStatus("in-progress")}>Start work</Button>}
          {t.status !== "done" && <Button variant="primary" icon={CircleCheck} onClick={() => setStatus("done")}>Mark as done</Button>}
          {t.status === "done" && <Button onClick={() => setStatus("open")}>Reopen</Button>}
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Status</p><div className="mt-1"><TaskBadge status={t.status} /></div></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Priority</p><div className="mt-1"><PriorityBadge priority={t.priority} /></div></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Due</p><p className="font-semibold">{fmtShort(t.due)}</p><p className="text-xs text-ink-3">{relative(t.due)}</p></div>
        <div className="rounded-md bg-surface-2 p-3"><p className="text-xs text-ink-3">Assigned to</p><p className="font-semibold">{ix.staffMember(t.assigneeId)?.name ?? "Unassigned"}</p></div>
      </div>
      <p className="mb-5 text-[13px]">
        <span className="text-ink-3">Location: </span>{ix.marina(t.marinaId)?.name}{berth ? `, berth ${berth.code}` : ", facility"}
        {berth?.underMaintenance && <span className="ml-2 text-ink-3">(berth out of service)</span>}
      </p>
      <h3 className="mb-2 text-[13px] font-semibold">Notes</h3>
      {t.notes.length === 0 ? (
        <p className="mb-3 text-[13px] text-ink-3">No notes yet.</p>
      ) : (
        <ol className="mb-3 space-y-3 border-l-2 border-line pl-4">
          {t.notes.map((n, i) => (
            <li key={i} className="text-[13px]">
              <p>{n.text}</p>
              <p className="text-xs text-ink-3">{n.by} · {fmtDate(n.at)}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1"><Field label="Add a note">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Parts arrived, repair scheduled for Monday" />}</Field></div>
        <Button onClick={addNote} disabled={!note.trim()}>Add note</Button>
      </div>
    </Modal>
  );
}

export function Maintenance() {
  const { db, ix, scope, can } = useStore();
  const canEditTasks = can("maintenance") !== "view";
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<"active" | TaskStatus | "all">("active");
  const [marinaId, setMarinaId] = useState("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTask | "new" | undefined>();
  const complete = useCompleteTask();
  const now = today();
  const openId = params.get("open");
  const opened = openId ? db.tasks.find((t) => t.id === openId && scope.includes(t.marinaId)) : undefined;
  const setOpen = (id?: string) => setParams((p) => { if (id) p.set("open", id); else p.delete("open"); return p; });

  const tasks = useMemo(() => db.tasks.filter((t) => scope.includes(t.marinaId) && (marinaId === "all" || t.marinaId === marinaId)), [db.tasks, scope, marinaId]);
  const rows = tasks
    .filter((t) => (status === "all" ? true : status === "active" ? t.status !== "done" : t.status === status))
    .filter((t) => priority === "all" || t.priority === priority)
    .filter((t) => !overdueOnly || (t.status !== "done" && t.due < now))
    .sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority) || a.due.localeCompare(b.due));
  const open = tasks.filter((t) => t.status !== "done");
  const filters = (status !== "active" ? 1 : 0) + (marinaId !== "all" ? 1 : 0) + (priority !== "all" ? 1 : 0) + (overdueOnly ? 1 : 0);

  return (
    <>
      <PageHeader title="Maintenance" description="Work orders for berths, docks and facilities" actions={canEditTasks && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>New work order</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 min-[1400px]:grid-cols-4">
        <StatCard label="Open work orders" icon={Wrench} value={open.length} active={status === "active" && priority === "all" && !overdueOnly} onClick={() => { setStatus("active"); setPriority("all"); setOverdueOnly(false); }} />
        <StatCard label="High priority" icon={CircleAlert} value={open.filter((t) => t.priority === "high").length} active={priority === "high"} onClick={() => { setStatus("active"); setPriority(priority === "high" ? "all" : "high"); }} />
        <StatCard label="Overdue" icon={Clock} value={open.filter((t) => t.due < now).length} active={overdueOnly} onClick={() => { setStatus("active"); setOverdueOnly(!overdueOnly); }} />
        <StatCard label="Berths out of service" icon={Warehouse} value={ix.berthsIn(marinaId === "all" ? scope : [marinaId]).filter((b) => b.underMaintenance).length} to="/berths?status=maintenance" />
      </div>
      <Card>
        <Toolbar active={filters} onClear={() => { setStatus("active"); setMarinaId("all"); setPriority("all"); setOverdueOnly(false); }}>
          <Select aria-label="Filter by marina" value={marinaId} onChange={(e) => setMarinaId(e.target.value)} className="sm:w-56">
            <option value="all">All marinas</option>
            {db.marinas.filter((m) => scope.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-48">
            <option value="active">Open & in progress</option>
            <option value="open">Open</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </Select>
          <Select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="sm:w-40">
            <option value="all">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Toolbar>
        <Table head={["Work order", "Location", "Assigned to", "Priority", "Due", "Status", "Actions"]} empty={rows.length === 0}>
          {rows.map((t) => {
            const overdue = t.status !== "done" && t.due < now;
            return (
              <tr key={t.id} className="cursor-pointer hover:bg-row-hover" onClick={() => setOpen(t.id)}>
                <td><span className="font-medium">{t.title}</span><span className="block text-xs text-ink-3">{t.code} · opened {fmtShort(t.created)}{t.notes.length > 0 && ` · ${t.notes.length} note${t.notes.length > 1 ? "s" : ""}`}</span></td>
                <td>{ix.marina(t.marinaId)?.name}<span className="block text-xs text-ink-3">{t.berthId ? `Berth ${ix.berth(t.berthId)?.code}` : "Facility"}</span></td>
                <td>{ix.staffMember(t.assigneeId)?.name ?? <span className="text-ink-3">Unassigned</span>}</td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td className="whitespace-nowrap">{fmtDate(t.due)}{overdue && <span className="block text-xs font-semibold">Overdue</span>}</td>
                <td><TaskBadge status={t.status} /></td>
                <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Eye} label={`Open ${t.code}`} onClick={() => setOpen(t.id)} />
                  {canEditTasks && t.status !== "done" && <IconButton icon={CircleCheck} label={`Mark ${t.code} as done`} onClick={() => complete(t)} />}
                  {canEditTasks && <IconButton icon={Pencil} label={`Edit ${t.code}`} onClick={() => setEditing(t)} />}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {opened && !editing && <TaskDetail task={opened} onClose={() => setOpen()} onEdit={() => setEditing(opened)} />}
      {editing && <TaskForm task={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}
