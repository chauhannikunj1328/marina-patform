// Weekly schedule for managers and admins: who works each day, shift gaps per marina, finding cover,
// and editing a person's regular shift and days off.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronLeft, ChevronRight, Send, TriangleAlert } from "lucide-react-native";
import { addDays, DAYS, weekday, fmtShort, fromISO, nextId, planFor, SHIFT_HOURS, shiftOn, today, type Shift, type Staff } from "@marina/shared";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Badge, Button, Card, Chip, Field, IconButton, Input, Sheet, Txt } from "./ui";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export const SHIFTS = Object.keys(SHIFT_HOURS) as Shift[];

type Requests = Parameters<typeof planFor>[2];

/** Shifts with nobody working at a marina on a day. */
export function gapsOn(staff: Staff[], marinaId: string, day: string, requests: Requests): Shift[] {
  const here = staff.filter((s) => s.marinaId === marinaId && s.position !== "Marina Manager");
  return SHIFTS.filter((sh) => !here.some((s) => shiftOn(s, day, requests, staff) === sh));
}

export function WeekSchedule({ onPerson }: { onPerson: (s: Staff) => void }) {
  const tr = useTr();
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
        <IconButton icon={ChevronLeft} label={tr("Previous week")} onPress={() => setOffset(offset - 1)} />
        <View style={{ alignItems: "center" }}>
          <Txt weight="semibold">{tr("Week of")} {fmtShort(start)}</Txt>
          {offset !== 0 && (
            <Pressable accessibilityRole="button" onPress={() => setOffset(0)} hitSlop={8}>
              <Txt v="caption" weight="semibold" color={t.greenText}>{tr("Back to this week")}</Txt>
            </Pressable>
          )}
        </View>
        <IconButton icon={ChevronRight} label={tr("Next week")} onPress={() => setOffset(offset + 1)} />
      </View>
      {days.map((d, i) => {
        const working = staff.filter((s) => planFor(s, d, db.requests).working);
        const gaps = ids.flatMap((m) => gapsOn(db.staff, m, d, db.requests).map((shift) => ({ marinaId: m, shift })));
        return (
          <Card key={d} style={{ gap: 8, borderColor: d === today() ? t.primary : t.border, borderWidth: d === today() ? 2 : 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt weight="semibold">{weekday(i)} {fmtShort(d)}{d === today() ? tr(" · today") : ""}</Txt>
              <Txt v="bodySm" num color={t.text3}>{tr("{n} working", { n: working.length })}</Txt>
            </View>
            {ids.length === 1 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {SHIFTS.map((sh) => {
                  const names = working.filter((s) => s.position !== "Marina Manager" && shiftOn(s, d, db.requests, db.staff) === sh);
                  return (
                    <Pressable key={sh} accessibilityRole="button" disabled={!names.length} accessibilityLabel={`${sh}: ${names.map((s) => s.name).join(", ") || "nobody"}`} onPress={() => names[0] && onPerson(names[0])} style={{ minWidth: "48%", flexGrow: 1, borderRadius: 10, padding: 8, backgroundColor: names.length ? t.surface3 : t.status.maintenance.bg }}>
                      <Txt v="caption" weight="semibold" color={names.length ? t.text2 : t.status.maintenance.fg}>{sh}</Txt>
                      <Txt v="caption" color={names.length ? t.text3 : t.status.maintenance.fg} numberOfLines={2}>
                        {names.length ? names.map((s) => s.name.split(" ")[0]).join(", ") : tr("Nobody")}
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
                    <Txt v="caption" color={t.text2} style={{ flex: 1 }} numberOfLines={1}>{ids.length > 1 ? tr("No {shift} shift at {marina}", { shift: tr(g.shift), marina: ix.marina(g.marinaId)?.name }) : tr("No {shift} shift", { shift: tr(g.shift) })}</Txt>
                    {d >= today() && <Button size="sm" label={tr("Find cover")} onPress={() => setCover({ marinaId: g.marinaId, day: d, shift: g.shift })} />}
                  </View>
                ))}
                {gaps.length > (ids.length === 1 ? 4 : 3) && <Txt v="caption" color={t.text3}>{tr("and {n} more gaps. Choose one marina at the top to see them all.", { n: gaps.length - (ids.length === 1 ? 4 : 3) })}</Txt>}
              </View>
            )}
            {gaps.length === 0 && <Badge tone="success" label={tr("Every shift covered")} />}
          </Card>
        );
      })}
      {cover && <CoverSheet {...cover} onClose={() => setCover(undefined)} />}
    </View>
  );
}

/** Ask colleagues who are off that day to cover a shift. The ask goes to their Messages. */
function CoverSheet({ marinaId, day, shift, onClose }: { marinaId: string; day: string; shift: Shift; onClose: () => void }) {
  const tr = useTr();
  const { db, ix, update, toast, user } = useStore();
  const { t } = useTheme();
  const [asked, setAsked] = useState<string[]>([]);
  const candidates = db.staff.filter((s) => s.marinaId === marinaId && s.position !== "Marina Manager" && s.status === "active" && !planFor(s, day, db.requests).working);
  const ask = (s: Staff) => {
    const text = tr("Hi {name}, can you cover the {shift} shift ({hours}) on {day}? Reply here to let me know.", { name: s.name.split(" ")[0], shift: tr(shift), hours: tr(SHIFT_HOURS[shift]), day: `${weekday(fromISO(day).getDay())} ${fmtShort(day)}` });
    update((d) => ({ ...d, chat: [...d.chat, { id: nextId("ch", d.chat), staffId: s.id, fromStaff: false, by: user?.name ?? "Manager", text, at: new Date().toISOString(), read: false }] }), { text: `Asked ${s.name} to cover the ${shift} shift on ${fmtShort(day)}`, marinaId });
    setAsked([...asked, s.id]);
    toast(tr("Asked {v}. Their reply shows in Messages.", { v: s.name.split(" ")[0] }));
  };
  return (
    <Sheet open onClose={onClose} title={tr("Cover {shift} · {date}", { shift: tr(shift), date: fmtShort(day) })} subtitle={`${ix.marina(marinaId)?.name} · ${tr(SHIFT_HOURS[shift])}`}>
      {candidates.length === 0 ? (
        <Txt v="bodySm" color={t.text3}>{tr("Everyone at this marina is already working that day, or on leave.")}</Txt>
      ) : (
        <View style={{ gap: 8 }}>
          <Txt v="bodySm" color={t.text2}>{tr("Off that day and free to ask:")}</Txt>
          {candidates.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{s.name}</Txt>
                <Txt v="caption" color={t.text3}>{tr("{position} · usually {shift}", { position: tr(s.position), shift: tr(s.shift) })}</Txt>
              </View>
              <Button size="sm" icon={Send} label={asked.includes(s.id) ? tr("Asked") : tr("Ask")} disabled={asked.includes(s.id)} onPress={() => ask(s)} />
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

/** A person's regular shift, days off and leave. */
export function EditScheduleSheet({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const tr = useTr();
  const { db, update, toast } = useStore();
  const { t } = useTheme();
  const [shift, setShift] = useState(staff.shift);
  const [daysOff, setDaysOff] = useState(staff.daysOff);
  const [onLeave, setOnLeave] = useState(staff.status === "on-leave");
  const save = () => {
    const before = db;
    update((d) => ({ ...d, staff: d.staff.map((s) => (s.id === staff.id ? { ...s, shift, daysOff: [...daysOff].sort(), status: onLeave ? "on-leave" : "active" } : s)) }), { text: `Updated ${staff.name}'s schedule: ${shift}, off ${daysOff.map((x) => weekday(x)).join(", ") || "no days"}${onLeave ? ", on leave" : ""}`, to: "/staff", marinaId: staff.marinaId });
    toast(tr("{v}'s schedule saved. It shows in their app.", { v: staff.name.split(" ")[0] }), before);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("{v}'s schedule", { v: staff.name.split(" ")[0] })} subtitle={staff.position} footer={<Button variant="primary" size="lg" label={tr("Save schedule")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Regular shift")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SHIFTS.map((sh) => <Chip key={sh} label={tr(sh)} sub={tr(SHIFT_HOURS[sh])} on={shift === sh} onPress={() => setShift(sh)} />)}
          </View>
        </Field>
        <Field label={tr("Days off")} hint={daysOff.length > 3 ? tr("That's more than 3 days off a week.") : undefined}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DAYS.map((d, i) => <Chip key={d} label={weekday(i)} on={daysOff.includes(i)} onPress={() => setDaysOff(daysOff.includes(i) ? daysOff.filter((x) => x !== i) : [...daysOff, i])} />)}
          </View>
        </Field>
        <Field label={tr("Status")}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label={tr("Active")} on={!onLeave} onPress={() => setOnLeave(false)} />
            <Chip label={tr("On leave")} on={onLeave} onPress={() => setOnLeave(true)} />
          </View>
        </Field>
        <Txt v="caption" color={t.text3}>{tr("Single days off and swaps go through Approvals. This changes the regular week.")}</Txt>
      </View>
    </Sheet>
  );
}

/** One announcement to every staff member at the chosen marinas. It lands in each person's Messages. */
export function BroadcastSheet({ onClose }: { onClose: () => void }) {
  const tr = useTr();
  const { db, ix, ids, update, toast, user } = useStore();
  const { t } = useTheme();
  const [targets, setTargets] = useState<string[]>(ids.length === 1 ? ids : []);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const people = db.staff.filter((s) => targets.includes(s.marinaId) && s.position !== "Marina Manager" && s.status === "active");
  const send = () => {
    if (!targets.length) return setError(tr("Choose at least one marina."));
    if (!text.trim()) return setError(tr("Write the message."));
    const at = new Date().toISOString();
    update(
      (d) => {
        const base = Number(nextId("ch", d.chat).split("-")[1]);
        return { ...d, chat: [...d.chat, ...people.map((s, i) => ({ id: `ch-${base + i}`, staffId: s.id, fromStaff: false, by: user?.name ?? "Manager", text: text.trim(), at, read: false, broadcast: true }))] };
      },
      { text: `Sent an announcement to ${people.length} staff at ${targets.map((m) => ix.marina(m)?.name).join(", ")}`, marinaId: targets.length === 1 ? targets[0] : undefined },
    );
    toast(tn(people.length, "Sent to {n} person", "Sent to {n} people"));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Message everyone")} subtitle={tr("An announcement in every staff member's Messages")} footer={<Button variant="primary" size="lg" icon={Send} label={people.length ? tn(people.length, "Send to {n} person", "Send to {n} people") : tr("Send")} onPress={send} />}>
      <View style={{ gap: 16 }}>
        {ids.length > 1 && (
          <Field label={tr("Marinas")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label={tr("All")} on={targets.length === ids.length} onPress={() => { setTargets(targets.length === ids.length ? [] : ids); setError(""); }} />
              {ids.map((m) => <Chip key={m} label={ix.marina(m)?.name ?? m} on={targets.includes(m)} onPress={() => { setTargets(targets.includes(m) ? targets.filter((x) => x !== m) : [...targets, m]); setError(""); }} />)}
            </View>
          </Field>
        )}
        <Field label={tr("Message")} error={error}>
          <Input multiline value={text} onChangeText={(v) => { setText(v); setError(""); }} placeholder={tr("e.g. Storm coming in tonight. Double up the lines on Dock A before you leave.")} invalid={!!error && !text.trim()} />
        </Field>
        <Txt v="caption" color={t.text3}>{tr("Replies come back to you one by one in Chat.")}</Txt>
      </View>
    </Sheet>
  );
}
