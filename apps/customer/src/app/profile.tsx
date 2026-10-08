// The owner's contact details and password.
import { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { Button, Card, Field, Input, StackHeader, Txt } from "@/components/ui";
import { Body } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

function PasswordCard() {
  const { t } = useTheme();
  const tr = useTr();
  const { canChangePassword, changePassword, toast } = useStore();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors({}); };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.current) e.current = tr("Enter your current password.");
    if (f.next.length < 8) e.next = tr("Use at least 8 characters.");
    else if (f.next !== f.again) e.again = tr("The passwords don't match.");
    if (Object.keys(e).length) return setErrors(e);
    setBusy(true);
    const err = await changePassword(f.current, f.next);
    setBusy(false);
    if (err) return setErrors({ current: tr(err) });
    setF({ current: "", next: "", again: "" });
    toast(tr("Your password is changed"));
  };
  return (
    <Card style={{ gap: 14 }}>
      <Txt v="h3">{tr("Password")}</Txt>
      {!canChangePassword ? (
        <Txt v="bodySm" color={t.text3}>{tr("The demo account's password can't be changed. Create your own account to set one.")}</Txt>
      ) : (
        <>
          <Field label={tr("Current password")} error={errors.current}><Input secure value={f.current} onChangeText={(v) => set("current", v)} autoComplete="current-password" invalid={!!errors.current} /></Field>
          <Field label={tr("New password")} error={errors.next} hint={tr("At least 8 characters.")}><Input secure value={f.next} onChangeText={(v) => set("next", v)} autoComplete="new-password" invalid={!!errors.next} /></Field>
          <Field label={tr("New password again")} error={errors.again}><Input secure value={f.again} onChangeText={(v) => set("again", v)} autoComplete="new-password" invalid={!!errors.again} /></Field>
          <Button variant="primary" label={tr("Change password")} loading={busy} onPress={() => void save()} />
        </>
      )}
    </Card>
  );
}

export default function Profile() {
  const { t } = useTheme();
  const tr = useTr();
  const { owner, update, toast } = useStore();
  const [f, setF] = useState({ name: owner?.name ?? "", phone: owner?.phone ?? "" });
  const [error, setError] = useState("");
  if (!owner) return <Redirect href="/sign-in" />;
  const changed = f.name !== owner.name || f.phone !== owner.phone;
  const save = () => {
    if (!f.name.trim()) return setError(tr("Enter your full name."));
    update((d) => ({ ...d, owners: d.owners.map((o) => (o.id === owner.id ? { ...o, name: f.name.trim(), phone: f.phone.trim() } : o)) }));
    toast(tr("Your details are saved"));
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Profile")} />
      <Body>
        <Card style={{ gap: 14 }}>
          <Field label={tr("Full name")} error={error}><Input value={f.name} autoComplete="name" onChangeText={(v) => { setF((s) => ({ ...s, name: v })); setError(""); }} invalid={!!error} /></Field>
          <Field label={tr("Email")} hint={tr("To change your email, contact us.")}><Input value={owner.email} editable={false} style={{ color: t.text3 }} /></Field>
          <Field label={tr("Phone")}><Input value={f.phone} keyboardType="phone-pad" autoComplete="tel" onChangeText={(v) => setF((s) => ({ ...s, phone: v }))} /></Field>
          <Button variant="primary" label={tr("Save changes")} disabled={!changed} onPress={save} />
        </Card>
        <PasswordCard />
      </Body>
    </View>
  );
}
