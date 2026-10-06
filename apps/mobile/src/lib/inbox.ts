// Notifications, built from live data so they always match what the app shows. Staff get their
// own messages, work orders and shifts; managers and admins get approvals, staff requests and
// messages, urgent repairs and overdue invoices for the marinas shown.
import { addDays, fmtDate, fmtShort, money, planFor, SHIFT_HOURS, today, type Db, type Index, type Role, type Staff } from "@marina/shared";

export type InboxKind = "message" | "task" | "request" | "arrival" | "late" | "schedule" | "approval" | "invoice";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  /** Screen to open; `open` is the work order to show there. */
  path: "/" | "/chat" | "/me" | "/tasks" | "/approvals" | "/team" | "/bookings";
  open?: string;
  /** Tab view to show (Approvals: bookings / staff, Team: messages, Bookings: in). */
  view?: string;
  /** Shown first when true. */
  urgent?: boolean;
}

export function buildInbox(db: Db, ix: Index, me: Staff | undefined, ids: string[], role?: Role): InboxItem[] {
  const now = today();
  const out: InboxItem[] = [];
  const manager = role === "admin" || role === "manager";
  if (manager) {
    const inIds = new Set(ids);
    const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
    const pending = ix.bookingsIn(ids).filter((b) => b.status === "pending");
    if (pending.length)
      out.push({ id: `pending-${pending.map((b) => b.id).join(".")}`, kind: "approval", title: `${pending.length} ${pending.length === 1 ? "booking" : "bookings"} to approve`, body: pending.slice(0, 3).map((b) => ix.boat(b.boatId)?.name).join(", "), path: "/approvals", view: "bookings" });
    const requests = db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId));
    for (const r of requests)
      out.push({ id: `staffreq-${r.id}`, kind: "request", title: `${ix.staffMember(r.staffId)?.name} asked for ${r.kind === "leave" ? "time off" : "a shift swap"}`, body: `${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""}${r.reason ? ` · ${r.reason}` : ""}`, path: "/approvals", view: "staff" });
    const unread = db.chat.filter((m) => m.fromStaff && !m.read && staffIds.has(m.staffId));
    if (unread.length) {
      const last = unread[unread.length - 1];
      out.push({ id: `chat-${last.id}`, kind: "message", title: unread.length === 1 ? `Message from ${last.by}` : `${unread.length} unread staff messages`, body: last.text, path: "/team", view: "messages" });
    }
    const urgent = db.tasks.filter((x) => inIds.has(x.marinaId) && x.priority === "high" && x.status !== "done");
    for (const x of urgent.slice(0, 5))
      out.push({ id: `urgent-${x.id}`, kind: "task", urgent: x.due < now, title: `Urgent: ${x.title}`, body: `${ix.marina(x.marinaId)?.name}${x.berthId ? `, berth ${ix.berth(x.berthId)?.code}` : ""} · ${x.assigneeId ? ix.staffMember(x.assigneeId)?.name : "not assigned"}`, path: "/tasks", open: x.id });
    const overdue = db.invoices.filter((i) => i.status === "overdue" && inIds.has(ix.marinaOfInvoice(i) ?? ""));
    if (overdue.length)
      out.push({ id: `overdue-${overdue.map((i) => i.id).join(".")}`, kind: "invoice", title: `${overdue.length} overdue ${overdue.length === 1 ? "invoice" : "invoices"}`, body: `${money(overdue.reduce((s, i) => s + ix.balance(i), 0))} still owed. Send reminders from Billing in the web app.`, path: "/" });
  } else if (me) {
    const unread = db.chat.filter((m) => m.staffId === me.id && !m.fromStaff && !m.read);
    if (unread.length) {
      const last = unread[unread.length - 1];
      out.push({ id: `chat-${last.id}`, kind: "message", title: unread.length === 1 ? `Message from ${last.by}` : `${unread.length} new messages`, body: last.text, path: "/chat" });
    }
    for (const r of db.requests.filter((r) => r.staffId === me.id && r.status !== "pending" && r.decidedAt && r.decidedAt.slice(0, 10) >= addDays(now, -7))) {
      const what = r.kind === "leave" ? `Time off ${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""}` : `Shift swap on ${fmtShort(r.start)}`;
      out.push({ id: `req-${r.id}-${r.status}`, kind: "request", title: `${what} ${r.status}`, body: `${r.decidedBy ?? "Your manager"} ${r.status} your request.`, path: "/me" });
    }
    for (const r of db.requests.filter((r) => r.kind === "swap" && r.swapWithId === me.id && r.status === "pending")) {
      out.push({ id: `cover-${r.id}`, kind: "request", title: `${ix.staffMember(r.staffId)?.name} asked you to cover`, body: `${fmtDate(r.start)}, ${ix.staffMember(r.staffId)?.shift} shift. Your manager will confirm.`, path: "/me" });
    }
    const mine = db.tasks.filter((x) => x.assigneeId === me.id && x.status !== "done");
    for (const x of mine.filter((x) => x.due < now)) out.push({ id: `overdue-${x.id}`, kind: "task", urgent: true, title: `Overdue: ${x.title}`, body: `${x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"} · was due ${fmtShort(x.due)}`, path: "/tasks", open: x.id });
    for (const x of mine.filter((x) => x.due >= now && x.created >= addDays(now, -1))) out.push({ id: `new-${x.id}`, kind: "task", title: `New work order: ${x.title}`, body: `${x.berthId ? `Berth ${ix.berth(x.berthId)?.code}` : "Facility"} · due ${fmtShort(x.due)}`, path: "/tasks", open: x.id });
    const tomorrow = addDays(now, 1);
    const plan = planFor(me, tomorrow, db.requests);
    out.push({
      id: `shift-${tomorrow}`,
      kind: "schedule",
      title: plan.working ? `Tomorrow: ${me.shift} shift` : "Tomorrow: not working",
      body: plan.working ? `${SHIFT_HOURS[me.shift]} at ${ix.marina(me.marinaId)?.name}${plan.covering ? ` (covering for ${ix.staffMember(plan.covering.staffId)?.name})` : ""}` : plan.why === "leave" ? "Approved time off." : plan.why === "swapped" ? "A colleague is covering your shift." : "Day off.",
      path: "/me",
    });
  }
  const bookings = ix.bookingsIn(ids);
  const late = bookings.filter((b) => b.end < now && b.status === "checked-in");
  if (late.length) out.push({ id: `late-${now}-${late.length}`, kind: "late", urgent: true, title: `${late.length} ${late.length === 1 ? "boat is" : "boats are"} past departure`, body: "Check them out or ask the owner to extend.", path: manager ? "/bookings" : "/", view: manager ? "in" : undefined });
  const arriving = bookings.filter((b) => b.start === now && b.status === "confirmed");
  if (arriving.length) out.push({ id: `arr-${now}-${arriving.length}`, kind: "arrival", title: `${arriving.length} ${arriving.length === 1 ? "boat" : "boats"} still to arrive today`, body: arriving.slice(0, 3).map((b) => ix.boat(b.boatId)?.name).join(", "), path: manager ? "/bookings" : "/" });
  return out.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}
