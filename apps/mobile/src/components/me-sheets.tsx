// Sheets opened from the Me tab: time off and shift swap requests, profile and password.
import { useState } from "react";
import { View } from "react-native";
import { addDays, fmtShort, nextId, planFor, SHIFT_HOURS, today, type RequestKind } from "@marina/shared";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Chip, DayChips, Field, Input, Segmented, Sheet, Stepper, Txt } from "./ui";
import { useTr } from "../lib/i18n";

export function RequestSheet({ onClose }: { onClose: () => void }) {
  const { db, ix, update, toast } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
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
      if (clash) return setError(tr("You already asked for {dates} off.", { dates: clash.end !== clash.start ? `${fmtShort(clash.start)} – ${fmtShort(clash.end)}` : fmtShort(clash.start) }));
    } else {
      if (!swapDay) return setError(tr("Choose the shift you want covered."));
      if (!cover) return setError(tr("Choose who will cover it."));
    }
    if (!reason.trim()) return setError(tr("Add a short reason for your manager."));
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
    toast((manager ? tr("Request sent to {name}", { name: manager.name }) : tr("Request sent to your manager")));
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={tr("New request")} subtitle={(manager ? tr("Goes to {name} to approve", { name: manager.name }) : tr("Goes to your marina manager to approve"))} footer={<Button variant="primary" size="lg" label={tr("Send request")} onPress={send} />}>
      <View style={{ gap: 16 }}>
        <Segmented value={kind} onChange={(k) => { setKind(k); setError(""); }} items={[{ value: "leave", label: tr("Time off") }, { value: "swap", label: tr("Swap a shift") }]} />
        {kind === "leave" ? (
          <>
            <Field label={tr("First day off")}><DayChips days={upcoming} value={start} onChange={(d) => { setStart(d); setError(""); }} /></Field>
            <Field label={tr("How many days?")} hint={days > 1 ? `${fmtShort(start)} – ${fmtShort(end)}` : fmtShort(start)}>
              <Stepper label={tr("days off")} value={days} onChange={setDays} max={21} unit={days === 1 ? tr("day") : tr("days")} />
            </Field>
          </>
        ) : (
          <>
            <Field label={tr("Shift to swap")} hint={tr("Your {shift} shift, {hours}", { shift: tr(me.shift), hours: tr(SHIFT_HOURS[me.shift]) })}>
              <DayChips days={working} value={swapDay} onChange={(d) => { setSwapDay(d); setCover(""); setError(""); }} />
            </Field>
            {swapDay ? (
              <Field label={tr("Who will cover?")} hint={colleagues.length ? tr("Colleagues at your marina who are off that day.") : undefined}>
                {colleagues.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {colleagues.map((s) => <Chip key={s.id} label={s.name} sub={tr(s.position)} on={cover === s.id} onPress={() => { setCover(s.id); setError(""); }} />)}
                  </View>
                ) : (
                  <Txt v="bodySm" color={t.text3}>{tr("Nobody at your marina is off that day. Ask for time off instead, or message your manager.")}</Txt>
                )}
              </Field>
            ) : null}
          </>
        )}
        <Field label={tr("Reason")} error={error}>
          <Input value={reason} onChangeText={(v) => { setReason(v); setError(""); }} placeholder={kind === "leave" ? tr("e.g. Family wedding") : tr("e.g. Doctor's appointment")} invalid={!!error && !reason.trim()} />
        </Field>
      </View>
    </Sheet>
  );
}

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [error, setError] = useState("");
  if (!me) return null;
  const save = () => {
    if (phone.replace(/\D/g, "").length < 7) return setError(tr("Enter a phone number your manager can reach you on."));
    update((d) => ({ ...d, staff: d.staff.map((s) => (s.id === me.id ? { ...s, phone: phone.trim() } : s)) }), { text: `${me.name} updated their phone number`, marinaId: me.marinaId });
    toast(tr("Profile saved"));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Edit profile")} footer={<Button variant="primary" size="lg" label={tr("Save")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Phone")} error={error}>
          <Input value={phone} onChangeText={(v) => { setPhone(v); setError(""); }} keyboardType="phone-pad" autoComplete="tel" invalid={!!error} />
        </Field>
        <View style={{ backgroundColor: t.surface3, borderRadius: 12, padding: 12, gap: 2 }}>
          <Txt v="bodySm" weight="medium">{user?.name}</Txt>
          <Txt v="bodySm" color={t.text2}>{user?.email}</Txt>
          <Txt v="caption" color={t.text3} style={{ marginTop: 4 }}>{tr("Your name, email, role and marina are managed by your marina manager.")}</Txt>
        </View>
      </View>
    </Sheet>
  );
}

export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const tr = useTr();
  const { changePassword, toast } = useStore();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors({}); };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.current) e.current = tr("Enter your current password.");
    if (f.next.length < 8) e.next = tr("Use at least 8 characters.");
    else if (f.next === f.current) e.next = tr("Choose a password you haven't used here.");
    if (f.confirm !== f.next) e.confirm = tr("The two new passwords don't match.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const err = await changePassword(f.current, f.next);
    setBusy(false);
    if (err) return setErrors({ current: err });
    toast(tr("Password changed"));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Change password")} footer={<Button variant="primary" size="lg" label={tr("Change password")} loading={busy} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Current password")} error={errors.current}><Input secure value={f.current} onChangeText={(v) => set("current", v)} autoComplete="current-password" textContentType="password" invalid={!!errors.current} /></Field>
        <Field label={tr("New password")} error={errors.next} hint={tr("At least 8 characters.")}><Input secure value={f.next} onChangeText={(v) => set("next", v)} autoComplete="new-password" textContentType="newPassword" invalid={!!errors.next} /></Field>
        <Field label={tr("Confirm new password")} error={errors.confirm}><Input secure value={f.confirm} onChangeText={(v) => set("confirm", v)} autoComplete="new-password" textContentType="newPassword" invalid={!!errors.confirm} /></Field>
      </View>
    </Sheet>
  );
}
