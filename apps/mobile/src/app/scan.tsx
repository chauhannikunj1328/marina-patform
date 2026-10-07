// Scan the QR label on a berth post to open that berth. Typing the berth number works too.
import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera } from "lucide-react-native";
import { Button, Field, Input, StackHeader, Txt } from "@/components/ui";
import { ALL, useMe, useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

/** Berth id from a label: "marinastaff://berth/<id>", a web link ending in /berth/<id>, or a bare id. */
function berthIdFromCode(data: string): string {
  return /berth\/([\w-]+)/.exec(data)?.[1] ?? data.trim();
}

export default function Scan() {
  const { db, scope, marinaId, setMarinaId, toast, user, update } = useStore();
  const me = useMe();
  const params = useLocalSearchParams<{ patrol?: string }>();
  const { t } = useTheme();
  const tr = useTr();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const handled = useRef(false);

  if (!user) return <Redirect href="/login" />;

  const open = (berthId: string) => {
    const b = db.berths.find((x) => x.id === berthId);
    if (!b) return toast(tr("That code isn't a Marina berth label."), undefined, "warning");
    if (!scope.includes(b.marinaId)) return toast(tr("That berth isn't at one of your marinas."), undefined, "warning");
    handled.current = true;
    // During a patrol, a scan checks off that berth's dock and goes back to the round.
    const patrol = params.patrol && me ? (db.patrols ?? []).find((p) => p.staffId === me.id && p.marinaId === b.marinaId && !p.endedAt) : undefined;
    if (patrol) {
      const dock = `dock-${b.code.split("-")[0]}`;
      update((d) => ({ ...d, patrols: (d.patrols ?? []).map((p) => (p.id === patrol.id ? { ...p, checks: [...p.checks.filter((c) => c.id !== dock), { id: dock, at: new Date().toISOString(), ok: true, scanned: true }] } : p)) }));
      toast(tr("Dock {v} checked", { v: b.code.split("-")[0] }));
      return router.back();
    }
    if (b.marinaId !== marinaId) setMarinaId(b.marinaId);
    router.replace({ pathname: "/berths", params: { open: b.id, at: String(Date.now()) } });
  };

  const typed = () => {
    const q = code.trim().toUpperCase().replace(/\s+/g, "");
    const matches = db.berths.filter((x) => (marinaId === ALL ? scope.includes(x.marinaId) : x.marinaId === marinaId) && x.code.replace("-", "") === q.replace("-", ""));
    if (!matches.length) return setError((marinaId === ALL ? tr("No berth {code} at your marinas.", { code: code.trim() }) : tr("No berth {code} at this marina.", { code: code.trim() })));
    if (matches.length > 1) return setError(tr("{n} marinas have a berth {trim}. Choose a marina at the top first.", { n: matches.length, trim: code.trim() }));
    open(matches[0].id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Scan berth")} subtitle={tr("Point the camera at the QR label on the berth post")} />
      <View style={{ flex: 1, padding: 16, gap: 16 }}>
        <View style={{ flex: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={{ position: "absolute", top: 0, start: 0, end: 0, bottom: 0 }}
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
                {permission && !permission.canAskAgain ? tr("Camera access is off. Turn it on for Marina in Settings.") : tr("Allow the camera to scan berth labels.")}
              </Txt>
              {(!permission || permission.canAskAgain) && <Button variant="secondary" label={tr("Allow camera")} onPress={() => void requestPermission()} />}
            </View>
          )}
        </View>
        <Field label={tr("Or type the berth number")} error={error} hint={Platform.OS === "web" ? tr("Scanning works best in the phone app.") : undefined}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input value={code} onChangeText={(v) => { setCode(v); setError(""); }} placeholder={tr("e.g. A-04")} autoCapitalize="characters" returnKeyType="go" onSubmitEditing={typed} invalid={!!error} />
            </View>
            <Button variant="primary" label={tr("Open")} onPress={typed} disabled={!code.trim()} />
          </View>
        </Field>
      </View>
    </View>
  );
}
