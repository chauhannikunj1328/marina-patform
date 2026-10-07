// Root: loads brand fonts behind the native splash, then hands over to the animated splash route.
import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StoreProvider, useStore } from "@/store";
import { ThemeProvider, useTheme } from "@/theme";
import { Toasts } from "@/components/ui";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Shell() {
  const { t } = useTheme();
  const { ready } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Inter_500Medium, Inter_600SemiBold });
  const loaded = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hide();
  }, [loaded]);

  if (!loaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: "fade" }}>
        <Stack.Screen name="inbox" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="scan" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="marina/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="owners" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="invoices" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="report" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="revenue" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="compare" options={{ animation: "slide_from_right" }} />
      </Stack>
      <Toasts />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StoreProvider>
          <Shell />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
