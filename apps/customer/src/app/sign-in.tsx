// Sign in for boat owners. Same accounts as the website's owner portal. After signing in, the
// owner goes on to where they were heading (e.g. booking the berth they chose).
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DEMO_OWNER_EMAIL } from "@marina/shared";
import { Button, Field, Input, Txt } from "@/components/ui";
import { AuthShell, FormError, goOn } from "@/components/auth";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function SignIn() {
  const { t } = useTheme();
  const tr = useTr();
  const { signIn } = useStore();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) return setError(tr("Enter your email and password."));
    setBusy(true);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) return setError(tr(err));
    goOn(next);
  };

  return (
    <AuthShell title={tr("Sign in")} intro={tr("See your bookings and invoices, pay online and sign contracts.")}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Email")}>
          <Input value={email} onChangeText={(v) => { setEmail(v); setError(""); }} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" returnKeyType="next" invalid={!!error} />
        </Field>
        <Field label={tr("Password")}>
          <Input value={password} onChangeText={(v) => { setPassword(v); setError(""); }} secure autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => void submit()} invalid={!!error} />
        </Field>
        <Pressable accessibilityRole="button" onPress={() => router.push("/forgot-password")} style={{ alignSelf: "flex-end", paddingVertical: 2 }}>
          <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Forgot password?")}</Txt>
        </Pressable>
        <FormError message={error} />
        <Button variant="primary" size="lg" label={busy ? tr("Signing in…") : tr("Sign in")} loading={busy} onPress={() => void submit()} />
        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: "/register", params: next ? { next } : {} })} style={{ alignSelf: "center", padding: 8 }}>
          <Txt v="bodySm" color={t.text2}>{tr("New here?")} <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Create an account")}</Txt></Txt>
        </Pressable>
      </View>

      {/* Prototype only: lets reviewers try the app. Remove before publishing to the stores. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Use the demo boat owner account")}
        onPress={() => { setEmail(DEMO_OWNER_EMAIL); setPassword("owner123"); setError(""); }}
        style={({ pressed }) => ({ marginTop: 28, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : t.surface })}
      >
        <Txt v="caption" color={t.text3}>{tr("Demo")}</Txt>
        <Txt v="bodySm" weight="semibold">{tr("Boat owner")}</Txt>
        <Txt v="caption" color={t.text3}>{DEMO_OWNER_EMAIL}</Txt>
      </Pressable>
    </AuthShell>
  );
}
