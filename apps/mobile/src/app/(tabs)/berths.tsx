// Berths: colour-coded dock map with status filters; tap a berth for details and actions.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Warehouse } from "lucide-react-native";
import type { Berth, BerthStatus } from "@marina/shared";
import { EmptyState, Screen, Txt } from "@/components/ui";
import { berthLabel } from "@/components/status";
import { BerthSheet, ReportProblem } from "@/components/sheets";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

export default function Berths() {
  const { db, ix, marinaId } = useStore();
  const { t } = useTheme();
  const [filter, setFilter] = useState<"all" | BerthStatus>("all");
  const [open, setOpen] = useState<Berth | undefined>();
  const [reportFor, setReportFor] = useState<string | undefined>();
  const fill: Record<BerthStatus, { bg: string; fg: string; border: string; dashed?: boolean }> = {
    occupied: { bg: t.tealStrong, fg: t.onTealStrong, border: t.tealStrong },
    reserved: { bg: t.tealSoft, fg: t.onTealSoft, border: t.tealSoft },
    available: { bg: t.surface, fg: t.text, border: t.borderStrong },
    maintenance: { bg: t.status.maintenance.bg, fg: t.status.maintenance.fg, border: t.status.maintenance.fg, dashed: true },
  };
  const berths = db.berths.filter((b) => b.marinaId === marinaId).map((b) => ({ b, st: ix.berthStatus(b) }));
  const shown = berths.filter((x) => filter === "all" || x.st === filter);
  const docks = new Map<string, typeof shown>();
  shown.forEach((x) => docks.set(x.b.code.split("-")[0], [...(docks.get(x.b.code.split("-")[0]) ?? []), x]));

  return (
    <Screen title="Berths">
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {(["available", "occupied", "reserved", "maintenance"] as BerthStatus[]).map((s) => {
          const on = filter === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${berthLabel[s]}: ${berths.filter((x) => x.st === s).length}`}
              onPress={() => setFilter(on ? "all" : s)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? t.primary : t.border, backgroundColor: t.surface }}
            >
              <Txt v="h3" num weight="semibold">{berths.filter((x) => x.st === s).length}</Txt>
              <Txt v="label" color={t.text3} numberOfLines={1}>{s === "maintenance" ? "Repair" : berthLabel[s]}</Txt>
            </Pressable>
          );
        })}
      </View>
      {[...docks.entries()].map(([dock, list]) => (
        <View key={dock} style={{ marginBottom: 20 }}>
          <Txt v="label" style={{ marginBottom: 8 }}>Dock {dock}</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {list.map(({ b, st }) => {
              const f = fill[st];
              return (
                <Pressable
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Berth ${b.code}, ${b.maxLength} feet, ${berthLabel[st]}`}
                  onPress={() => setOpen(b)}
                  style={({ pressed }) => ({ width: "23%", height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: f.bg, borderWidth: 1, borderColor: f.border, borderStyle: f.dashed ? "dashed" : "solid", transform: [{ scale: pressed ? 0.95 : 1 }] })}
                >
                  <Txt weight="semibold" num color={f.fg}>{b.code.split("-")[1]}</Txt>
                  <Txt v="caption" num color={f.fg} style={{ opacity: 0.8 }}>{b.maxLength} ft</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      {shown.length === 0 && <EmptyState icon={Warehouse} title="No berths with this status" />}
      {open && <BerthSheet berth={open} onClose={() => setOpen(undefined)} onReport={() => { setReportFor(open.id); setOpen(undefined); }} />}
      {reportFor && <ReportProblem berthId={reportFor} onClose={() => setReportFor(undefined)} />}
    </Screen>
  );
}
