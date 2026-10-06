// Scan the QR label on a berth post to open that berth. Typing the berth number works too.
import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Redirect, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera } from "lucide-react-native";
import { Button, Field, Input, StackHeader, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

/** Berth id from a label: "marinastaff://berth/<id>", a web link ending in /berth/<id>, or a bare id. */
function berthIdFromCode(data: string): string {
  return /berth\/([\w-]+)/.exec(data)?.[1] ?? data.trim();
}

export default function Scan() {
  const { db, scope, marinaId, setMarinaId, toast, user } = useStore();
  const { t } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const handled = useRef(false);

  if (!user) return <Redirect href="/login" />;

  const open = (berthId: string) => {
    const b = db.berths.find((x) => x.id === berthId);
    if (!b) return toast("That code isn't a Marina berth label.", undefined, "warning");
    if (!scope.includes(b.marinaId)) return toast("That berth isn't at one of your marinas.", undefined, "warning");
    handled.current = true;
    if (b.marinaId !== marinaId) setMarinaId(b.marinaId);
    router.replace({ pathname: "/berths", params: { open: b.id, at: String(Date.now()) } });
  };

  const typed = () => {
    const q = code.trim().toUpperCase().replace(/\s+/g, "");
    const b = db.berths.find((x) => x.marinaId === marinaId && x.code.replace("-", "") === q.replace("-", ""));
    if (!b) return setError(`No berth ${code.trim()} at this marina.`);
    open(b.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title="Scan berth" subtitle="Point the camera at the QR label on the berth post" />
      <View style={{ flex: 1, padding: 16, gap: 16 }}>
        <View style={{ flex: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => { if (!handled.current) open(berthIdFromCode(data)); }}
              />
              <View pointerEvents="none" style={{ width: 220, height: 220, borderRadius: 24, borderWidth: 3, borderColor: "#FFFFFF" }} />
            </>
          ) : (
            <View style={{ alignItems: "center", padding: 24, gap: 12 }}>
              <Camera size={32} color="#FFFFFF" strokeWidth={1.5} />
              <Txt color="#FFFFFF" style={{ textAlign: "center" }}>
                {permission && !permission.canAskAgain ? "Camera access is off. Turn it on for Marina Staff in Settings." : "Allow the camera to scan berth labels."}
              </Txt>
              {(!permission || permission.canAskAgain) && <Button variant="secondary" label="Allow camera" onPress={() => void requestPermission()} />}
            </View>
          )}
        </View>
        <Field label="Or type the berth number" error={error} hint={Platform.OS === "web" ? "Scanning works best in the phone app." : undefined}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input value={code} onChangeText={(v) => { setCode(v); setError(""); }} placeholder="e.g. A-04" autoCapitalize="characters" returnKeyType="go" onSubmitEditing={typed} invalid={!!error} />
            </View>
            <Button variant="primary" label="Open" onPress={typed} disabled={!code.trim()} />
          </View>
        </Field>
      </View>
    </View>
  );
}
