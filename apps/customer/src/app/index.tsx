// Splash screen: brand mark on Slate, then into the app. Visitors can look around and search
// without an account; they sign in when they book.
import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { router } from "expo-router";
import { palette } from "@marina/shared";
import { Logomark } from "@/components/ui";
import { fonts } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Splash() {
  const tr = useTr();
  const [fade] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(12));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 480, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => router.replace("/(tabs)"), 1200);
    return () => clearTimeout(timer);
  }, [fade, rise]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.slate[800], alignItems: "center", justifyContent: "center" }} accessibilityLabel={tr("Marina Berths")}>
      <Animated.View style={{ alignItems: "center", opacity: fade, transform: [{ translateY: rise }] }}>
        <Logomark size={72} color="#FFFFFF" />
        <Text style={{ fontFamily: fonts.medium, fontSize: 30, color: "#FFFFFF", marginTop: 20, letterSpacing: -0.3 }}>{tr("Marina Berths")}</Text>
      </Animated.View>
      <Text style={{ position: "absolute", bottom: 48, fontFamily: fonts.regular, fontSize: 12, color: palette.teal[300] }}>{tr("Your berth, booked in minutes.")}</Text>
    </View>
  );
}
