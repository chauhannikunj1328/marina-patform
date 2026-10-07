// The owner's contact details.
import { useState } from "react";
import { t } from "@marina/shared";
import { useStore } from "@/data/store";
import { Button, Card, Field, Input } from "@/components/ui";

export function Profile() {
  const { owner, update, toast } = useStore();
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
    <div>
      <h2 className="mb-6 text-[22px] leading-[30px] font-medium">{t("Profile")}</h2>
      <Card className="max-w-xl p-6">
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
          <Field label={t("Full name")} error={error}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={(e) => { setF((s) => ({ ...s, name: e.target.value })); setError(undefined); }} />}</Field>
          <Field label={t("Email")} hint={t("To change your email, contact us.")}>{(id) => <Input id={id} type="email" value={owner.email} disabled />}</Field>
          <Field label={t("Phone")}>{(id) => <Input id={id} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />}</Field>
          <Button type="submit" variant="primary" disabled={!changed}>{t("Save changes")}</Button>
        </form>
      </Card>
    </div>
  );
}
