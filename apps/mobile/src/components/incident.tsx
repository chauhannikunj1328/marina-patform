// Incident report from the phone: damage, injuries, theft or spills, with photos. Managers follow it up in the web app.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { INCIDENT_LABEL, nextId, type IncidentKind } from "@marina/shared";
import { useTr } from "../lib/i18n";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { PhotoPicker } from "./sheets";
import { Button, Chip, Field, Input, Sheet, Txt } from "./ui";

const KINDS: IncidentKind[] = ["damage", "injury", "theft", "spill", "other"];

export function IncidentSheet({ marinaId, onClose }: { marinaId: string; onClose: () => void }) {
  const { db, update, toast, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const [kind, setKind] = useState<IncidentKind>("damage");
  const [serious, setSerious] = useState(false);
  const [berthId, setBerthId] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = () => {
    if (description.trim().length < 10) return setError(tr("Describe what happened."));
    const now = new Date().toISOString();
    const by = me?.name ?? user?.name ?? "Staff";
    update(
      (d) => {
        const id = nextId("ic", d.incidents ?? []);
        return { ...d, incidents: [...(d.incidents ?? []), { id, code: `INC-${String(Number(id.split("-")[1])).padStart(3, "0")}`, marinaId, kind, serious, at: now, berthId: berthId || undefined, description: description.trim(), people: people.trim() || undefined, photos, reportedBy: by, reportedAt: now, status: "open" as const, notes: [] }] };
      },
      { text: `${serious ? "Serious incident" : "Incident"} reported: ${INCIDENT_LABEL[kind].toLowerCase()}${berthId ? ` at berth ${db.berths.find((b) => b.id === berthId)?.code}` : ""}`, to: "/incidents", marinaId },
    );
    toast(tr("Incident reported. Your manager has been told."));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={tr("Report an incident")} subtitle={tr("Damage, injuries, theft or spills")} footer={<Button variant="primary" size="lg" icon={ShieldAlert} label={tr("Send report")} onPress={save} />}>
      <View style={{ gap: 16 }}>
        <Field label={tr("What happened?")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {KINDS.map((k) => <Chip key={k} label={tr(INCIDENT_LABEL[k])} on={kind === k} onPress={() => setKind(k)} />)}
          </View>
        </Field>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: serious }} onPress={() => setSerious(!serious)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: serious ? t.error.base : t.border, borderRadius: 12, padding: 12, backgroundColor: serious ? t.error.bg : "transparent" }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: serious ? t.error.base : t.primary, backgroundColor: serious ? t.error.base : "transparent" }} />
          <View style={{ flex: 1 }}>
            <Txt v="bodySm" weight="semibold">{tr("Serious")}</Txt>
            <Txt v="caption" color={t.text3}>{tr("Someone needed medical help, police were called, or there's ongoing danger. Call your manager too.")}</Txt>
          </View>
        </Pressable>
        <Field label={tr("Where (optional)")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: "", code: tr("Not at a berth") }, ...db.berths.filter((b) => b.marinaId === marinaId)].map((b) => <Chip key={b.id || "none"} label={b.code} on={berthId === b.id} onPress={() => setBerthId(b.id)} />)}
          </ScrollView>
        </Field>
        <Field label={tr("Describe what happened")} error={error}>
          <Input multiline value={description} onChangeText={(v) => { setDescription(v); setError(""); }} placeholder={tr("e.g. Visiting boat hit the end of B dock while docking. Two boards cracked, nobody hurt.")} invalid={!!error} />
        </Field>
        <Field label={tr("People involved or witnesses (optional)")}>
          <Input value={people} onChangeText={setPeople} />
        </Field>
        <PhotoPicker photos={photos} onChange={setPhotos} max={4} />
      </View>
    </Sheet>
  );
}
