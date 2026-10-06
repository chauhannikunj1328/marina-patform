// Which experience the signed-in person gets: staff tools, or the manager / admin overview.
import { useMemo } from "react";
import { useMe, useStore } from "../store";
import { buildInbox, buildOfficeInbox } from "./inbox";

export function useRole() {
  const { user } = useStore();
  const role = user?.role ?? "staff";
  return { role, office: role === "admin" || role === "manager", isAdmin: role === "admin" };
}

/** Notifications for whoever is signed in. */
export function useInbox() {
  const { db, ix, ids, marinaId } = useStore();
  const me = useMe();
  const { office, isAdmin } = useRole();
  return useMemo(() => (office ? buildOfficeInbox(db, ix, ids, isAdmin) : buildInbox(db, ix, me, marinaId)), [office, isAdmin, db, ix, ids, me, marinaId]);
}

/** Unread messages: from the office (for staff) or from staff (for managers and admins). */
export function useUnreadChat() {
  const { db, ids } = useStore();
  const me = useMe();
  const { office } = useRole();
  return useMemo(() => {
    if (!office) return me ? db.chat.filter((m) => m.staffId === me.id && !m.fromStaff && !m.read).length : 0;
    const staff = new Set(db.staff.filter((s) => ids.includes(s.marinaId)).map((s) => s.id));
    return db.chat.filter((m) => m.fromStaff && !m.read && staff.has(m.staffId)).length;
  }, [office, me, db.chat, db.staff, ids]);
}
