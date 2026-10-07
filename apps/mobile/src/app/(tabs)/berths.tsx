// Berths: colour-coded dock map with status filters; tap a berth for details and actions.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Warehouse } from "lucide-react-native";
import type { BerthStatus } from "@marina/shared";
import { EmptyState, Screen, Txt } from "@/components/ui";
import { berthLabel } from "@/components/status";
import { BerthSheet, ReportProblem } from "@/components/sheets";
import { useOpenParam } from "@/lib/useOpenParam";
import { ALL, useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Berths() {
  const { db, ix, ids, marinaId, setMarinaId } = useStore();
  const { t } = useTheme();
  const tr = useTr();
  const [filter, setFilter] = useState<"all" | BerthStatus>("all");
  const [openId, setOpenId] = useOpenParam();
  const open = db.berths.find((b) => b.id === openId);
  const [reportFor, setReportFor] = useState<string | undefined>();
  const fill: Record<BerthStatus, { bg: string; fg: string; border: string; dashed?: boolean }> = {
    occupied: { bg: t.tealStrong, fg: t.onTealStrong, border: t.tealStrong },
    reserved: { bg: t.tealSoft, fg: t.onTealSoft, border: t.tealSoft },
    available: { bg: t.surface, fg: t.text, border: t.borderStrong },
    maintenance: { bg: t.status.maintenance.bg, fg: t.status.maintenance.fg, border: t.status.maintenance.fg, dashed: true },
  };
  const berths = db.berths.filter((b) => ids.includes(b.marinaId)).map((b) => ({ b, st: ix.berthStatus(b) }));
  const allMarinas = marinaId === ALL;
  const shown = berths.filter((x) => filter === "all" || x.st === filter);
  const docks = new Map<string, typeof shown>();
  shown.forEach((x) => docks.set(x.b.code.split("-")[0], [...(docks.get(x.b.code.split("-")[0]) ?? []), x]));

  return (
    <Screen title={tr("Berths")}>
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
              <Txt v="label" color={t.text3} numberOfLines={1}>{s === "maintenance" ? tr("Repair") : tr(berthLabel[s])}</Txt>
            </Pressable>
          );
        })}
      </View>
      {allMarinas && filter === "all" && (
        <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
          {ids.map((id, i) => {
            const here = berths.filter((x) => x.b.marinaId === id);
            const n = (st: BerthStatus) => here.filter((x) => x.st === st).length;
            return (
              <Pressable key={id} accessibilityRole="button" accessibilityLabel={tr("{name}: open its dock map", { name: ix.marina(id)?.name })} onPress={() => setMarinaId(id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
                <View style={{ flex: 1 }}>
                  <Txt weight="medium" numberOfLines={1}>{ix.marina(id)?.name}</Txt>
                  <Txt v="caption" num color={t.text3}>{tr("{free} free · {occupied} occupied · {reserved} reserved", { free: n("available"), occupied: n("occupied"), reserved: n("reserved") })}{n("maintenance") ? tr(" · {n} in repair", { n: n("maintenance") }) : ""}</Txt>
                </View>
                <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Dock map")}</Txt>
              </Pressable>
            );
          })}
        </View>
      )}
      {allMarinas && filter !== "all" && (
        <View style={{ gap: 16 }}>
          {ids.filter((id) => shown.some((x) => x.b.marinaId === id)).map((id) => (
            <View key={id} style={{ gap: 8 }}>
              <Txt v="label">{ix.marina(id)?.name}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {shown.filter((x) => x.b.marinaId === id).map(({ b, st }) => (
                  <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={tr("Berth {code} at {name}, {status}", { code: b.code, name: ix.marina(id)?.name, status: tr(berthLabel[st]) })} onPress={() => setOpenId(b.id)} style={{ minWidth: 72, paddingHorizontal: 12, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: fill[st].bg, borderWidth: 1, borderColor: fill[st].border, borderStyle: fill[st].dashed ? "dashed" : "solid" }}>
                    <Txt v="bodySm" weight="semibold" num color={fill[st].fg}>{b.code}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {!allMarinas && [...docks.entries()].map(([dock, list]) => (
        <View key={dock} style={{ marginBottom: 20 }}>
          <Txt v="label" style={{ marginBottom: 8 }}>{tr("Dock")} {dock}</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {list.map(({ b, st }) => {
              const f = fill[st];
              return (
                <Pressable
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityLabel={tr("Berth {code}, {maxLength} feet, {status}", { code: b.code, maxLength: b.maxLength, status: tr(berthLabel[st]) })}
                  onPress={() => setOpenId(b.id)}
                  style={({ pressed }) => ({ width: "23%", height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: f.bg, borderWidth: 1, borderColor: f.border, borderStyle: f.dashed ? "dashed" : "solid", transform: [{ scale: pressed ? 0.95 : 1 }] })}
                >
                  <Txt weight="semibold" num color={f.fg}>{b.code.split("-")[1]}</Txt>
                  <Txt v="caption" num color={f.fg} style={{ opacity: 0.8 }}>{b.maxLength} {tr("ft")}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      {shown.length === 0 && <EmptyState icon={Warehouse} title={tr("No berths with this status")} />}
      {open && <BerthSheet berth={open} onClose={() => setOpenId(undefined)} onReport={() => { setReportFor(open.id); setOpenId(undefined); }} />}
      {reportFor && <ReportProblem berthId={reportFor} onClose={() => setReportFor(undefined)} />}
    </Screen>
  );
}
