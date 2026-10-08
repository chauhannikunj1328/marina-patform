// Root: loads brand fonts behind the native splash, then hands over to the animated splash route.
import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { StoreProvider, useStore } from "@/store";
import { ThemeProvider, useTheme } from "@/theme";
import { Toasts } from "@/components/ui";
import { LangProvider } from "@/lib/i18n";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Shell() {
  const { t } = useTheme();
  const { ready } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Inter_500Medium, Inter_600SemiBold, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold });
  const loaded = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  if (!loaded) return null;
  const slide = { animation: "slide_from_right" } as const;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: "fade" }}>
        <Stack.Screen name="sign-in" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="register" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="forgot-password" options={slide} />
        <Stack.Screen name="results" options={slide} />
        <Stack.Screen name="checkout" options={slide} />
        <Stack.Screen name="marinas" options={slide} />
        <Stack.Screen name="marina/[id]" options={slide} />
        <Stack.Screen name="invoice/[id]" options={slide} />
        <Stack.Screen name="boats" options={slide} />
        <Stack.Screen name="contracts" options={slide} />
        <Stack.Screen name="profile" options={slide} />
      </Stack>
      <Toasts />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LangProvider>
          <StoreProvider>
            <Shell />
          </StoreProvider>
        </LangProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
