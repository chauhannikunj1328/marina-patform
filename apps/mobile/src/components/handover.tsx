// Hand-over notes: what the next shift needs to know. Written at clock-out (or any time), shown on Today and in Team.
import { useState } from "react";
import { View } from "react-native";
import { NotebookPen } from "lucide-react-native";
import { fmtDateTime, nextId } from "@marina/shared";
import { useNow } from "../lib/clock";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Field, Input, Sheet, Txt } from "./ui";
import { useTr } from "../lib/i18n";

/** Notes from the last 24 hours at these marinas, newest first. */
export function useHandovers(marinaIds: string[]) {
  const { db } = useStore();
  const since = useNow(60_000) - 24 * 3_600_000;
  return (db.handovers ?? []).filter((h) => marinaIds.includes(h.marinaId) && Date.parse(h.at) >= since).sort((a, b) => b.at.localeCompare(a.at));
}

export function HandoverList({ marinaIds, empty }: { marinaIds: string[]; empty?: string }) {
  const { ix } = useStore();
  const tr = useTr();
  const { t } = useTheme();
  const notes = useHandovers(marinaIds);
  if (!notes.length) return empty ? <Txt v="bodySm" color={t.text3}>{empty}</Txt> : null;
  return (
    <View style={{ gap: 8 }}>
      {notes.map((h) => (
        <View key={h.id} style={{ borderRadius: 16, padding: 14, backgroundColor: t.accentSoft, gap: 4 }}>
          <Txt>{h.text}</Txt>
          <Txt v="caption" color={t.text2}>{h.by}{h.shift ? `, ${tr("{shift} shift", { shift: tr(h.shift) })}` : ""} · {fmtDateTime(h.at)}{marinaIds.length > 1 ? ` · ${ix.marina(h.marinaId)?.name}` : ""}</Txt>
        </View>
      ))}
    </View>
  );
}

export function HandoverSheet({ marinaId, title = "Note for the next shift", onClose }: { marinaId: string; title?: string; onClose: () => void }) {
  const { update, toast, user, ix } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
  const [text, setText] = useState("");
  const save = () => {
    if (!text.trim()) return onClose();
    update((d) => ({ ...d, handovers: [...(d.handovers ?? []), { id: nextId("ho", d.handovers ?? []), marinaId, text: text.trim(), by: me?.name ?? user?.name ?? "Staff", shift: me?.shift, at: new Date().toISOString() }] }), { text: `Hand-over note left at ${ix.marina(marinaId)?.name}`, marinaId });
    toast("Note saved for the next shift");
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={title} subtitle={tr("Anything the next shift should know?")}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} size="lg" label={tr("Skip")} onPress={onClose} />
          <Button style={{ flex: 1 }} variant="primary" size="lg" icon={NotebookPen} label={tr("Save note")} disabled={!text.trim()} onPress={save} />
        </View>
      }>
      <Field label={tr("Note")} hint={tr("Shown on the Today screen for the next 24 hours.")}>
        <Input multiline value={text} onChangeText={setText} placeholder={tr("e.g. Boat on B-03 leaves early tomorrow. Pump-out is low on fuel.")} />
      </Field>
      <Txt v="caption" color={t.text3} style={{ marginTop: 8 }}>Your manager sees it too.</Txt>
    </Sheet>
  );
}
