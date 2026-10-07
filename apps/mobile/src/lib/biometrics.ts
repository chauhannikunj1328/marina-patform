// Face ID / fingerprint unlock. The session stays on the phone; this only asks the phone's own
// biometrics (or passcode) before showing the app. Not available in the web preview.
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

export async function biometricInfo(): Promise<{ available: boolean; label: string }> {
  if (Platform.OS === "web") return { available: false, label: "Face ID or fingerprint" };
  const [hardware, enrolled, types] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()]);
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  return { available: hardware && enrolled, label: face ? (Platform.OS === "ios" ? "Face ID" : "face unlock") : "fingerprint" };
}

export async function biometricUnlock(reason = "Unlock Marina"): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Cancel" });
  return r.success;
}
