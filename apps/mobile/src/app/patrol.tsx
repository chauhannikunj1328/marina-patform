// Dock patrol: walk each dock (scan any berth label there, or tick it) and the safety checks.
// Issues can be noted and turned into a repair report. Managers see finished rounds in Team.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { CircleCheck, Flag, ScanLine, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { PatrolSummary, useActivePatrol } from "@/components/patrol";
import { fmtTime, nextId, patrolCheckpoints, type Patrol, type PatrolCheck, zoneOf } from "@marina/shared";
import { ReportProblem } from "@/components/sheets";
import { Badge, Button, Field, Input, Screen, Section, Sheet, StackHeader, Txt } from "@/components/ui";
import { useMe, useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

export default function PatrolScreen() {
  const { db, ix, update, toast, user, marinaId } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const tr = useTr();
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
    if (!me) return toast(tr("Your account isn't linked to a staff record."), undefined, "warning");
    const patrol: Patrol = { id: nextId("pt", db.patrols ?? []), marinaId, staffId: me.id, by: me.name, startedAt: new Date().toISOString(), checks: [] };
    update((d) => ({ ...d, patrols: [...(d.patrols ?? []), patrol] }), { text: `${me.name} started a dock patrol`, marinaId });
  };
  const finish = () => {
    if (!active) return;
    const issues = active.checks.filter((c) => !c.ok).length;
    const missed = points.length - active.checks.length;
    update((d) => ({ ...d, patrols: (d.patrols ?? []).map((p) => (p.id === active.id ? { ...p, endedAt: new Date().toISOString() } : p)) }), { text: `${active.by} finished a dock patrol: ${issues ? `${issues} ${issues === 1 ? "issue" : "issues"}` : "all clear"}${missed ? `, ${missed} not checked` : ""}`, marinaId });
    toast(issues ? tn(issues, "Patrol saved with {n} issue", "Patrol saved with {n} issues") : tr("Patrol done. All clear."));
  };

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title={tr("Dock patrol")} subtitle={ix.marina(marinaId)?.name} />
        <Screen>
          <View style={{ borderRadius: 16, padding: 16, backgroundColor: t.accentSoft, gap: 8, marginBottom: 24 }}>
            <ShieldCheck size={24} color={t.text} />
            <Txt weight="semibold">{tr("Walk every dock and check safety")}</Txt>
            <Txt v="bodySm" color={t.text2}>{tr("{docks} docks and {checks} safety checks. Scan any berth label on a dock to check it off.", { docks: points.filter((p) => p.kind === "dock").length, checks: points.filter((p) => p.kind === "safety").length })}</Txt>
            <Button variant="primary" label={tr("Start patrol")} onPress={start} style={{ alignSelf: "flex-start", marginTop: 4 }} />
          </View>
          <Section title={tr("Recent rounds")}>
            {recent.length === 0 ? <Txt v="bodySm" color={t.text3}>{tr("No finished patrols yet.")}</Txt> : recent.map((p) => <PatrolSummary key={p.id} patrol={p} total={points.length} />)}
          </Section>
        </Screen>
      </View>
    );
  }

  const done = active.checks.length;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Dock patrol")} subtitle={tr("Started {startedAt} · {done} of {n} checked", { startedAt: fmtTime(active.startedAt, zoneOf(active.marinaId)), done: done, n: points.length })} />
      <Screen>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface3, overflow: "hidden", marginBottom: 16 }}>
          <View style={{ width: `${Math.round((done / points.length) * 100)}%`, height: "100%", backgroundColor: t.tealStrong }} />
        </View>
        <Button icon={ScanLine} label={tr("Scan a berth label")} onPress={() => router.push({ pathname: "/scan", params: { patrol: "1" } })} style={{ marginBottom: 16 }} />
        {(["dock", "safety"] as const).map((kind) => (
          <Section key={kind} title={kind === "dock" ? tr("Docks") : tr("Safety")}>
            {points.filter((p) => p.kind === kind).map((p) => {
              const c = active.checks.find((x) => x.id === p.id);
              return (
                <View key={p.id} style={{ borderWidth: 1, borderColor: c && !c.ok ? t.status.maintenance.fg : t.border, borderRadius: 14, padding: 12, gap: 8, backgroundColor: t.surface }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Txt weight="medium" style={{ flex: 1 }}>{tr(p.label)}</Txt>
                    {c ? (c.ok ? <Badge tone="success" icon={CircleCheck} label={c.scanned ? tr("Scanned {at}", { at: fmtTime(c.at, zoneOf(active.marinaId)) }) : tr("OK {at}", { at: fmtTime(c.at, zoneOf(active.marinaId)) })} /> : <Badge tone="maintenance" icon={TriangleAlert} label={tr("Issue")} />) : null}
                  </View>
                  {c?.note ? <Txt v="bodySm" color={t.text2}>{c.note}</Txt> : null}
                  {!c && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button style={{ flex: 1 }} size="sm" icon={CircleCheck} label={tr("OK")} onPress={() => setCheck({ id: p.id, at: new Date().toISOString(), ok: true })} />
                      <Button style={{ flex: 1 }} size="sm" icon={Flag} label={tr("Issue")} onPress={() => { setIssueFor(p); setNote(""); }} />
                    </View>
                  )}
                </View>
              );
            })}
          </Section>
        ))}
        <Button variant="primary" size="lg" label={done < points.length ? tr("Finish ({v} not checked)", { v: points.length - done }) : tr("Finish patrol")} onPress={finish} />
      </Screen>
      {issueFor && (
        <Sheet open onClose={() => setIssueFor(undefined)} title={tr("Issue: {label}", { label: issueFor.label })}
          footer={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button style={{ flex: 1 }} size="lg" label={tr("Report as repair")} onPress={() => { setCheck({ id: issueFor.id, at: new Date().toISOString(), ok: false, note: note.trim() || undefined }); setIssueFor(undefined); setReporting(true); }} />
              <Button style={{ flex: 1 }} variant="primary" size="lg" label={tr("Save")} onPress={() => { setCheck({ id: issueFor.id, at: new Date().toISOString(), ok: false, note: note.trim() || undefined }); setIssueFor(undefined); }} />
            </View>
          }>
          <Field label={tr("What's wrong?")}>
            <Input multiline value={note} onChangeText={setNote} placeholder={tr("e.g. Life ring missing at the end of Dock B")} />
          </Field>
        </Sheet>
      )}
      {reporting && <ReportProblem onClose={() => setReporting(false)} />}
    </View>
  );
}

