// Boat owners: search by name, email, phone, boat or registration; tap for their boats, stays and balance.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Redirect } from "expo-router";
import { Search, UsersRound } from "lucide-react-native";
import { money2 } from "@marina/shared";
import { OwnerSheet } from "@/components/owner";
import { Avatar, EmptyState, Screen, SearchBox, StackHeader, Txt } from "@/components/ui";
import { useRole } from "@/lib/role";
import { useOpenParam } from "@/lib/useOpenParam";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

export default function Owners() {
  const tr = useTr();
  const { db, ix, ids, user, can } = useStore();
  const { isAdmin } = useRole();
  const { t } = useTheme();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useOpenParam();
  if (!user) return <Redirect href="/login" />;
  if (can("owners") === "none") return <Redirect href="/" />;
  const owners = ix.ownersIn(ids, isAdmin && ids.length === db.marinas.length);
  const s = q.trim().toLowerCase();
  const boatsOf = (id: string) => db.boats.filter((b) => b.ownerId === id);
  const rows = (s
    ? owners.filter((o) => o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s) || o.phone.replace(/\D/g, "").includes(s.replace(/\D/g, "") || "~") || boatsOf(o.id).some((b) => b.name.toLowerCase().includes(s) || b.registration.toLowerCase().includes(s)))
    : owners
  ).slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80);
  const open = db.owners.find((o) => o.id === openId);
  const owes = (id: string) => {
    const bookingIds = new Set(db.bookings.filter((b) => boatsOf(id).some((x) => x.id === b.boatId)).map((b) => b.id));
    return db.invoices.filter((i) => bookingIds.has(i.bookingId)).reduce((sum, i) => sum + ix.balance(i), 0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={tr("Boat owners")} subtitle={tr("{n} at {where}", { n: owners.length, where: ids.length > 1 ? tr("{n} marinas", { n: ids.length }) : ix.marina(ids[0])?.name })} />
      <Screen>
        <SearchBox value={q} onChange={setQ} placeholder={tr("Name, phone, email, boat or registration")} />
        {rows.length === 0 ? (
          <EmptyState icon={s ? Search : UsersRound} title={s ? tr("Nobody matches “{q}”", { q: q }) : tr("No boat owners yet")} />
        ) : (
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {rows.map((o, i) => {
              const boats = boatsOf(o.id);
              const due = owes(o.id);
              return (
                <Pressable key={o.id} accessibilityRole="button" onPress={() => setOpenId(o.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
                  <Avatar name={o.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium" numberOfLines={1}>{o.name}</Txt>
                    <Txt v="caption" color={t.text3} numberOfLines={1}>{boats.map((b) => b.name).join(", ") || tr("No boats")}</Txt>
                  </View>
                  {due > 0 && <Txt v="caption" num weight="semibold" color={t.status.pending.fg}>{money2(due)} {tr("due")}</Txt>}
                </Pressable>
              );
            })}
          </View>
        )}
        {rows.length === 80 && <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginTop: 12 }}>{tr("Showing the first 80. Search to narrow it down.")}</Txt>}
      </Screen>
      {open && <OwnerSheet owner={open} onClose={() => setOpenId(undefined)} />}
    </View>
  );
}
