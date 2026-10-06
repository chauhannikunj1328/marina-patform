// Signed-in shell: header with the logomark and marina switcher, and the bottom tab bar.
// Staff get Today, Bookings, Berths, Tasks and Me. Managers and admins get Overview, Approvals,
// Bookings, Team and Me, and can switch to "All marinas".
import { useMemo, useState } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import { Redirect, router, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, CalendarCheck, CalendarDays, ChartNoAxesColumn, Check, ChevronDown, ClipboardList, House, MessageSquare, ScanLine, UserRound, Users, Warehouse, type LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { IconButton, Logomark, OfflineBanner, Sheet, Txt } from "@/components/ui";
import { buildInbox } from "@/lib/inbox";
import { ALL, useMe, useStore } from "@/store";
import { fonts, useTheme } from "@/theme";

function Header() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, ix, scope, marinaId, setMarinaId, ids, isManager, user } = useStore();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const many = scope.length > 1;
  const name = marinaId === ALL ? "All marinas" : ix.marina(marinaId)?.name;
  const unreadChat = useMemo(() => {
    if (!isManager) return me ? db.chat.filter((m) => m.staffId === me.id && !m.fromStaff && !m.read).length : 0;
    const inIds = new Set(ids);
    const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
    return db.chat.filter((m) => m.fromStaff && !m.read && staffIds.has(m.staffId)).length;
  }, [db, me, ids, isManager]);
  const unreadInbox = useMemo(() => {
    const read = new Set(db.readNotifications);
    return buildInbox(db, ix, me, ids, user?.role).filter((n) => !read.has(n.id)).length;
  }, [db, ix, me, ids, user?.role]);
  const options = isManager && many ? [ALL, ...scope] : scope;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: 1, borderColor: t.border }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, paddingRight: 8 }}>
        <Logomark size={20} />
        <Pressable
          accessibilityRole={many ? "button" : "text"}
          accessibilityLabel={many ? `Marina: ${name}. Change marina` : name}
          disabled={!many}
          onPress={() => setOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}
        >
          <Txt weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
          {many && <ChevronDown size={18} color={t.text} />}
        </Pressable>
        <View style={{ flex: 1 }} />
        <IconButton plain icon={ScanLine} label="Scan berth QR code" onPress={() => router.push("/scan")} />
        <IconButton plain icon={MessageSquare} label="Messages" badge={unreadChat} onPress={() => (isManager ? router.navigate({ pathname: "/team", params: { view: "messages" } }) : router.push("/chat"))} />
        <IconButton plain icon={Bell} label="Notifications" badge={unreadInbox} onPress={() => router.push("/inbox")} />
      </View>
      <OfflineBanner />
      <Sheet open={open} onClose={() => setOpen(false)} title="Choose marina">
        {options.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: id === marinaId }}
            onPress={() => { setMarinaId(id); setOpen(false); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            {id === ALL ? (
              <View>
                <Txt weight="medium">All marinas</Txt>
                <Txt v="caption" color={t.text3}>{scope.length} marinas{user?.role === "admin" ? " · the whole company" : ""}</Txt>
              </View>
            ) : (
              <View>
                <Txt weight="medium">{ix.marina(id)?.name}</Txt>
                <Txt v="caption" color={t.text3}>{ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
              </View>
            )}
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
  const { db, user, can, isManager, ids } = useStore();
  const pending = useMemo(() => {
    if (!isManager) return 0;
    const inIds = new Set(ids);
    const staffIds = new Set(db.staff.filter((s) => inIds.has(s.marinaId)).map((s) => s.id));
    const bookings = db.bookings.filter((b) => b.status === "pending" && inIds.has(db.berths.find((x) => x.id === b.berthId)?.marinaId ?? "")).length;
    return bookings + db.requests.filter((r) => r.status === "pending" && staffIds.has(r.staffId)).length;
  }, [db, ids, isManager]);
  if (!user) return <Redirect href="/login" />;
  const hidden = (area: Parameters<typeof can>[0]) => (can(area) === "none" ? { href: null } : {});
  /** Tabs for one role only. Hidden tabs stay reachable from links (e.g. Overview → repairs). */
  const staffOnly = (area?: Parameters<typeof can>[0]) => (isManager ? { href: null } : area ? hidden(area) : {});
  const managerOnly = isManager ? {} : { href: null };
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
      <Tabs.Screen name="index" options={{ title: isManager ? "Overview" : "Today", tabBarIcon: icon(isManager ? ChartNoAxesColumn : House) }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals", tabBarIcon: icon(CalendarCheck), tabBarBadge: pending || undefined, tabBarBadgeStyle: { backgroundColor: t.error.base, fontSize: 10 }, ...managerOnly }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: icon(CalendarDays), ...hidden("bookings") }} />
      <Tabs.Screen name="berths" options={{ title: "Berths", tabBarIcon: icon(Warehouse), ...staffOnly("berths") }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: icon(ClipboardList), ...staffOnly("maintenance") }} />
      <Tabs.Screen name="team" options={{ title: "Team", tabBarIcon: icon(Users), ...managerOnly }} />
      <Tabs.Screen name="me" options={{ title: "Me", tabBarIcon: icon(UserRound) }} />
    </Tabs>
  );
}
