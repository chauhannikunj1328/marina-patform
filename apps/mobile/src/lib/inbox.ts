// Staff notifications, built from live data so they always match what the app shows.
import { addDays, buildNotifications, fmtDate, fmtShort, planFor, SHIFT_HOURS, today, type Db, type Index, type Staff } from "@marina/shared";

export type InboxKind = "message" | "task" | "request" | "arrival" | "late" | "schedule" | "booking" | "invoice";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  /** Screen to open; `open` is the work order to show there. */
  path: "/" | "/chat" | "/me" | "/tasks" | "/approvals" | "/team" | "/bookings";
  open?: string;
  /** Extra screen option, e.g. which list to show. */
  view?: string;
  /** Shown first when true. */
  urgent?: boolean;
}

export function buildInbox(db: Db, ix: Index, me: Staff | undefined, marinaId: string): InboxItem[] {
  const now = today();
  const out: InboxItem[] = [];
  if (me) {
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
  const bookings = ix.bookingsIn([marinaId]);
  const late = bookings.filter((b) => b.end < now && b.status === "checked-in");
  if (late.length) out.push({ id: `late-${now}-${late.length}`, kind: "late", urgent: true, title: `${late.length} ${late.length === 1 ? "boat is" : "boats are"} past departure`, body: "Check them out or ask the owner to extend.", path: "/" });
  const arriving = bookings.filter((b) => b.start === now && b.status === "confirmed");
  if (arriving.length) out.push({ id: `arr-${now}-${arriving.length}`, kind: "arrival", title: `${arriving.length} ${arriving.length === 1 ? "boat" : "boats"} still to arrive today`, body: arriving.slice(0, 3).map((b) => ix.boat(b.boatId)?.name).join(", "), path: "/" });
  return out.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}

/**
 * Manager and admin notifications: the web app's list (pending approvals, arrivals, overdue
 * invoices, urgent repairs, staff requests and messages), pointed at the matching phone screens.
 */
export function buildOfficeInbox(db: Db, ix: Index, ids: string[], isAdmin: boolean): InboxItem[] {
  const now = today();
  const out: InboxItem[] = [];
  for (const n of buildNotifications(db, ix, ids, isAdmin)) {
    const to = n.to;
    const base = { id: n.id, title: n.title, body: n.body };
    if (to.startsWith("/bookings?status=pending")) out.push({ ...base, kind: "booking", path: "/approvals", view: "bookings" });
    else if (to.startsWith("/bookings")) out.push({ ...base, kind: "arrival", path: "/bookings" });
    else if (to.startsWith("/billing")) out.push({ ...base, kind: "invoice", path: "/" });
    else if (to.startsWith("/maintenance?open=")) out.push({ ...base, kind: "task", urgent: true, path: "/tasks", open: to.split("open=")[1] });
    else if (to.startsWith("/maintenance")) out.push({ ...base, kind: "task", urgent: true, path: "/tasks" });
    else if (to.startsWith("/staff?tab=requests")) out.push({ ...base, kind: "request", path: "/approvals", view: "staff" });
    else if (to.startsWith("/staff?tab=messages")) out.push({ ...base, kind: "message", path: "/team", view: "messages" });
    // Invites and other admin setup stay in the web app.
  }
  const late = ix.bookingsIn(ids).filter((b) => b.end < now && b.status === "checked-in");
  if (late.length) out.push({ id: `late-${now}-${late.length}`, kind: "late", urgent: true, title: `${late.length} ${late.length === 1 ? "boat is" : "boats are"} past departure`, body: "Ask the dock team to check them out or extend the stay.", path: "/bookings" });
  return out.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
}
