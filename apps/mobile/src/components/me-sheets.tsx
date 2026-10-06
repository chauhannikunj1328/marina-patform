// Sheets opened from the Me tab: time off and shift swap requests, profile and password.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { addDays, DAYS, fmtShort, fromISO, nextId, planFor, SHIFT_HOURS, today, type RequestKind } from "@marina/shared";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Chip, Field, Input, Segmented, Sheet, Stepper, Txt } from "./ui";

function DayChips({ days, value, onChange }: { days: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {days.map((d) => <Chip key={d} label={DAYS[fromISO(d).getDay()]} sub={fmtShort(d)} on={value === d} onPress={() => onChange(d)} />)}
    </ScrollView>
  );
}

export function RequestSheet({ onClose }: { onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const [kind, setKind] = useState<RequestKind>("leave");
  const [start, setStart] = useState(addDays(today(), 1));
  const [days, setDays] = useState(1);
  const [swapDay, setSwapDay] = useState("");
  const [cover, setCover] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!me) return null;
  const upcoming = Array.from({ length: 45 }, (_, i) => addDays(today(), i + 1));
  const working = upcoming.filter((d) => planFor(me, d, db.requests).working).slice(0, 20);
  const colleagues = swapDay
    ? db.staff.filter((s) => s.marinaId === me.marinaId && s.id !== me.id && s.position !== "Marina Manager" && s.status === "active" && !planFor(s, swapDay, db.requests).working)
    : [];
  const manager = db.staff.find((s) => s.marinaId === me.marinaId && s.position === "Marina Manager");
  const end = addDays(start, days - 1);

  const send = () => {
    if (kind === "leave") {
      const clash = db.requests.find((r) => r.staffId === me.id && r.kind === "leave" && r.status !== "declined" && r.start <= end && r.end >= start);
      if (clash) return setError(`You already asked for ${fmtShort(clash.start)}${clash.end !== clash.start ? ` – ${fmtShort(clash.end)}` : ""} off.`);
    } else {
      if (!swapDay) return setError("Choose the shift you want covered.");
      if (!cover) return setError("Choose who will cover it.");
    }
    if (!reason.trim()) return setError("Add a short reason for your manager.");
    const what = kind === "leave" ? `time off ${fmtShort(start)}${days > 1 ? ` – ${fmtShort(end)}` : ""}` : `a shift swap on ${fmtShort(swapDay)} with ${ix.staffMember(cover)?.name}`;
    update(
      (d) => ({
        ...d,
        requests: [...d.requests, {
          id: nextId("rq", d.requests), staffId: me.id, kind, start: kind === "leave" ? start : swapDay, end: kind === "leave" ? end : swapDay,
          swapWithId: kind === "swap" ? cover : undefined, reason: reason.trim(), status: "pending", createdAt: new Date().toISOString(),
        }],
      }),
      { text: `${me.name} asked for ${what}`, to: "/staff?tab=requests", marinaId: me.marinaId },
    );
    toast(`Request sent to ${manager?.name ?? "your manager"}`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="New request" subtitle={`Goes to ${manager?.name ?? "your marina manager"} to approve`} footer={<Button variant="primary" size="lg" label="Send request" onPress={send} />}>
      <View style={{ gap: 16 }}>
        <Segmented value={kind} onChange={(k) => { setKind(k); setError(""); }} items={[{ value: "leave", label: "Time off" }, { value: "swap", label: "Swap a shift" }]} />
        {kind === "leave" ? (
          <>
            <Field label="First day off"><DayChips days={upcoming} value={start} onChange={(d) => { setStart(d); setError(""); }} /></Field>
            <Field label="How many days?" hint={days > 1 ? `${fmtShort(start)} – ${fmtShort(end)}` : fmtShort(start)}>
              <Stepper label="days off" value={days} onChange={setDays} max={21} unit={days === 1 ? "day" : "days"} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Shift to swap" hint={`Your ${me.shift} shift, ${SHIFT_HOURS[me.shift]}`}>
              <DayChips days={working} value={swapDay} onChange={(d) => { setSwapDay(d); setCover(""); setError(""); }} />
            </Field>
            {swapDay ? (
              <Field label="Who will cover?" hint={colleagues.length ? "Colleagues at your marina who are off that day." : undefined}>
                {colleagues.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {colleagues.map((s) => <Chip key={s.id} label={s.name} sub={s.position} on={cover === s.id} onPress={() => { setCover(s.id); setError(""); }} />)}
                  </View>
                ) : (
                  <Txt v="bodySm" color={t.text3}>Nobody at your marina is off that day. Ask for time off instead, or message your manager.</Txt>
                )}
              </Field>
            ) : null}
          </>
        )}
        <Field label="Reason" error={error}>
          <Input value={reason} onChangeText={(v) => { setReason(v); setError(""); }} placeholder={kind === "leave" ? "e.g. Family wedding" : "e.g. Doctor's appointment"} invalid={!!error && !reason.trim()} />
        </Field>
      </View>
    </Sheet>
  );
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [error, setError] = useState("");
  if (!me) return null;
  const save = () => {
    if (phone.replace(/\D/g, "").length < 7) return setError("Enter a phone number your manager can reach you on.");
    update((d) => ({ ...d, staff: d.staff.map((s) => (s.id === me.id ? { ...s, phone: phone.trim() } : s)) }), { text: `${me.name} updated their phone number`, marinaId: me.marinaId });
    toast("Profile saved");
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Edit profile" footer={<Button variant="primary" size="lg" label="Save" onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="Phone" error={error}>
          <Input value={phone} onChangeText={(v) => { setPhone(v); setError(""); }} keyboardType="phone-pad" autoComplete="tel" invalid={!!error} />
        </Field>
        <View style={{ backgroundColor: t.surface3, borderRadius: 12, padding: 12, gap: 2 }}>
          <Txt v="bodySm" weight="medium">{user?.name}</Txt>
          <Txt v="bodySm" color={t.text2}>{user?.email}</Txt>
          <Txt v="caption" color={t.text3} style={{ marginTop: 4 }}>Your name, email, role and marina are managed by your marina manager.</Txt>
        </View>
      </View>
    </Sheet>
  );
}

export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const { changePassword, toast } = useStore();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({}); };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.current) e.current = "Enter your current password.";
    if (f.next.length < 8) e.next = "Use at least 8 characters.";
    else if (f.next === f.current) e.next = "Choose a password you haven't used here.";
    if (f.confirm !== f.next) e.confirm = "The two new passwords don't match.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const err = await changePassword(f.current, f.next);
    setBusy(false);
    if (err) return setErrors({ current: err });
    toast("Password changed");
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Change password" footer={<Button variant="primary" size="lg" label="Change password" loading={busy} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label="Current password" error={errors.current}><Input secure value={f.current} onChangeText={(v) => set("current", v)} autoComplete="current-password" textContentType="password" invalid={!!errors.current} /></Field>
        <Field label="New password" error={errors.next} hint="At least 8 characters."><Input secure value={f.next} onChangeText={(v) => set("next", v)} autoComplete="new-password" textContentType="newPassword" invalid={!!errors.next} /></Field>
        <Field label="Confirm new password" error={errors.confirm}><Input secure value={f.confirm} onChangeText={(v) => set("confirm", v)} autoComplete="new-password" textContentType="newPassword" invalid={!!errors.confirm} /></Field>
      </View>
    </Sheet>
  );
}
