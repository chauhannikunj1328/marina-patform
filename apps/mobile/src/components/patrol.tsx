// Patrol pieces shared by the patrol screen, Today and Team.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { fmtDateTime, type Patrol } from "@marina/shared";
import { useMe, useStore } from "../store";
import { useTheme } from "../theme";
import { Badge, Txt } from "./ui";
import { useTr } from "../lib/i18n";
import { tn } from "@marina/shared";

export function useActivePatrol() {
  const { db, marinaId } = useStore();
  const me = useMe();
  return me ? (db.patrols ?? []).find((p) => p.staffId === me.id && p.marinaId === marinaId && !p.endedAt) : undefined;
}

/** One finished round: who, when, how long, issues. */
export function PatrolSummary({ patrol: p, total }: { patrol: Patrol; total: number }) {
  const { t } = useTheme();
  const tr = useTr();
  const issues = p.checks.filter((c) => !c.ok);
  const minutes = p.endedAt ? Math.round((Date.parse(p.endedAt) - Date.parse(p.startedAt)) / 60_000) : 0;
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 4, backgroundColor: t.surface }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Txt v="bodySm" weight="semibold" style={{ flex: 1 }}>{p.by}</Txt>
        {issues.length ? <Badge tone="maintenance" label={tn(issues.length, "{n} issue", "{n} issues")} /> : <Badge tone="success" label={tr("All clear")} />}
      </View>
      <Txt v="caption" color={t.text3}>{fmtDateTime(p.startedAt)} · {tr("{minutes} min · {done} of {total} checked", { minutes, done: p.checks.length, total })}</Txt>
      {issues.map((c) => c.note ? <Txt key={c.id} v="caption" color={t.text2}>• {c.note}</Txt> : null)}
    </View>
  );
}

/** Pressable link used on Today. */
export function PatrolLink() {
  const active = useActivePatrol();
  const { t } = useTheme();
  const tr = useTr();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/patrol")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: active ? t.tealStrong : t.border, borderRadius: 16, padding: 14, marginBottom: 24, backgroundColor: pressed ? t.sidebar : t.surface })}>
      <ShieldCheck size={20} color={t.text2} />
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{active ? tr("Patrol in progress") : tr("Dock patrol")}</Txt>
        <Txt v="caption" color={t.text3}>{active ? tr("{n} checked so far. Tap to continue.", { n: active.checks.length }) : tr("Walk the docks and safety checks.")}</Txt>
      </View>
    </Pressable>
  );
}
