// Notifications are derived from live data, so they always reflect the current state.
import type { Db } from "./seed";
import type { Index } from "./selectors";
import { today } from "./date";

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
  if (isAdmin)
    for (const u of db.users.filter((u) => u.status === "invited"))
      out.push({ id: `invite-${u.id}`, title: "Invite not accepted yet", body: `${u.name} hasn't set up their account.`, to: "/users?tab=users" });

  return out;
}
