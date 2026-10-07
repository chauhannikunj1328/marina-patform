// The owner's contact details and password.
import { useState } from "react";
import { t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, Card, Field, Input, Notice, usePageTitle } from "@/components/ui";

function PasswordForm() {
  const { canChangePassword, changePassword, toast } = useStore();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!canChangePassword) return <Notice>{t("The demo account's password can't be changed. Create your own account to set one.")}</Notice>;
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors({}); };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.current) e.current = t("Enter your current password.");
    if (f.next.length < 8) e.next = t("Use at least 8 characters.");
    else if (f.next !== f.again) e.again = t("The passwords don't match.");
    if (Object.keys(e).length) return setErrors(e);
    setBusy(true);
    const err = await changePassword(f.current, f.next);
    setBusy(false);
    if (err) return setErrors({ current: t(err) });
    setF({ current: "", next: "", again: "" });
    toast(t("Your password is changed"));
  };
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
      <Field label={t("Current password")} error={errors.current}>{(id) => <Input id={id} type="password" autoComplete="current-password" value={f.current} onChange={(e) => set("current", e.target.value)} />}</Field>
      <Field label={t("New password")} error={errors.next} hint={t("At least 8 characters.")}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.next} onChange={(e) => set("next", e.target.value)} />}</Field>
      <Field label={t("New password again")} error={errors.again}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.again} onChange={(e) => set("again", e.target.value)} />}</Field>
      <Button type="submit" variant="primary" disabled={busy}>{t("Change password")}</Button>
    </form>
  );
}

export function Profile() {
  const { owner, update, toast } = useStore();
  usePageTitle(t("Profile"));
  const [f, setF] = useState({ name: owner?.name ?? "", phone: owner?.phone ?? "" });
  const [error, setError] = useState<string | undefined>();
  if (!owner) return null;
  const changed = f.name !== owner.name || f.phone !== owner.phone;
  const save = () => {
    if (!f.name.trim()) return setError(t("Enter your full name."));
    update((d) => ({ ...d, owners: d.owners.map((o) => (o.id === owner.id ? { ...o, name: f.name.trim(), phone: f.phone.trim() } : o)) }));
    toast(t("Your details are saved"));
  };
  return (
    <div className="space-y-6">
      <h2 className="text-[22px] leading-[30px] font-medium">{t("Profile")}</h2>
      <Card className="max-w-xl p-6">
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
          <Field label={t("Full name")} error={error}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => { setF((s) => ({ ...s, name: e.target.value })); setError(undefined); }} />}</Field>
          <Field label={t("Email")} hint={t("To change your email, contact us.")}>{(id) => <Input id={id} type="email" value={owner.email} disabled />}</Field>
          <Field label={t("Phone")}>{(id) => <Input id={id} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />}</Field>
          <Button type="submit" variant="primary" disabled={!changed}>{t("Save changes")}</Button>
        </form>
      </Card>
      <Card className="max-w-xl p-6">
        <h3 className="mb-4 text-[17px] font-medium">{t("Password")}</h3>
        <PasswordForm />
      </Card>
    </div>
  );
}
