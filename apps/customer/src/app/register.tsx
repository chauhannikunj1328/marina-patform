// Create a boat-owner account. It works on the website too once there's a shared backend; for now
// it's saved on this phone.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Field, Input, Txt } from "@/components/ui";
import { AuthShell, FormError, goOn } from "@/components/auth";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Register() {
  const { t } = useTheme();
  const tr = useTr();
  const { register } = useStore();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors({}); setError(""); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = tr("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = tr("Enter a valid email.");
    if (f.password.length < 8) e.password = tr("Use at least 8 characters.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const err = await register(f);
    setBusy(false);
    if (err) return setError(tr(err));
    goOn(next);
  };

  return (
    <AuthShell title={tr("Create an account")} intro={tr("It takes a minute. You'll use it to book berths and manage your stays.")}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Full name")} error={errors.name}><Input value={f.name} autoComplete="name" textContentType="name" onChangeText={(v) => set("name", v)} invalid={!!errors.name} /></Field>
        <Field label={tr("Email")} error={errors.email}><Input value={f.email} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" onChangeText={(v) => set("email", v)} invalid={!!errors.email} /></Field>
        <Field label={tr("Phone")} hint={tr("Optional. The dock office calls if something comes up.")}><Input value={f.phone} keyboardType="phone-pad" autoComplete="tel" onChangeText={(v) => set("phone", v)} /></Field>
        <Field label={tr("Password")} error={errors.password} hint={tr("At least 8 characters.")}><Input value={f.password} secure autoComplete="new-password" textContentType="newPassword" onChangeText={(v) => set("password", v)} invalid={!!errors.password} /></Field>
        <FormError message={error} />
        <Button variant="primary" size="lg" label={busy ? tr("Creating your account…") : tr("Create account")} loading={busy} onPress={() => void submit()} />
        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: "/sign-in", params: next ? { next } : {} })} style={{ alignSelf: "center", padding: 8 }}>
          <Txt v="bodySm" color={t.text2}>{tr("Already have an account?")} <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Sign in")}</Txt></Txt>
        </Pressable>
        <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{tr("Your account is saved only on this phone for now.")}</Txt>
      </View>
    </AuthShell>
  );
}
