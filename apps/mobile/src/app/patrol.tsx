// Dock patrol: walk each dock (scan any berth label there, or tick it) and the safety checks.
// Issues can be noted and turned into a repair report. Managers see finished rounds in Team.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { CircleCheck, Flag, ScanLine, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { PatrolSummary, useActivePatrol } from "@/components/patrol";
import { fmtTime, nextId, patrolCheckpoints, type Patrol, type PatrolCheck } from "@marina/shared";
import { ReportProblem } from "@/components/sheets";
import { Badge, Button, Field, Input, Screen, Section, Sheet, StackHeader, Txt } from "@/components/ui";
import { useMe, useStore } from "@/store";
import { useTheme } from "@/theme";

export default function PatrolScreen() {
  const { db, ix, update, toast, user, marinaId } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const active = useActivePatrol();
  const [issueFor, setIssueFor] = useState<{ id: string; label: string } | undefined>();
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);
  if (!user) return <Redirect href="/login" />;
  const points = patrolCheckpoints(db.berths.filter((b) => b.marinaId === marinaId));
  const recent = (db.patrols ?? []).filter((p) => p.marinaId === marinaId && p.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5);

  const setCheck = (check: PatrolCheck) =>
    update((d) => ({ ...d, patrols: (d.patrols ?? []).map((p) => (p.id === active?.id ? { ...p, checks: [...p.checks.filter((c) => c.id !== check.id), check] } : p)) }));
  const start = () => {
    if (!me) return toast("Your account isn't linked to a staff record.", undefined, "warning");
    const patrol: Patrol = { id: nextId("pt", db.patrols ?? []), marinaId, staffId: me.id, by: me.name, startedAt: new Date().toISOString(), checks: [] };
    update((d) => ({ ...d, patrols: [...(d.patrols ?? []), patrol] }), { text: `${me.name} started a dock patrol`, marinaId });
  };
  const finish = () => {
    if (!active) return;
    const issues = active.checks.filter((c) => !c.ok).length;
    const missed = points.length - active.checks.length;
    update((d) => ({ ...d, patrols: (d.patrols ?? []).map((p) => (p.id === active.id ? { ...p, endedAt: new Date().toISOString() } : p)) }), { text: `${active.by} finished a dock patrol: ${issues ? `${issues} ${issues === 1 ? "issue" : "issues"}` : "all clear"}${missed ? `, ${missed} not checked` : ""}`, marinaId });
    toast(issues ? `Patrol saved with ${issues} ${issues === 1 ? "issue" : "issues"}` : "Patrol done. All clear.");
  };

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title="Dock patrol" subtitle={ix.marina(marinaId)?.name} />
        <Screen>
          <View style={{ borderRadius: 16, padding: 16, backgroundColor: t.accentSoft, gap: 8, marginBottom: 24 }}>
            <ShieldCheck size={24} color={t.text} />
            <Txt weight="semibold">Walk every dock and check safety</Txt>
            <Txt v="bodySm" color={t.text2}>{points.filter((p) => p.kind === "dock").length} docks and {points.filter((p) => p.kind === "safety").length} safety checks. Scan any berth label on a dock to check it off.</Txt>
            <Button variant="primary" label="Start patrol" onPress={start} style={{ alignSelf: "flex-start", marginTop: 4 }} />
          </View>
          <Section title="Recent rounds">
            {recent.length === 0 ? <Txt v="bodySm" color={t.text3}>No finished patrols yet.</Txt> : recent.map((p) => <PatrolSummary key={p.id} patrol={p} total={points.length} />)}
          </Section>
        </Screen>
      </View>
    );
  }

  const done = active.checks.length;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title="Dock patrol" subtitle={`Started ${fmtTime(active.startedAt)} · ${done} of ${points.length} checked`} />
      <Screen>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface3, overflow: "hidden", marginBottom: 16 }}>
          <View style={{ width: `${Math.round((done / points.length) * 100)}%`, height: "100%", backgroundColor: t.tealStrong }} />
        </View>
        <Button icon={ScanLine} label="Scan a berth label" onPress={() => router.push({ pathname: "/scan", params: { patrol: "1" } })} style={{ marginBottom: 16 }} />
        {(["dock", "safety"] as const).map((kind) => (
          <Section key={kind} title={kind === "dock" ? "Docks" : "Safety"}>
            {points.filter((p) => p.kind === kind).map((p) => {
              const c = active.checks.find((x) => x.id === p.id);
              return (
                <View key={p.id} style={{ borderWidth: 1, borderColor: c && !c.ok ? t.status.maintenance.fg : t.border, borderRadius: 14, padding: 12, gap: 8, backgroundColor: t.surface }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Txt weight="medium" style={{ flex: 1 }}>{p.label}</Txt>
                    {c ? (c.ok ? <Badge tone="success" icon={CircleCheck} label={c.scanned ? `Scanned ${fmtTime(c.at)}` : `OK ${fmtTime(c.at)}`} /> : <Badge tone="maintenance" icon={TriangleAlert} label="Issue" />) : null}
                  </View>
                  {c?.note ? <Txt v="bodySm" color={t.text2}>{c.note}</Txt> : null}
                  {!c && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button style={{ flex: 1 }} size="sm" icon={CircleCheck} label="OK" onPress={() => setCheck({ id: p.id, at: new Date().toISOString(), ok: true })} />
                      <Button style={{ flex: 1 }} size="sm" icon={Flag} label="Issue" onPress={() => { setIssueFor(p); setNote(""); }} />
                    </View>
                  )}
                </View>
              );
            })}
          </Section>
        ))}
        <Button variant="primary" size="lg" label={done < points.length ? `Finish (${points.length - done} not checked)` : "Finish patrol"} onPress={finish} />
      </Screen>
      {issueFor && (
        <Sheet open onClose={() => setIssueFor(undefined)} title={`Issue: ${issueFor.label}`}
          footer={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button style={{ flex: 1 }} size="lg" label="Report as repair" onPress={() => { setCheck({ id: issueFor.id, at: new Date().toISOString(), ok: false, note: note.trim() || undefined }); setIssueFor(undefined); setReporting(true); }} />
              <Button style={{ flex: 1 }} variant="primary" size="lg" label="Save" onPress={() => { setCheck({ id: issueFor.id, at: new Date().toISOString(), ok: false, note: note.trim() || undefined }); setIssueFor(undefined); }} />
            </View>
          }>
          <Field label="What's wrong?">
            <Input multiline value={note} onChangeText={setNote} placeholder="e.g. Life ring missing at the end of Dock B" />
          </Field>
        </Sheet>
      )}
      {reporting && <ReportProblem onClose={() => setReporting(false)} />}
    </View>
  );
}

