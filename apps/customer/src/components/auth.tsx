// Shared pieces of the sign-in, sign-up and password reset screens.
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleAlert, X } from "lucide-react-native";
import { IconButton, Logo, Txt } from "@/components/ui";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

/** Where to go after signing in or creating an account. */
export function goOn(next?: string) {
  router.back();
  if (next) {
    try {
      router.push(JSON.parse(next));
    } catch {
      /* stay where we were */
    }
  }
}

export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const { t } = useTheme();
  const tr = useTr();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 4 }}>
          <IconButton icon={X} label={tr("Close")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8, maxWidth: 440, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          <Logo size={22} />
          <Txt v="h1" style={{ marginTop: 32 }}>{title}</Txt>
          <Txt color={t.text2} style={{ marginTop: 4, marginBottom: 28 }}>{intro}</Txt>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormError({ message }: { message: string }) {
  const { t } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, backgroundColor: t.error.bg, borderRadius: 12, padding: 12 }}>
      <CircleAlert size={18} color={t.error.fg} />
      <Txt v="bodySm" color={t.error.fg} style={{ flex: 1 }}>{message}</Txt>
    </View>
  );
}
