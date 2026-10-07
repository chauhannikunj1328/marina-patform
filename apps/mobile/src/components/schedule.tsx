// Weekly schedule for managers and admins: who works each day, shift gaps per marina, finding cover,
// and editing a person's regular shift and days off.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronLeft, ChevronRight, Send, TriangleAlert } from "lucide-react-native";
import { addDays, DAYS, fmtShort, fromISO, nextId, planFor, SHIFT_HOURS, today, type Shift, type Staff } from "@marina/shared";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Badge, Button, Card, Chip, Field, IconButton, Sheet, Txt } from "./ui";

export const SHIFTS = Object.keys(SHIFT_HOURS) as Shift[];

type Requests = Parameters<typeof planFor>[2];

/** The shift someone works on a day: their own, or the colleague's they're covering. Undefined when not working. */
export function shiftOn(s: Staff, day: string, requests: Requests, staff: Staff[]): Shift | undefined {
  const p = planFor(s, day, requests);
  if (!p.working) return undefined;
  return p.covering ? staff.find((x) => x.id === p.covering?.staffId)?.shift ?? s.shift : s.shift;
}

/** Shifts with nobody working at a marina on a day. */
export function gapsOn(staff: Staff[], marinaId: string, day: string, requests: Requests): Shift[] {
  const here = staff.filter((s) => s.marinaId === marinaId && s.position !== "Marina Manager");
  return SHIFTS.filter((sh) => !here.some((s) => shiftOn(s, day, requests, staff) === sh));
}

