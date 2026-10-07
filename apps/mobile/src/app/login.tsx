// Sign-in for everyone: staff, marina managers and admins. Same accounts as the web app.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { CircleAlert } from "lucide-react-native";
import { Button, Field, Input, Logo, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Login() {
  const { t } = useTheme();
  const tr = useTr();
  const { signIn, user } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);

  if (user) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (!email.trim() || !password) return setError(tr("Enter your email and password."));
    setBusy(true);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
    else router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center", maxWidth: 440, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          <Logo size={24} />
          <Txt v="h1" style={{ marginTop: 40 }}>{tr("Sign in")}</Txt>
          <Txt color={t.text2} style={{ marginTop: 4, marginBottom: 32 }}>{tr("Run your marinas, berths and team from your phone.")}</Txt>

          <View style={{ gap: 16 }}>
            <Field label={tr("Work email")}>
              <Input
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder={tr("you@company.com")}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                invalid={!!error}
              />
            </Field>
            <Field label={tr("Password")}>
              <Input
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                secure
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                invalid={!!error}
              />
            </Field>
            {error ? (
              <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, backgroundColor: t.error.bg, borderRadius: 12, padding: 12 }}>
                <CircleAlert size={18} color={t.error.fg} />
                <Txt v="bodySm" color={t.error.fg} style={{ flex: 1 }}>{error}</Txt>
              </View>
            ) : null}
            <Button variant="primary" size="lg" label={busy ? tr("Signing in…") : tr("Sign in")} loading={busy} onPress={submit} />
            <Pressable accessibilityRole="button" onPress={() => setHelp(!help)} style={{ alignSelf: "center", padding: 8 }}>
              <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Forgot password?")}</Txt>
            </Pressable>
            {help && (
              <View style={{ backgroundColor: t.surface3, borderRadius: 12, padding: 12 }}>
                <Txt v="bodySm" color={t.text2}>{tr("Ask your marina manager to reset it. They manage staff accounts in the Marina web app.")}</Txt>
              </View>
            )}
          </View>

          {/* Prototype only: lets reviewers try each role. Remove before publishing to the stores. */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 32 }}>
            {[[tr("Admin"), "admin@marina.com", "admin123"], [tr("Manager"), "manager@marina.com", "manager123"], [tr("Staff"), "staff@marina.com", "staff123"]].map(([role, mail, pw]) => (
              <Pressable
                key={role}
                accessibilityRole="button"
                accessibilityLabel={`Use the demo ${role.toLowerCase()} account`}
                onPress={() => { setEmail(mail); setPassword(pw); setError(""); }}
                style={({ pressed }) => ({ flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 10, backgroundColor: pressed ? t.sidebar : t.surface })}
              >
                <Txt v="caption" color={t.text3}>{tr("Demo")}</Txt>
                <Txt v="bodySm" weight="semibold">{role}</Txt>
              </Pressable>
            ))}
          </View>

          <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginTop: 32 }}>Marina · version {Constants.expoConfig?.version ?? "1.0.0"}</Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
