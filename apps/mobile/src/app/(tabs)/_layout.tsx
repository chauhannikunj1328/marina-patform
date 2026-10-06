// Signed-in shell: header with the logomark and marina switcher, and the bottom tab bar.
import { useState } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, Check, ChevronDown, ClipboardList, House, UserRound, Warehouse, type LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { Logomark, Sheet, Txt } from "@/components/ui";
import { useStore } from "@/store";
import { fonts, useTheme } from "@/theme";

function Header() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { ix, scope, marinaId, setMarinaId } = useStore();
  const [open, setOpen] = useState(false);
  const many = scope.length > 1;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: 1, borderColor: t.border }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <Logomark size={20} />
        <Pressable
          accessibilityRole={many ? "button" : "text"}
          accessibilityLabel={many ? `Marina: ${ix.marina(marinaId)?.name}. Change marina` : ix.marina(marinaId)?.name}
          disabled={!many}
          onPress={() => setOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}
        >
          <Txt weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{ix.marina(marinaId)?.name}</Txt>
          {many && <ChevronDown size={18} color={t.text} />}
        </Pressable>
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title="Choose marina">
        {scope.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: id === marinaId }}
            onPress={() => { setMarinaId(id); setOpen(false); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            <View>
              <Txt weight="medium">{ix.marina(id)?.name}</Txt>
              <Txt v="caption" color={t.text3}>{ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
            </View>
            {id === marinaId && <Check size={20} color={t.green} />}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

const icon = (Cmp: ComponentType<LucideProps>) =>
  function TabIcon({ color: tint, focused }: { color: ColorValue; focused: boolean }) {
    const { t } = useTheme();
    const color = String(tint);
    return (
      <View style={{ width: 52, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: focused ? t.sidebar : "transparent" }}>
        <Cmp size={22} color={color} strokeWidth={1.5} fill={focused ? color : "none"} fillOpacity={focused ? 0.18 : 0} />
      </View>
    );
  };

export default function TabsLayout() {
  const { t } = useTheme();
  const { user, can } = useStore();
  if (!user) return <Redirect href="/login" />;
  const hidden = (area: Parameters<typeof can>[0]) => (can(area) === "none" ? { href: null } : {});
  return (
    <Tabs
      screenOptions={{
        header: () => <Header />,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.text3,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, height: 64 + 0, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon(House) }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: icon(CalendarDays), ...hidden("bookings") }} />
      <Tabs.Screen name="berths" options={{ title: "Berths", tabBarIcon: icon(Warehouse), ...hidden("berths") }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: icon(ClipboardList), ...hidden("maintenance") }} />
      <Tabs.Screen name="me" options={{ title: "Me", tabBarIcon: icon(UserRound) }} />
    </Tabs>
  );
}
