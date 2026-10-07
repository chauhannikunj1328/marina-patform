// Clock in / clock out for the signed-in staff member, and a ticking "now" for live durations.
import { useEffect, useState } from "react";
import { fmtTime, nextId, openEntry, t } from "@marina/shared";
import { useMe, useStore } from "../store";

export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

export function useClock() {
  const { db, update, toast, marinaId } = useStore();
  const me = useMe();
  const entry = me ? openEntry(db, me.id) : undefined;
  const clockIn = () => {
    if (!me || entry) return;
    const at = new Date().toISOString();
    update((d) => ({ ...d, timeEntries: [...d.timeEntries, { id: nextId("te", d.timeEntries), staffId: me.id, marinaId, start: at }] }), { text: `${me.name} clocked in`, marinaId });
    toast(t("Clocked in at {time}", { time: fmtTime(at) }));
  };
  const clockOut = () => {
    if (!me || !entry) return;
    const at = new Date().toISOString();
    const before = db;
    update((d) => ({ ...d, timeEntries: d.timeEntries.map((e) => (e.id === entry.id ? { ...e, end: at } : e)) }), { text: `${me.name} clocked out`, marinaId: entry.marinaId });
    toast(t("Clocked out at {time}", { time: fmtTime(at) }), before);
  };
  return { me, entry, clockIn, clockOut };
}
