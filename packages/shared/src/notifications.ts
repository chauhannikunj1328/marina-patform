// Notifications are derived from live data, so they always reflect the current state.
import type { Db } from "./seed";
import type { Index } from "./selectors";
import { today } from "./date";
import { lowStock, renewalsDue } from "./actions";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  to: string;
}

export function buildNotifications(db: Db, ix: Index, scope: string[], isAdmin: boolean): AppNotification[] {
  const now = today();
  const inScope = new Set(scope);
  const out: AppNotification[] = [];
  const { notify } = db.settings;

  if (notify.pending) {
    const pending = ix.bookingsIn(scope).filter((b) => b.status === "pending");
    if (pending.length)
      out.push({ id: `pending-${pending.length}`, title: `${pending.length} bookings awaiting approval`, body: "Approve or decline them so boat owners get an answer.", to: "/bookings?status=pending" });
  }
  const arrivals = ix.bookingsIn(scope).filter((b) => b.start === now && (b.status === "confirmed" || b.status === "pending"));
  if (arrivals.length) out.push({ id: `arrivals-${now}-${arrivals.length}`, title: `${arrivals.length} arrivals today`, body: "Boats still to check in today.", to: "/bookings?view=today" });

  if (notify.overdue) {
    const overdue = db.invoices.filter((i) => i.status === "overdue" && inScope.has(ix.marinaOfBerth(ix.booking(i.bookingId)?.berthId ?? "")?.id ?? ""));
    if (overdue.length)
      out.push({ id: `overdue-${overdue.length}`, title: `${overdue.length} overdue invoices`, body: "Send a reminder or record the payment.", to: "/billing?status=overdue" });
  }
  if (notify.maintenance) {
    const urgent = db.tasks.filter((t) => inScope.has(t.marinaId) && t.priority === "high" && t.status !== "done");
    if (urgent.length === 1) {
      const t = urgent[0];
      out.push({ id: `task-${t.id}`, title: `High priority: ${t.title}`, body: `${ix.marina(t.marinaId)?.name}${t.berthId ? `, berth ${ix.berth(t.berthId)?.code}` : ""}`, to: `/maintenance?open=${t.id}` });
    } else if (urgent.length > 1) {
      out.push({ id: `tasks-${urgent.map((t) => t.id).join(".")}`, title: `${urgent.length} high priority work orders`, body: "Repairs that are blocking berths or facilities.", to: "/maintenance" });
    }
  }
  const renewals = renewalsDue(db.contracts ?? [], now).filter((c) => inScope.has(c.marinaId));
  if (renewals.length)
    out.push({ id: `renewals-${renewals.map((c) => c.id).join(".")}`, title: `${renewals.length} ${renewals.length === 1 ? "contract is" : "contracts are"} up for renewal`, body: "Renew them or let the berth go back on sale.", to: "/contracts" });
  const openIncidents = (db.incidents ?? []).filter((i) => i.status === "open" && inScope.has(i.marinaId));
  if (openIncidents.length)
    out.push({ id: `incidents-${openIncidents.map((i) => i.id).join(".")}`, title: `${openIncidents.length} new ${openIncidents.length === 1 ? "incident" : "incidents"} to review`, body: openIncidents.slice(0, 2).map((i) => i.description.slice(0, 60)).join(" · "), to: "/incidents" });
  const low = lowStock((db.inventory ?? []).filter((i) => inScope.has(i.marinaId)));
  if (low.length)
    out.push({ id: `stock-${low.map((i) => `${i.id}:${i.qty}`).join(".")}`, title: `${low.length} ${low.length === 1 ? "part is" : "parts are"} running low`, body: low.slice(0, 3).map((i) => i.name).join(", "), to: "/maintenance?tab=parts" });
  const matched = (db.waitlist ?? []).filter((w) => w.status === "waiting" && inScope.has(w.marinaId) && ix.waitlistMatches(w).length > 0);
  if (matched.length)
    out.push({ id: `waitlist-${matched.map((w) => w.id).join(".")}`, title: `${matched.length} waitlist ${matched.length === 1 ? "match" : "matches"}`, body: "A berth has opened up for someone on the waitlist.", to: "/bookings?view=waitlist" });
  // From the staff app: time off / swap requests and unread messages.
  const staffIn = new Set(db.staff.filter((s) => inScope.has(s.marinaId)).map((s) => s.id));
  const requests = (db.requests ?? []).filter((r) => r.status === "pending" && staffIn.has(r.staffId));
  if (requests.length)
    out.push({ id: `requests-${requests.map((r) => r.id).join(".")}`, title: `${requests.length} staff ${requests.length === 1 ? "request" : "requests"} to review`, body: "Time off and shift swaps sent from the staff app.", to: "/staff?tab=requests" });
  const unread = (db.chat ?? []).filter((m) => m.fromStaff && !m.read && staffIn.has(m.staffId));
  if (unread.length) {
    const last = unread[unread.length - 1];
    out.push({ id: `chat-${last.id}`, title: unread.length === 1 ? `Message from ${last.by}` : `${unread.length} unread staff messages`, body: last.text, to: "/staff?tab=messages" });
  }
  if (isAdmin)
    for (const u of db.users.filter((u) => u.status === "invited"))
      out.push({ id: `invite-${u.id}`, title: "Invite not accepted yet", body: `${u.name} hasn't set up their account.`, to: "/users?tab=users" });

  return out;
}
