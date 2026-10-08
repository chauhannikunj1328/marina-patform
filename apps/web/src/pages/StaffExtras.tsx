// Staff page panels fed by the Marina Staff app: time off and swap requests, hours worked, messages.
import { useState } from "react";
import { CalendarClock, Check, Clock, Download, MessagesSquare, Send, X } from "lucide-react";
import { downloadCsv, downloadWorkbook } from "@/lib/csv";
import { useStore } from "@/data/store";
import { t, addDays, cx, weekday, fmtDateTime, fmtDuration, fmtShort, fmtTime, fromISO, hourlyRateOf, localDay, minutesWorked, money2, nextId, today, weeklyPay, type Staff, type StaffRequest } from "@marina/shared";
import { Avatar, Badge, Button, EmptyState, Select, Table, Tabs, Textarea } from "@/components/ui";

function RequestStatus({ r }: { r: StaffRequest }) {
  if (r.status === "approved") return <Badge tone="success" icon={Check}>{t("Approved")}</Badge>;
  if (r.status === "declined") return <Badge tone="cancelled" icon={X}>{t("Declined")}</Badge>;
  return <Badge tone="pending" icon={Clock}>{t("Waiting")}</Badge>;
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
    toast(t("{v}. {v2} sees it in the staff app.", { v: status === "approved" ? t("Approved") : t("Declined"), v2: who?.name.split(" ")[0] }), before);
  };
  return (
    <>
      <div className="px-4 pt-3">
        <Tabs value={show} onChange={setShow} items={[{ value: "pending", label: t("Waiting"), count: pending.length }, { value: "all", label: t("All requests"), count: all.length }]} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title={show === "pending" ? t("No requests waiting") : t("No requests yet")} body={t("Staff ask for time off and shift swaps from the Marina Staff app.")} />
      ) : (
        <Table head={["Staff member", "Request", "Reason", "Sent", "Status", "Actions"]}>
          {rows.map((r) => {
            const s = ix.staffMember(r.staffId);
            const cover = ix.staffMember(r.swapWithId);
            return (
              <tr key={r.id}>
                <td><div className="flex items-center gap-3"><Avatar name={s?.name ?? ""} /><div><p className="font-medium">{s?.name}</p><p className="text-xs text-ink-3">{t(s?.position)} · {ix.marina(s?.marinaId ?? "")?.name}</p></div></div></td>
                <td>
                  {r.kind === "leave" ? <>{t("Time off")}<span className="block text-xs text-ink-3">{fmtShort(r.start)}{r.end !== r.start && ` – ${fmtShort(r.end)}`}</span></>
                    : <>{t("Shift swap")}<span className="block text-xs text-ink-3">{fmtShort(r.start)}, {t(s?.shift)} {t("shift ·")} {cover?.name} {t("covers")}</span></>}
                </td>
                <td className="max-w-64">{r.reason}</td>
                <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td><RequestStatus r={r} />{r.decidedBy && <span className="block text-xs text-ink-3">{t("by")} {r.decidedBy}</span>}</td>
                <td className="whitespace-nowrap">
                  {canEdit && r.status === "pending" && (
                    <span className="inline-flex gap-2">
                      <Button size="sm" onClick={() => decide(r, "declined")}>{t("Decline")}</Button>
                      <Button size="sm" variant="primary" onClick={() => decide(r, "approved")}>{t("Approve")}</Button>
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

export function HoursPanel({ staff, canEdit }: { staff: Staff[]; canEdit: boolean }) {
  const { db, ix, update, toast, user } = useStore();
  const [offset, setOffset] = useState(-1);
  const start = addDays(today(), -fromISO(today()).getDay() + offset * 7);
  const weekEnd = addDays(start, 7);
  const over = weekEnd <= today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rows = staff.filter((s) => db.timeEntries.some((e) => e.staffId === s.id && localDay(e.start) >= start && localDay(e.start) < weekEnd));
  const minutes = (s: Staff) => minutesWorked(db.timeEntries, s.id, start, weekEnd);
  const approval = (s: Staff) => (db.timesheetApprovals ?? []).find((a) => a.staffId === s.id && a.weekStart === start);
  const total = rows.reduce((t, s) => t + minutes(s), 0);
  const pay = (s: Staff) => weeklyPay(minutes(s), hourlyRateOf(s));
  const pending = rows.filter((s) => { const a = approval(s); return !a || a.minutes !== Math.round(minutes(s)); });

  const approve = (list: Staff[]) => {
    const before = db;
    update(
      (d) => ({
        ...d,
        timesheetApprovals: [
          ...(d.timesheetApprovals ?? []).filter((a) => !(a.weekStart === start && list.some((s) => s.id === a.staffId))),
          ...list.map((s, i) => ({ id: `ts-${start}-${s.id}-${i}`, staffId: s.id, weekStart: start, minutes: Math.round(minutes(s)), approvedBy: user?.name ?? "Manager", at: new Date().toISOString() })),
        ],
      }),
      { text: list.length === 1 ? `Approved ${list[0].name}'s hours for the week of ${fmtShort(start)}` : `Approved ${list.length} timesheets for the week of ${fmtShort(start)}`, to: "/staff?tab=hours", marinaId: list.length === 1 ? list[0].marinaId : undefined },
    );
    toast(list.length === 1 ? t("{v}'s hours approved", { v: list[0].name.split(" ")[0] }) : t("{n} timesheets approved", { n: list.length }), before);
  };

  const payrollSheet = () => ({
    name: `Payroll ${start}`,
    head: ["Staff member", "Position", "Marina", "Hours", "Regular hours", "Overtime hours", "Hourly rate", "Gross pay", "Approved by"],
    rows: rows.map((s) => {
      const p = pay(s);
      return [s.name, s.position, ix.marina(s.marinaId)?.name ?? "", Math.round((minutes(s) / 60) * 100) / 100, Math.round(p.regular * 100) / 100, Math.round(p.overtime * 100) / 100, hourlyRateOf(s), p.gross, approval(s)?.approvedBy ?? "Not approved"];
    }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="font-semibold">{t("Week of")} {fmtShort(start)} <span className="font-normal text-ink-3">· {fmtDuration(total)} · {money2(rows.reduce((t, s) => t + pay(s).gross, 0), "USD")} {t("gross")}</span></p>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" onClick={() => setOffset(offset - 1)}>{t("Previous")}</Button>
          <Button size="sm" onClick={() => setOffset(-1)} disabled={offset === -1}>{t("Last week")}</Button>
          <Button size="sm" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>{t("Next")}</Button>
          <Button size="sm" icon={Download} disabled={!rows.length} onClick={() => { const p = payrollSheet(); downloadCsv(`payroll-${start}.csv`, p.head, p.rows); }}>{t("Payroll CSV")}</Button>
          <Button size="sm" icon={Download} disabled={!rows.length} onClick={() => downloadWorkbook(`payroll-${start}.xls`, [payrollSheet()])}>{t("Excel")}</Button>
          {canEdit && over && pending.length > 0 && <Button size="sm" variant="primary" icon={Check} onClick={() => approve(pending)}>{t("Approve all")} {pending.length}</Button>}
        </div>
      </div>
      {!over && rows.length > 0 && <p className="border-y border-line bg-surface-2 px-4 py-2 text-xs text-ink-2">{t("This week isn't over yet. Approve it once it ends.")}</p>}
      {rows.length === 0 ? (
        <EmptyState icon={Clock} title={t("No hours recorded this week")} body={t("Staff clock in and out from the Marina app.")} />
      ) : (
        <Table head={["Staff member", ...days.map((d, i) => `${weekday(i)} ${Number(d.slice(8))}`), "Total", "Pay", "Approval"]}>
          {rows.map((s) => {
            const live = db.timeEntries.find((e) => e.staffId === s.id && !e.end);
            const a = approval(s);
            const changed = a && a.minutes !== Math.round(minutes(s));
            const p = pay(s);
            return (
              <tr key={s.id}>
                <td><p className="font-medium">{s.name}</p><p className="text-xs text-ink-3">{t(s.position)} · {ix.marina(s.marinaId)?.name}</p>{live && <span className="mt-1 inline-block"><Badge tone="success">{t("On the clock since")} {fmtTime(live.start)}</Badge></span>}</td>
                {days.map((d) => {
                  const m = minutesWorked(db.timeEntries, s.id, d, addDays(d, 1));
                  const first = db.timeEntries.filter((e) => e.staffId === s.id && localDay(e.start) === d).sort((x, y) => x.start.localeCompare(y.start));
                  return (
                    <td key={d} className={cx("num whitespace-nowrap", !m && "text-ink-3")} title={first.map((e) => `${fmtTime(e.start)} – ${e.end ? fmtTime(e.end) : "now"}`).join(", ")}>
                      {m ? fmtDuration(m) : "–"}
                    </td>
                  );
                })}
                <td className="num font-semibold whitespace-nowrap">{fmtDuration(minutes(s))}{p.overtime > 0 && <span className="block text-xs font-normal text-ink-3">{p.overtime.toFixed(1)} {t("h overtime")}</span>}</td>
                <td className="num whitespace-nowrap">{money2(p.gross, "USD")}<span className="block text-xs text-ink-3">{money2(hourlyRateOf(s), "USD")}/h</span></td>
                <td className="whitespace-nowrap">
                  {a && !changed ? <Badge tone="success" icon={Check}>{t("Approved")}</Badge> : changed ? <Badge tone="pending">{t("Changed since approval")}</Badge> : null}
                  {a && <span className="block text-xs text-ink-3">{t("by")} {a.approvedBy}</span>}
                  {canEdit && over && (!a || changed) && <Button size="sm" onClick={() => approve([s])}>{t("Approve")}</Button>}
                </td>
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
      <div className="border-b border-line md:border-e md:border-b-0">
        <div className="px-4 py-3">
          <Select aria-label={t("Message a staff member")} value="" onChange={(e) => e.target.value && openThread(e.target.value)}>
            <option value="">{t("Message a staff member…")}</option>
            {staff.filter((s) => s.position !== "Marina Manager" && ids.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <ul>
          {threads.map(({ s, msgs }) => {
            const unread = msgs.filter((m) => m.fromStaff && !m.read).length;
            const last = msgs[msgs.length - 1];
            return (
              <li key={s.id}>
                <button onClick={() => openThread(s.id)} className={cx("flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-sidebar-hover cursor-pointer", openId === s.id && "bg-sidebar-hover")}>
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className={cx("truncate text-[13px]", unread ? "font-semibold" : "font-medium")}>{s.name}</span>{unread > 0 && <span className="rounded-full bg-green px-1.5 text-[11px] font-semibold text-white">{unread}</span>}</span>
                    <span className="block truncate text-xs text-ink-3">{last.fromStaff ? "" : t("You: ")}{last.text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {current ? (
        <div className="flex min-h-[480px] flex-col">
          <div className="border-b border-line px-4 py-3"><p className="font-semibold">{current.name}</p><p className="text-xs text-ink-3">{t(current.position)} · {current.phone}</p></div>
          <div className="flex flex-1 flex-col justify-end gap-2 p-4">
            {msgs.length === 0 && <p className="text-center text-[13px] text-ink-3">{t("No messages yet. They'll see yours in the staff app.")}</p>}
            {msgs.map((m) => (
              <div key={m.id} className={cx("max-w-[75%]", m.fromStaff ? "self-start" : "self-end text-end")}>
                <p className={cx("inline-block rounded-2xl px-3.5 py-2 text-start text-[13px]", m.fromStaff ? "border border-line bg-surface" : "bg-primary text-on-primary")}>{m.broadcast && <span className="block text-[11px] font-semibold opacity-80">{t("Announcement to everyone")}</span>}{m.text}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">{m.fromStaff ? "" : `${m.by} · `}{localDay(m.at) === today() ? fmtTime(m.at) : `${fmtShort(localDay(m.at))}, ${fmtTime(m.at)}`}{!m.fromStaff && m.read && t(" · Seen")}</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 border-t border-line p-3">
            <Textarea className="min-h-11 flex-1" aria-label={t("Message {name}", { name: current.name })} rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t("Message {v}", { v: current.name.split(" ")[0] })} />
            <Button variant="primary" icon={Send} onClick={send} disabled={!text.trim()}>{t("Send")}</Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={MessagesSquare} title={t("No conversations")} body={t("Messages from staff in the Marina Staff app show up here.")} />
      )}
    </div>
  );
}