export function WeekSchedule({ onPerson }: { onPerson: (s: Staff) => void }) {
  const { db, ix, ids } = useStore();
  const { t } = useTheme();
  const [offset, setOffset] = useState(0);
  const [cover, setCover] = useState<{ marinaId: string; day: string; shift: Shift } | undefined>();
  const start = addDays(today(), -fromISO(today()).getDay() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const staff = db.staff.filter((s) => ids.includes(s.marinaId));

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton icon={ChevronLeft} label="Previous week" onPress={() => setOffset(offset - 1)} />
        <View style={{ alignItems: "center" }}>
          <Txt weight="semibold">Week of {fmtShort(start)}</Txt>
          {offset !== 0 && (
            <Pressable accessibilityRole="button" onPress={() => setOffset(0)} hitSlop={8}>
              <Txt v="caption" weight="semibold" color={t.greenText}>Back to this week</Txt>
            </Pressable>
          )}
        </View>
        <IconButton icon={ChevronRight} label="Next week" onPress={() => setOffset(offset + 1)} />
      </View>
      {days.map((d, i) => {
        const working = staff.filter((s) => planFor(s, d, db.requests).working);
        const gaps = ids.flatMap((m) => gapsOn(db.staff, m, d, db.requests).map((shift) => ({ marinaId: m, shift })));
        return (
          <Card key={d} style={{ gap: 8, borderColor: d === today() ? t.primary : t.border, borderWidth: d === today() ? 2 : 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt weight="semibold">{DAYS[i]} {fmtShort(d)}{d === today() ? " · today" : ""}</Txt>
              <Txt v="bodySm" num color={t.text3}>{working.length} working</Txt>
            </View>
            {ids.length === 1 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {SHIFTS.map((sh) => {
                  const names = working.filter((s) => s.position !== "Marina Manager" && shiftOn(s, d, db.requests, db.staff) === sh);
                  return (
                    <Pressable key={sh} accessibilityRole="button" disabled={!names.length} accessibilityLabel={`${sh}: ${names.map((s) => s.name).join(", ") || "nobody"}`} onPress={() => names[0] && onPerson(names[0])} style={{ minWidth: "48%", flexGrow: 1, borderRadius: 10, padding: 8, backgroundColor: names.length ? t.surface3 : t.status.maintenance.bg }}>
                      <Txt v="caption" weight="semibold" color={names.length ? t.text2 : t.status.maintenance.fg}>{sh}</Txt>
                      <Txt v="caption" color={names.length ? t.text3 : t.status.maintenance.fg} numberOfLines={2}>
                        {names.length ? names.map((s) => s.name.split(" ")[0]).join(", ") : "Nobody"}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {gaps.length > 0 && (
              <View style={{ gap: 6 }}>
                {gaps.slice(0, ids.length === 1 ? 4 : 3).map((g) => (
                  <View key={`${g.marinaId}-${g.shift}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TriangleAlert size={14} color={t.status.maintenance.fg} />
                    <Txt v="caption" color={t.text2} style={{ flex: 1 }} numberOfLines={1}>No {g.shift} shift{ids.length > 1 ? ` at ${ix.marina(g.marinaId)?.name}` : ""}</Txt>
                    {d >= today() && <Button size="sm" label="Find cover" onPress={() => setCover({ marinaId: g.marinaId, day: d, shift: g.shift })} />}
                  </View>
                ))}
                {gaps.length > (ids.length === 1 ? 4 : 3) && <Txt v="caption" color={t.text3}>and {gaps.length - (ids.length === 1 ? 4 : 3)} more gaps. Choose one marina at the top to see them all.</Txt>}
              </View>
            )}
            {gaps.length === 0 && <Badge tone="success" label="Every shift covered" />}
          </Card>
        );
      })}
      {cover && <CoverSheet {...cover} onClose={() => setCover(undefined)} />}
    </View>
  );
}

/** Ask colleagues who are off that day to cover a shift. The ask goes to their Messages. */
function CoverSheet({ marinaId, day, shift, onClose }: { marinaId: string; day: string; shift: Shift; onClose: () => void }) {
  const { db, ix, update, toast, user } = useStore();
  const { t } = useTheme();
  const [asked, setAsked] = useState<string[]>([]);
  const candidates = db.staff.filter((s) => s.marinaId === marinaId && s.position !== "Marina Manager" && s.status === "active" && !planFor(s, day, db.requests).working);
  const ask = (s: Staff) => {
    const text = `Hi ${s.name.split(" ")[0]}, can you cover the ${shift} shift (${SHIFT_HOURS[shift]}) on ${DAYS[fromISO(day).getDay()]} ${fmtShort(day)}? Reply here to let me know.`;
    update((d) => ({ ...d, chat: [...d.chat, { id: nextId("ch", d.chat), staffId: s.id, fromStaff: false, by: user?.name ?? "Manager", text, at: new Date().toISOString(), read: false }] }), { text: `Asked ${s.name} to cover the ${shift} shift on ${fmtShort(day)}`, marinaId });
    setAsked([...asked, s.id]);
    toast(`Asked ${s.name.split(" ")[0]}. Their reply shows in Messages.`);
  };
  return (
    <Sheet open onClose={onClose} title={`Cover ${shift} · ${fmtShort(day)}`} subtitle={`${ix.marina(marinaId)?.name} · ${SHIFT_HOURS[shift]}`}>
      {candidates.length === 0 ? (
        <Txt v="bodySm" color={t.text3}>Everyone at this marina is already working that day, or on leave.</Txt>
      ) : (
        <View style={{ gap: 8 }}>
          <Txt v="bodySm" color={t.text2}>Off that day and free to ask:</Txt>
          {candidates.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{s.name}</Txt>
                <Txt v="caption" color={t.text3}>{s.position} · usually {s.shift}</Txt>
              </View>
              <Button size="sm" icon={Send} label={asked.includes(s.id) ? "Asked" : "Ask"} disabled={asked.includes(s.id)} onPress={() => ask(s)} />
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

/** A person's regular shift, days off and leave. */
export function EditScheduleSheet({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const { db, update, toast } = useStore();
  const { t } = useTheme();
  const [shift, setShift] = useState(staff.shift);
  const [daysOff, setDaysOff] = useState(staff.daysOff);
  const [onLeave, setOnLeave] = useState(staff.status === "on-leave");
  const save = () => {
    const before = db;
    update((d) => ({ ...d, staff: d.staff.map((s) => (s.id === staff.id ? { ...s, shift, daysOff: [...daysOff].sort(), status: onLeave ? "on-leave" : "active" } : s)) }), { text: `Updated ${staff.name}'s schedule: ${shift}, off ${daysOff.map((x) => DAYS[x]).join(", ") || "no days"}${onLeave ? ", on leave" : ""}`, to: "/staff", marinaId: staff.marinaId });
    toast(`${staff.name.split(" ")[0]}'s schedule saved. It shows in their app.`, before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`${staff.name.split(" ")[0]}'s schedule`} subtitle={staff.position} footer={<Button variant="primary" size="lg" label="Save schedule" onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="Regular shift">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SHIFTS.map((sh) => <Chip key={sh} label={sh} sub={SHIFT_HOURS[sh]} on={shift === sh} onPress={() => setShift(sh)} />)}
          </View>
        </Field>
        <Field label="Days off" hint={daysOff.length > 3 ? "That's more than 3 days off a week." : undefined}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DAYS.map((d, i) => <Chip key={d} label={d} on={daysOff.includes(i)} onPress={() => setDaysOff(daysOff.includes(i) ? daysOff.filter((x) => x !== i) : [...daysOff, i])} />)}
          </View>
        </Field>
        <Field label="Status">
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Active" on={!onLeave} onPress={() => setOnLeave(false)} />
            <Chip label="On leave" on={onLeave} onPress={() => setOnLeave(true)} />
          </View>
        </Field>
        <Txt v="caption" color={t.text3}>Single days off and swaps go through Approvals. This changes the regular week.</Txt>
      </View>
    </Sheet>
  );
}
