// Revenue drill-down (managers and admins): pick a month, then go county → city → marina.
// Each row shows the month's revenue, its share of the total and the change on the month before.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react-native";
import { fmtMonth, lastMonths, money, today , tn } from "@marina/shared";
import { MiniBars } from "@/components/office";
import { Chip, Screen, Section, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useStore } from "@/store";
import { flipRtl, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

type Level = { kind: "county" } | { kind: "city"; countyId: string } | { kind: "marina"; cityId: string };

export default function Revenue() {
  const tr = useTr();
  const { ix, ids, user } = useStore();
  const { office } = useRole();
  const { t } = useTheme();
  const months = lastMonths(6, today());
  const [month, setMonth] = useState(months[months.length - 1]);
  const [level, setLevel] = useState<Level>({ kind: "county" });
  if (!user) return <Redirect href="/login" />;
  if (!office) return <Redirect href="/" />;

  const prevMonth = months[months.indexOf(month) - 1];
  const rev = (marinas: string[], m: string) => (marinas.length ? ix.revenueByMonth(marinas, [m])[0] : 0);
  const inScope = (list: string[]) => list.filter((id) => ids.includes(id));
  const countyIds = [...new Set(ids.map((id) => ix.countyOfCity(ix.marina(id)?.cityId ?? "")?.id).filter(Boolean) as string[])];
  const rows =
    level.kind === "county"
      ? countyIds.map((c) => ({ id: c, name: ix.county(c)?.name ?? c, sub: ix.county(c)?.state, marinas: inScope(ix.marinaIdsInCounty(c)), next: { kind: "city", countyId: c } as Level }))
      : level.kind === "city"
        ? [...new Set(inScope(ix.marinaIdsInCounty(level.countyId)).map((m) => ix.marina(m)?.cityId ?? ""))].map((c) => ({ id: c, name: ix.city(c)?.name ?? c, sub: undefined, marinas: inScope(ix.marinaIdsInCity(c)), next: { kind: "marina", cityId: c } as Level }))
        : inScope(ix.marinaIdsInCity(level.cityId)).map((m) => ({ id: m, name: ix.marina(m)?.name ?? m, sub: undefined, marinas: [m], next: undefined }));
  const shown = rows.map((r) => ({ ...r, now: rev(r.marinas, month), before: prevMonth ? rev(r.marinas, prevMonth) : 0 })).sort((a, b) => b.now - a.now);
  const scopeIds = shown.flatMap((r) => r.marinas);
  const total = shown.reduce((s, r) => s + r.now, 0);
  const crumbs: { label: string; to: Level }[] = [{ label: tr("All"), to: { kind: "county" } }];
  if (level.kind === "city") crumbs.push({ label: ix.county(level.countyId)?.name ?? "", to: level });
  if (level.kind === "marina") {
    const county = ix.countyOfCity(level.cityId);
    if (county) crumbs.push({ label: county.name, to: { kind: "city", countyId: county.id } });
    crumbs.push({ label: ix.city(level.cityId)?.name ?? "", to: level });
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Revenue")} subtitle={`${fmtMonth(month)} · ${money(total)}`} />
      <Screen>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {months.map((m) => <Chip key={m} label={fmtMonth(m).slice(0, 3)} on={m === month} onPress={() => setMonth(m)} />)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 12 }}>
          {crumbs.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight style={flipRtl()} size={14} color={t.text3} />}
              <Pressable accessibilityRole="button" disabled={i === crumbs.length - 1} onPress={() => setLevel(c.to)} hitSlop={6}>
                <Txt v="bodySm" weight="semibold" color={i === crumbs.length - 1 ? t.text : t.greenText}>{tr(c.label)}</Txt>
              </Pressable>
            </View>
          ))}
        </View>
        <Section title={level.kind === "county" ? tr("By county") : level.kind === "city" ? tr("By city") : tr("By marina")}>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {shown.map((r, i) => {
              const change = r.before ? (r.now - r.before) / r.before : 0;
              const up = change >= 0;
              const Trend = up ? TrendingUp : TrendingDown;
              const go = () => (r.next ? setLevel(r.next) : router.push({ pathname: "/marina/[id]", params: { id: r.id } }));
              return (
                <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={tr("{name}: {amount}, {pct}% on {month}", { name: r.name, amount: money(r.now), pct: (change * 100).toFixed(1), month: prevMonth ? fmtMonth(prevMonth) : tr("last month") })} onPress={go} style={({ pressed }) => ({ padding: 14, gap: 8, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Txt weight="medium" numberOfLines={1}>{r.name}</Txt>
                      <Txt v="caption" color={t.text3}>{level.kind === "marina" ? tr("{pct}% of {name}", { pct: total ? Math.round((r.now / total) * 100) : 0, name: ix.city(level.cityId)?.name }) : `${tn(r.marinas.length, "{n} marina", "{n} marinas")}${r.sub ? ` · ${tr(r.sub)}` : ""}`}</Txt>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt num weight="semibold">{money(r.now)}</Txt>
                      {prevMonth && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Trend size={12} color={up ? t.greenText : t.error.fg} />
                          <Txt v="caption" num weight="semibold" color={up ? t.greenText : t.error.fg}>{up ? "+" : ""}{(change * 100).toFixed(1)}%</Txt>
                        </View>
                      )}
                    </View>
                    <ChevronRight style={flipRtl()} size={18} color={t.text3} />
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface3, overflow: "hidden" }}>
                    <View style={{ width: `${total ? Math.round((r.now / total) * 100) : 0}%`, height: "100%", backgroundColor: t.tealStrong }} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>
        <Section title={tr("Trend")} action={<Txt v="caption" color={t.text3}>{crumbs[crumbs.length - 1].label === "All" ? tr("All marinas") : tr(crumbs[crumbs.length - 1].label)}</Txt>}>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, backgroundColor: t.surface }}>
            <MiniBars months={months} values={ix.revenueByMonth(scopeIds, months)} />
          </View>
        </Section>
        <Txt v="caption" color={t.text3}>{tr("Revenue counts each confirmed or completed stay's price spread across its nights. Year-on-year comparison needs a full year of history.")}</Txt>
      </Screen>
    </View>
  );
}
