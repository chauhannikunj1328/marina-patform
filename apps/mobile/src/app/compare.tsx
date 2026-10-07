// Compare 2–3 marinas side by side (managers and admins). The best value in each row is highlighted.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Redirect } from "expo-router";
import { addDays, fmtDuration, fromISO, minutesWorked, money, moneyShort, pct, today } from "@marina/shared";
import { Chip, Field, Screen, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useStore } from "@/store";
import { useTheme } from "@/theme";

type Metric = { label: string; value: (id: string) => number; format: (n: number) => string; better: "high" | "low" };

export default function Compare() {
  const { db, ix, scope, user } = useStore();
  const { office } = useRole();
  const { t } = useTheme();
  const ranked = [...scope].sort((a, b) => ix.metrics([b]).revenue - ix.metrics([a]).revenue);
  const [picked, setPicked] = useState<string[]>(ranked.slice(0, 2));
  if (!user) return <Redirect href="/login" />;
  if (!office || scope.length < 2) return <Redirect href="/" />;

  const weekStart = addDays(today(), -fromISO(today()).getDay());
  const overdue = (id: string) => db.invoices.filter((i) => i.status === "overdue" && ix.marinaOfInvoice(i) === id).reduce((s, i) => s + ix.balance(i), 0);
  const metrics: Metric[] = [
    { label: "Occupancy today", value: (id) => ix.metrics([id]).occupancy, format: pct, better: "high" },
    { label: "Revenue this month", value: (id) => ix.metrics([id]).revenue, format: moneyShort, better: "high" },
    { label: "Change on last month", value: (id) => ix.metrics([id]).revenueChange, format: (n) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`, better: "high" },
    { label: "Revenue per berth", value: (id) => ix.metrics([id]).revenue / Math.max(1, ix.metrics([id]).berths), format: money, better: "high" },
    { label: "Berths", value: (id) => ix.metrics([id]).berths, format: String, better: "high" },
    { label: "Free today", value: (id) => ix.metrics([id]).available, format: String, better: "high" },
    { label: "Waiting for approval", value: (id) => ix.metrics([id]).pending, format: String, better: "low" },
    { label: "Overdue", value: overdue, format: moneyShort, better: "low" },
    { label: "Open work orders", value: (id) => db.tasks.filter((x) => x.marinaId === id && x.status !== "done").length, format: String, better: "low" },
    { label: "Out of service", value: (id) => ix.metrics([id]).maintenance, format: String, better: "low" },
    { label: "Staff", value: (id) => db.staff.filter((s) => s.marinaId === id).length, format: String, better: "high" },
    { label: "Hours this week", value: (id) => db.staff.filter((s) => s.marinaId === id).reduce((sum, s) => sum + minutesWorked(db.timeEntries, s.id, weekStart, addDays(weekStart, 7)), 0), format: fmtDuration, better: "high" },
  ];
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length >= 3 ? [...picked.slice(1), id] : [...picked, id]);
  const col = { flex: 1, minWidth: 0 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title="Compare marinas" subtitle="Choose 2 or 3" />
      <Screen>
        <Field label="Marinas">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {ranked.map((id) => <Chip key={id} label={ix.marina(id)?.name ?? id} on={picked.includes(id)} onPress={() => toggle(id)} />)}
          </ScrollView>
        </Field>
        {picked.length < 2 ? (
          <Txt v="bodySm" color={t.text3} style={{ marginTop: 16 }}>Choose at least two marinas.</Txt>
        ) : (
          <View style={{ marginTop: 16, borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", gap: 8, padding: 12, backgroundColor: t.surface3 }}>
              <View style={{ width: 96 }} />
              {picked.map((id) => <Txt key={id} v="caption" weight="semibold" numberOfLines={2} style={[col, { textAlign: "right" }]}>{ix.marina(id)?.name.replace(/ Marina$/, "")}</Txt>)}
            </View>
            {metrics.map((m, i) => {
              const vals = picked.map((id) => m.value(id));
              const best = m.better === "high" ? Math.max(...vals) : Math.min(...vals);
              const tie = vals.every((v) => v === vals[0]);
              return (
                <View key={m.label} accessibilityLabel={`${m.label}: ${picked.map((id, j) => `${ix.marina(id)?.name} ${m.format(vals[j])}`).join(", ")}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                  <Txt v="caption" color={t.text2} style={{ width: 96 }}>{m.label}</Txt>
                  {vals.map((v, j) => (
                    <Txt key={picked[j]} v="bodySm" num weight={!tie && v === best ? "semibold" : "regular"} color={!tie && v === best ? t.greenText : t.text} style={[col, { textAlign: "right" }]}>{m.format(v)}</Txt>
                  ))}
                </View>
              );
            })}
          </View>
        )}
        <Txt v="caption" color={t.text3} style={{ marginTop: 12 }}>Green marks the best value in each row.</Txt>
      </Screen>
    </View>
  );
}
