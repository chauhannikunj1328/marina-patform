// Sign-in for staff. Same accounts as the web app; staff are created by their admin or manager.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { CircleAlert } from "lucide-react-native";
import { Button, Field, Input, Logo, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Login() {
  const { t } = useTheme();
  const { signIn, user } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);

  if (user) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
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
          <Txt v="h1" style={{ marginTop: 40 }}>Sign in</Txt>
          <Txt color={t.text2} style={{ marginTop: 4, marginBottom: 32 }}>Check boats in and out, see your shift and report repairs.</Txt>

          <View style={{ gap: 16 }}>
            <Field label="Work email">
              <Input
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder="you@company.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                invalid={!!error}
              />
            </Field>
            <Field label="Password">
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
            <Button variant="primary" size="lg" label={busy ? "Signing in…" : "Sign in"} loading={busy} onPress={submit} />
            <Pressable accessibilityRole="button" onPress={() => setHelp(!help)} style={{ alignSelf: "center", padding: 8 }}>
              <Txt v="bodySm" weight="semibold" color={t.greenText}>Forgot password?</Txt>
            </Pressable>
            {help && (
              <View style={{ backgroundColor: t.surface3, borderRadius: 12, padding: 12 }}>
                <Txt v="bodySm" color={t.text2}>Ask your marina manager to reset it. They manage staff accounts in the Marina web app.</Txt>
              </View>
            )}
          </View>

          {/* Prototype only: lets reviewers try the app. Remove before publishing to the stores. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use the demo staff account"
            onPress={() => { setEmail("staff@marina.com"); setPassword("staff123"); setError(""); }}
            style={({ pressed }) => ({ marginTop: 32, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, backgroundColor: pressed ? t.sidebar : t.surface })}
          >
            <Txt v="caption" color={t.text3}>Demo account · tap to fill</Txt>
            <Txt v="bodySm" weight="semibold">staff@marina.com</Txt>
          </Pressable>

          <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginTop: 32 }}>Marina Staff · version {Constants.expoConfig?.version ?? "1.0.0"}</Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
