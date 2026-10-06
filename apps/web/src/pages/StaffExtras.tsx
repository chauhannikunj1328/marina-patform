// Staff page panels fed by the Marina app: time off and swap requests, hours worked, messages.
import { useState } from "react";
import { CalendarClock, Check, Clock, MessagesSquare, Send, X } from "lucide-react";
import { useStore } from "@/data/store";
import { addDays, cx, DAYS, fmtDateTime, fmtDuration, fmtShort, fmtTime, fromISO, localDay, minutesWorked, nextId, today, type Staff, type StaffRequest } from "@marina/shared";
import { Avatar, Badge, Button, EmptyState, Select, Table, Tabs, Textarea } from "@/components/ui";

function RequestStatus({ r }: { r: StaffRequest }) {
  if (r.status === "approved") return <Badge tone="success" icon={Check}>Approved</Badge>;
  if (r.status === "declined") return <Badge tone="cancelled" icon={X}>Declined</Badge>;
  return <Badge tone="pending" icon={Clock}>Waiting</Badge>;
}

export function RequestsPanel({ staff, canEdit }: { staff: Staff[]; canEdit: boolean }) {
  const { db, ix, update, toast, user } = useStore();
  const [show, setShow] = useState<"pending" | "all">("pending");
  const ids = new Set(staff.map((s) => s.id));
  const all = db.requests.filter((r) => ids.has(r.staffId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = all.filter((r) => r.status === "pending");
  const rows = show === "pending" ? pending : all;
  const decide = (r: StaffRequest, status: "approved" | "declined") => {
    const before = db;
    const who = ix.staffMember(r.staffId);
    update(
      (d) => ({ ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, status, decidedBy: user?.name, decidedAt: new Date().toISOString() } : x)) }),
      { text: `${status === "approved" ? "Approved" : "Declined"} ${who?.name}'s ${r.kind === "leave" ? "time off" : "shift swap"} request`, to: "/staff?tab=requests", marinaId: who?.marinaId },
    );
    toast(`${status === "approved" ? "Approved" : "Declined"}. ${who?.name.split(" ")[0]} sees it in the staff app.`, before);
  };
  return (
    <>
      <div className="px-4 pt-3">
        <Tabs value={show} onChange={setShow} items={[{ value: "pending", label: "Waiting", count: pending.length }, { value: "all", label: "All requests", count: all.length }]} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title={show === "pending" ? "No requests waiting" : "No requests yet"} body="Staff ask for time off and shift swaps from the Marina app." />
      ) : (
        <Table head={["Staff member", "Request", "Reason", "Sent", "Status", "Actions"]}>
          {rows.map((r) => {
            const s = ix.staffMember(r.staffId);
            const cover = ix.staffMember(r.swapWithId);
            return (
              <tr key={r.id}>
                <td><div className="flex items-center gap-3"><Avatar name={s?.name ?? ""} /><div><p className="font-medium">{s?.name}</p><p className="text-xs text-ink-3">{s?.position} · {ix.marina(s?.marinaId ?? "")?.name}</p></div></div></td>
                <td>
                  {r.kind === "leave" ? <>Time off<span className="block text-xs text-ink-3">{fmtShort(r.start)}{r.end !== r.start && ` – ${fmtShort(r.end)}`}</span></>
                    : <>Shift swap<span className="block text-xs text-ink-3">{fmtShort(r.start)}, {s?.shift} shift · {cover?.name} covers</span></>}
                </td>
                <td className="max-w-64">{r.reason}</td>
                <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td><RequestStatus r={r} />{r.decidedBy && <span className="block text-xs text-ink-3">by {r.decidedBy}</span>}</td>
                <td className="whitespace-nowrap">
                  {canEdit && r.status === "pending" && (
                    <span className="inline-flex gap-2">
                      <Button size="sm" onClick={() => decide(r, "declined")}>Decline</Button>
                      <Button size="sm" variant="primary" onClick={() => decide(r, "approved")}>Approve</Button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}

export function HoursPanel({ staff }: { staff: Staff[] }) {
  const { db, ix } = useStore();
  const [offset, setOffset] = useState(0);
  const start = addDays(today(), -fromISO(today()).getDay() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rows = staff.filter((s) => db.timeEntries.some((e) => e.staffId === s.id && localDay(e.start) >= start && localDay(e.start) < addDays(start, 7)));
  const total = rows.reduce((t, s) => t + minutesWorked(db.timeEntries, s.id, start, addDays(start, 7)), 0);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="font-semibold">Week of {fmtShort(start)} <span className="font-normal text-ink-3">· {fmtDuration(total)} in total</span></p>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => setOffset(offset - 1)}>Previous</Button>
          <Button size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>This week</Button>
          <Button size="sm" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>Next</Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Clock} title="No hours recorded this week" body="Staff clock in and out from the Marina app." />
      ) : (
        <Table head={["Staff member", ...days.map((d, i) => `${DAYS[i]} ${Number(d.slice(8))}`), "Total"]}>
          {rows.map((s) => {
            const live = db.timeEntries.find((e) => e.staffId === s.id && !e.end);
            return (
              <tr key={s.id}>
                <td><p className="font-medium">{s.name}</p><p className="text-xs text-ink-3">{s.position} · {ix.marina(s.marinaId)?.name}</p>{live && <span className="mt-1 inline-block"><Badge tone="success">On the clock since {fmtTime(live.start)}</Badge></span>}</td>
                {days.map((d) => {
                  const m = minutesWorked(db.timeEntries, s.id, d, addDays(d, 1));
                  const first = db.timeEntries.filter((e) => e.staffId === s.id && localDay(e.start) === d).sort((a, b) => a.start.localeCompare(b.start));
                  return (
                    <td key={d} className={cx("num whitespace-nowrap", !m && "text-ink-3")} title={first.map((e) => `${fmtTime(e.start)} – ${e.end ? fmtTime(e.end) : "now"}`).join(", ")}>
                      {m ? fmtDuration(m) : "–"}
                    </td>
                  );
                })}
                <td className="num font-semibold whitespace-nowrap">{fmtDuration(minutesWorked(db.timeEntries, s.id, start, addDays(start, 7)))}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

export function MessagesPanel({ staff }: { staff: Staff[] }) {
  const { db, update, user } = useStore();
  const ids = new Set(staff.map((s) => s.id));
  const threads = staff
    .filter((s) => db.chat.some((m) => m.staffId === s.id))
    .map((s) => ({ s, msgs: db.chat.filter((m) => m.staffId === s.id) }))
    .sort((a, b) => b.msgs[b.msgs.length - 1].at.localeCompare(a.msgs[a.msgs.length - 1].at));
  const [openId, setOpenId] = useState<string | undefined>(threads[0]?.s.id);
  const [text, setText] = useState("");
  const current = staff.find((s) => s.id === openId);
  const msgs = db.chat.filter((m) => m.staffId === openId);

  const openThread = (id: string) => {
    setOpenId(id);
    setText("");
    if (db.chat.some((m) => m.staffId === id && m.fromStaff && !m.read)) update((d) => ({ ...d, chat: d.chat.map((m) => (m.staffId === id && m.fromStaff ? { ...m, read: true } : m)) }));
  };
  const send = () => {
    if (!text.trim() || !current) return;
    update((d) => ({ ...d, chat: [...d.chat.map((m) => (m.staffId === current.id && m.fromStaff ? { ...m, read: true } : m)), { id: nextId("ch", d.chat), staffId: current.id, fromStaff: false, by: user?.name ?? "Manager", text: text.trim(), at: new Date().toISOString(), read: false }] }));
    setText("");
  };

  return (
    <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[280px_1fr]">
      <div className="border-b border-line md:border-r md:border-b-0">
        <div className="px-4 py-3">
          <Select aria-label="Message a staff member" value="" onChange={(e) => e.target.value && openThread(e.target.value)}>
            <option value="">Message a staff member…</option>
            {staff.filter((s) => s.position !== "Marina Manager" && ids.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <ul>
          {threads.map(({ s, msgs }) => {
            const unread = msgs.filter((m) => m.fromStaff && !m.read).length;
            const last = msgs[msgs.length - 1];
            return (
              <li key={s.id}>
                <button onClick={() => openThread(s.id)} className={cx("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sidebar-hover cursor-pointer", openId === s.id && "bg-sidebar-hover")}>
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className={cx("truncate text-[13px]", unread ? "font-semibold" : "font-medium")}>{s.name}</span>{unread > 0 && <span className="rounded-full bg-green px-1.5 text-[11px] font-semibold text-white">{unread}</span>}</span>
                    <span className="block truncate text-xs text-ink-3">{last.fromStaff ? "" : "You: "}{last.text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {current ? (
        <div className="flex min-h-[480px] flex-col">
          <div className="border-b border-line px-4 py-3"><p className="font-semibold">{current.name}</p><p className="text-xs text-ink-3">{current.position} · {current.phone}</p></div>
          <div className="flex flex-1 flex-col justify-end gap-2 p-4">
            {msgs.length === 0 && <p className="text-center text-[13px] text-ink-3">No messages yet. They'll see yours in the staff app.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={cx("max-w-[75%]", m.fromStaff ? "self-start" : "self-end text-right")}>
                <p className={cx("inline-block rounded-2xl px-3.5 py-2 text-left text-[13px]", m.fromStaff ? "border border-line bg-surface" : "bg-primary text-on-primary")}>{m.text}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">{m.fromStaff ? "" : `${m.by} · `}{localDay(m.at) === today() ? fmtTime(m.at) : `${fmtShort(localDay(m.at))}, ${fmtTime(m.at)}`}{!m.fromStaff && m.read && " · Seen"}</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 border-t border-line p-3">
            <Textarea className="min-h-11 flex-1" aria-label={`Message ${current.name}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message ${current.name.split(" ")[0]}`} />
            <Button variant="primary" icon={Send} onClick={send} disabled={!text.trim()}>Send</Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={MessagesSquare} title="No conversations" body="Messages from staff in the Marina app show up here." />
      )}
    </div>
  );
}
