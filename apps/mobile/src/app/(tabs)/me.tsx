// Me: profile, this week's shifts, marinas, appearance and sign out.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { addDays, DAYS, fromISO, SHIFT_HOURS, today } from "@marina/shared";
import { Avatar, Button, Screen, Section, Txt } from "@/components/ui";
import { useMe, useStore } from "@/store";
import { useTheme, type ThemeMode } from "@/theme";

export default function Me() {
  const { ix, user, scope, signOut } = useStore();
  const me = useMe();
  const { t, mode, setMode } = useTheme();
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Avatar name={user?.name ?? ""} size={56} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{user?.name}</Txt>
          <Txt v="bodySm" color={t.text3} numberOfLines={1}>{me?.position ?? "Staff"} · {user?.email}</Txt>
        </View>
      </View>

      {me && (
        <Section title="My week">
          <View style={{ flexDirection: "row", gap: 6 }}>
            {week.map((d, i) => {
              const off = me.status !== "active" || me.daysOff.includes(i);
              const isToday = d === today();
              return (
                <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: isToday ? 2 : 1, borderColor: isToday ? t.primary : t.border, backgroundColor: off ? t.surface : t.tealStrong }}>
                  <Txt v="label" color={off ? t.text3 : t.onTealStrong}>{DAYS[i]}</Txt>
                  <Txt weight="semibold" num color={off ? t.text : t.onTealStrong}>{Number(d.slice(8))}</Txt>
                  <Txt v="caption" color={off ? t.text3 : t.onTealStrong} style={{ fontSize: 10 }}>{off ? (me.status === "on-leave" ? "Leave" : "Off") : me.shift}</Txt>
                </View>
              );
            })}
          </View>
          <Txt v="bodySm" color={t.text3}>{me.shift} shift · {SHIFT_HOURS[me.shift]}</Txt>
        </Section>
      )}

      <Section title="My marinas">
        <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface }}>
          {scope.map((id, i) => (
            <View key={id} style={{ padding: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
              <Txt>{ix.marina(id)?.name}</Txt>
              <Txt v="bodySm" color={t.text3}>{ix.marina(id)?.address}, {ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Appearance">
        <View style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: 9999, padding: 4, gap: 4 }}>
          {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: mode === m }} onPress={() => setMode(m)} style={{ flex: 1, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: mode === m ? t.surface : "transparent" }}>
              <Txt v="bodySm" weight="semibold" color={mode === m ? t.text : t.text3}>{m === "system" ? "Automatic" : m === "light" ? "Light" : "Dark"}</Txt>
            </Pressable>
          ))}
        </View>
      </Section>

      <Button size="lg" icon={LogOut} label="Sign out" onPress={() => { signOut(); router.replace("/login"); }} />
    </Screen>
  );
}
