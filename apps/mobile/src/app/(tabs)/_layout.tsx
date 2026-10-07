// Signed-in shell: header with the logomark and marina switcher, and a bottom tab bar that depends
// on the role. Staff: Today, Bookings, Berths, Tasks, Me. Managers and admins: Overview, Approvals,
// Bookings, Team, Me (Berths and Tasks stay reachable from the Overview).
import { useEffect, useState } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import { Redirect, router, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, CalendarCheck, CalendarDays, Check, ChevronDown, ClipboardList, House, LayoutDashboard, MessageSquare, ScanLine, UserRound, Users, Warehouse, type LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { IconButton, Logomark, OfflineBanner, Sheet, Txt } from "@/components/ui";
import { useInbox, useRole, useUnreadChat } from "@/lib/role";
import { useLang, useTr } from "@/lib/i18n";
import { syncShiftReminders } from "@/lib/reminders";
import { ALL, useMe, useStore } from "@/store";
import { fonts, useTheme } from "@/theme";

function Header() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, ix, scope, marinaId, setMarinaId } = useStore();
  const { office } = useRole();
  const [open, setOpen] = useState(false);
  const many = scope.length > 1;
  const unreadChat = useUnreadChat();
  const inbox = useInbox();
  const read = new Set(db.readNotifications);
  const unreadInbox = inbox.filter((n) => !read.has(n.id)).length;
  const tr = useTr();
  const label = marinaId === ALL ? tr("All marinas") : ix.marina(marinaId)?.name;
  const choices = office && many ? [ALL, ...scope] : scope;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: 1, borderColor: t.border }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingStart: 16, paddingEnd: 8 }}>
        <Logomark size={20} />
        <Pressable
          accessibilityRole={many ? "button" : "text"}
          accessibilityLabel={many ? tr("Showing {label}. Change marina", { label: label }) : label}
          disabled={!many}
          onPress={() => setOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}
        >
          <Txt weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Txt>
          {many && <ChevronDown size={18} color={t.text} />}
        </Pressable>
        <View style={{ flex: 1 }} />
        <IconButton plain icon={ScanLine} label={tr("Scan berth QR code")} onPress={() => router.push("/scan")} />
        <IconButton plain icon={MessageSquare} label={tr("Messages")} badge={unreadChat} onPress={() => (office ? router.navigate({ pathname: "/team", params: { view: "messages", at: String(Date.now()) } }) : router.push("/chat"))} />
        <IconButton plain icon={Bell} label={tr("Notifications")} badge={unreadInbox} onPress={() => router.push("/inbox")} />
      </View>
      <OfflineBanner />
      <Sheet open={open} onClose={() => setOpen(false)} title={tr("Choose marina")}>
        {choices.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: id === marinaId }}
            onPress={() => { setMarinaId(id); setOpen(false); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
          >
            <View>
              <Txt weight="medium">{id === ALL ? tr("All marinas") : ix.marina(id)?.name}</Txt>
              <Txt v="caption" color={t.text3}>{id === ALL ? tr("{n} marinas together", { n: scope.length }) : ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
            </View>
            {id === marinaId && <Check size={20} color={t.green} />}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

/** Keeps this phone's shift reminders in line with the person's schedule, time off and swaps. */
function ReminderSync() {
  const { db, ix, reminders } = useStore();
  const me = useMe();
  const { lang } = useLang();
  const marinaName = ix.marina(me?.marinaId ?? "")?.name ?? "the marina";
  const key = me ? JSON.stringify([me.shift, me.daysOff, me.status, db.requests.filter((r) => r.status === "approved" && (r.staffId === me.id || r.swapWithId === me.id)).map((r) => r.id)]) : "";
  useEffect(() => {
    void syncShiftReminders(me, db, marinaName, reminders).catch(() => undefined);
    // Re-sync only when the schedule (or the language of the reminder text) changes, not on every data update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reminders, marinaName, lang]);
  return null;
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
  const { user, can, db, ix, ids } = useStore();
  const { office } = useRole();
  const tr = useTr();
  if (!user) return <Redirect href="/login" />;
  const team = new Set(db.staff.filter((s) => ids.includes(s.marinaId)).map((s) => s.id));
  const waiting = office ? ix.bookingsIn(ids).filter((b) => b.status === "pending").length + db.requests.filter((r) => r.status === "pending" && team.has(r.staffId)).length : 0;
  const hidden = (area: Parameters<typeof can>[0]) => (can(area) === "none" ? { href: null } : {});
  const staffOnly = office ? { href: null } : {};
  const officeOnly = office ? {} : { href: null };
  return (
    <>
    {!office && <ReminderSync />}
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
      <Tabs.Screen name="index" options={{ title: office ? tr("Overview") : tr("Today"), tabBarIcon: icon(office ? LayoutDashboard : House) }} />
      <Tabs.Screen name="approvals" options={{ title: tr("Approvals"), tabBarIcon: icon(CalendarCheck), tabBarBadge: waiting ? (waiting > 99 ? "99+" : waiting) : undefined, tabBarBadgeStyle: { backgroundColor: t.error.base, fontFamily: fonts.numBold, fontSize: 10 }, ...officeOnly }} />
      <Tabs.Screen name="bookings" options={{ title: tr("Bookings"), tabBarIcon: icon(CalendarDays), ...hidden("bookings") }} />
      <Tabs.Screen name="berths" options={{ title: tr("Berths"), tabBarIcon: icon(Warehouse), ...staffOnly, ...hidden("berths") }} />
      <Tabs.Screen name="tasks" options={{ title: tr("Tasks"), tabBarIcon: icon(ClipboardList), ...staffOnly, ...hidden("maintenance") }} />
      <Tabs.Screen name="team" options={{ title: tr("Team"), tabBarIcon: icon(Users), ...officeOnly }} />
      <Tabs.Screen name="me" options={{ title: tr("Me"), tabBarIcon: icon(UserRound) }} />
    </Tabs>
    </>
  );
}
