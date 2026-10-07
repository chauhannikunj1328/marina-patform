// Full-screen lock shown when Face ID / fingerprint unlock is on and the app opens or returns.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Fingerprint } from "lucide-react-native";
import { palette } from "@marina/shared";
import { biometricInfo, biometricUnlock } from "../lib/biometrics";
import { useStore } from "../store";
import { Button, Logomark, Txt } from "./ui";

export function LockScreen() {
  const { locked, unlock, signOut, user } = useStore();
  const [label, setLabel] = useState("Face ID or fingerprint");
  const [failed, setFailed] = useState(false);
  const tryUnlock = async () => {
    const ok = await biometricUnlock();
    setFailed(!ok);
    if (ok) unlock();
  };
  useEffect(() => {
    if (!locked) return;
    void biometricInfo().then((i) => setLabel(i.label));
    void biometricUnlock().then((ok) => {
      setFailed(!ok);
      if (ok) unlock();
    });
    // Prompt once each time the lock appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);
  if (!locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.slate[800], alignItems: "center", justifyContent: "center", padding: 32, gap: 16, zIndex: 100 }]} accessibilityViewIsModal>
      <Logomark size={56} color="#FFFFFF" />
      <Txt v="h2" color="#FFFFFF">Marina is locked</Txt>
      <Txt v="bodySm" color={palette.teal[200]} style={{ textAlign: "center" }}>{user?.name}. Use {label} to open the app.</Txt>
      {failed && <Txt v="bodySm" color="#FFFFFF">That didn&apos;t work. Try again.</Txt>}
      <Button variant="secondary" size="lg" icon={Fingerprint} label={`Unlock with ${label}`} onPress={tryUnlock} style={{ alignSelf: "stretch" }} />
      <Pressable accessibilityRole="button" onPress={() => { signOut(); unlock(); router.replace("/login"); }} hitSlop={8}>
        <Txt v="bodySm" weight="semibold" color={palette.teal[200]}>Sign out instead</Txt>
      </Pressable>
    </View>
  );
}
