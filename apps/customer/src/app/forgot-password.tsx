// Ask for a password reset link (sent once the app is connected to the office).
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { Button, Field, Input, Txt } from "@/components/ui";
import { AuthShell } from "@/components/auth";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function ForgotPassword() {
  const { t } = useTheme();
  const tr = useTr();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <AuthShell title={tr("Check your email")} intro={tr("If an account exists for {email}, we've sent a link to reset your password. It expires in 30 minutes.", { email: email.trim() })}>
        <View style={{ gap: 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.success.bg, alignItems: "center", justifyContent: "center" }}><MailCheck size={22} color={t.success.fg} /></View>
          <Txt v="caption" color={t.text3}>{tr("Preview: reset emails are sent once the app is connected to the office.")}</Txt>
          <Button label={tr("Back to sign in")} onPress={() => router.back()} />
        </View>
      </AuthShell>
    );
  return (
    <AuthShell title={tr("Reset your password")} intro={tr("Enter the email you signed up with and we'll send you a reset link.")}>
      <View style={{ gap: 16 }}>
        <Field label={tr("Email")} error={error}><Input value={email} autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={(v) => { setEmail(v); setError(""); }} invalid={!!error} /></Field>
        <Button variant="primary" size="lg" label={tr("Send reset link")} onPress={() => (/^\S+@\S+\.\S+$/.test(email.trim()) ? setSent(true) : setError(tr("Enter a valid email.")))} />
      </View>
    </AuthShell>
  );
}
