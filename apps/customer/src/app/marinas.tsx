// All marinas, filterable by state, with each one's size and lowest nightly rate.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { marinaFacts, money, openMarinas, stateOf } from "@marina/shared";
import { Card, Chip, StackHeader, Txt } from "@/components/ui";
import { Body } from "@/components/parts";
import { useStore } from "@/store";
import { flipRtl, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Marinas() {
  const { t } = useTheme();
  const tr = useTr();
  const { db, ix } = useStore();
  const all = openMarinas(db);
  const states = [...new Set(all.map((m) => stateOf(db, m)))];
  const [state, setState] = useState("");
  const shown = state ? all.filter((m) => stateOf(db, m) === state) : all;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Marinas")} subtitle={tr("{n} marinas", { n: all.length })} />
      <Body>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["", ...states].map((s) => <Chip key={s || "all"} label={`${s ? tr(s) : tr("All locations")} ${s ? all.filter((m) => stateOf(db, m) === s).length : all.length}`} on={state === s} onPress={() => setState(s)} />)}
        </ScrollView>
        {shown.map((m) => {
          const f = marinaFacts(db, m.id);
          return (
            <Card key={m.id} onPress={() => router.push({ pathname: "/marina/[id]", params: { id: m.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="caption" color={t.text3}>{ix.city(m.cityId)?.name}, {tr(stateOf(db, m))}</Txt>
                <Txt weight="medium">{m.name}</Txt>
                <Txt v="caption" color={t.text3}>{tr("{n} berths · boats up to {ft} ft", { n: f.berths, ft: f.maxLength })}</Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt v="caption" color={t.text3}>{tr("from")}</Txt>
                <Txt num weight="semibold">{money(f.fromDaily, f.currency)}</Txt>
                <Txt v="caption" color={t.text3}>{tr("/night")}</Txt>
              </View>
              <ArrowRight size={18} color={t.text3} style={flipRtl()} />
            </Card>
          );
        })}
      </Body>
    </View>
  );
}
