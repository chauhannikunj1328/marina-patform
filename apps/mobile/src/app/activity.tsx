// Activity log (managers and admins): every change at the chosen marinas, newest first,
// filtered by type, person or text and grouped by day.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Redirect } from "expo-router";
import { History } from "lucide-react-native";
import { fmtDate, fmtTime, localDay, today, addDays, type Activity } from "@marina/shared";
import { Chip, EmptyState, Screen, SearchBox, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tx } from "@marina/shared";

const TYPES = ["All", "Bookings", "Payments", "Staff", "Work orders", "Berths"] as const;
type Kind = (typeof TYPES)[number];

/** What an entry is about, from where it links to (or its wording for older entries). */
function kindOf(a: Activity): Kind {
  const to = a.to ?? "";
  const text = a.text.toLowerCase();
  if (to.startsWith("/billing") || /payment|invoice|reminder/.test(text)) return "Payments";
  if (to.startsWith("/maintenance") || /work order|problem|repair|finished:|started:/.test(text)) return "Work orders";
  if (to.startsWith("/staff") || /clocked|request|schedule|shift|announcement|cover/.test(text)) return "Staff";
  if (/berth .* (service|out of)|returned to service|taken out of service/.test(text)) return "Berths";
  if (to.startsWith("/bookings") || /booking|checked in|checked out/.test(text)) return "Bookings";
  return "All";
}

export default function ActivityLog() {
  const tr = useTr();
  const { db, ids, user } = useStore();
  const { office } = useRole();
  const { t } = useTheme();
  const [kind, setKind] = useState<Kind>("All");
  const [who, setWho] = useState("");
  const [q, setQ] = useState("");
  if (!user) return <Redirect href="/login" />;
  if (!office) return <Redirect href="/" />;

  const inScope = db.activity.filter((a) => !a.marinaId || ids.includes(a.marinaId));
  const people = [...new Set(inScope.map((a) => a.by))].sort();
  const s = q.trim().toLowerCase();
  const rows = inScope
    .filter((a) => (kind === "All" || kindOf(a) === kind) && (!who || a.by === who) && (!s || a.text.toLowerCase().includes(s)))
    .slice(0, 150);
  const days = [...new Set(rows.map((a) => localDay(a.at)))];
  const label = (d: string) => (d === today() ? tr("Today") : d === addDays(today(), -1) ? tr("Yesterday") : fmtDate(d));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Activity")} subtitle={tr("{n} changes", { n: inScope.length })} />
      <Screen>
        <SearchBox value={q} onChange={setQ} placeholder={tr("Search activity")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 8 }}>
          {TYPES.map((k) => <Chip key={k} label={tr(k)} on={kind === k} onPress={() => setKind(k)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 16 }}>
          <Chip label={tr("Everyone")} on={!who} onPress={() => setWho("")} />
          {people.map((p) => <Chip key={p} label={tr(p)} on={who === p} onPress={() => setWho(who === p ? "" : p)} />)}
        </ScrollView>
        {rows.length === 0 ? (
          <EmptyState icon={History} title={tr("No activity matches")} body={tr("Try another type, person or search.")} />
        ) : (
          days.map((d) => (
            <View key={d} style={{ marginBottom: 16 }}>
              <Txt v="label" style={{ marginBottom: 8 }}>{label(d)}</Txt>
              <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
                {rows.filter((a) => localDay(a.at) === d).map((a, i) => (
                  <View key={a.id} style={{ flexDirection: "row", gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                    <Txt v="caption" num color={t.text3} style={{ width: 58, marginTop: 2 }}>{fmtTime(a.at)}</Txt>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodySm">{tx(a.text)}</Txt>
                      <Txt v="caption" color={t.text3}>{tr(a.by)}{kindOf(a) !== "All" ? ` · ${tr(kindOf(a))}` : ""}</Txt>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        {rows.length === 150 && <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{tr("Showing the latest 150. Filter to see older changes.")}</Txt>}
      </Screen>
    </View>
  );
}
