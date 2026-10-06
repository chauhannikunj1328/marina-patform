// Notifications: messages, work orders, request decisions, arrivals and tomorrow's shift for
// staff; approvals, staff requests, urgent repairs and overdue invoices for managers.
import { Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { BellOff, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, LogIn, MessageSquare, Receipt, TriangleAlert } from "lucide-react-native";
import { useMemo } from "react";
import { Screen, StackHeader, Txt, type Icon } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { buildInbox, type InboxKind } from "@/lib/inbox";
import { useMe, useStore } from "@/store";
import { useTheme } from "@/theme";

const ICONS: Record<InboxKind, Icon> = { message: MessageSquare, task: ClipboardList, request: CalendarClock, arrival: LogIn, late: TriangleAlert, schedule: CalendarDays, approval: CalendarCheck, invoice: Receipt };

export default function Inbox() {
  const { db, ix, update, ids, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const items = useMemo(() => buildInbox(db, ix, me, ids, user?.role), [db, ix, me, ids, user?.role]);
  const read = new Set(db.readNotifications);
  const unread = items.filter((i) => !read.has(i.id));
  if (!user) return <Redirect href="/login" />;
  const markAll = () => update((d) => ({ ...d, readNotifications: [...new Set([...d.readNotifications, ...items.map((i) => i.id)])] }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader
        title="Notifications"
        subtitle={unread.length ? `${unread.length} new` : "All caught up"}
        right={unread.length ? (
          <Pressable accessibilityRole="button" onPress={markAll} hitSlop={8} style={{ paddingHorizontal: 12 }}>
            <Txt v="bodySm" weight="semibold" color={t.greenText}>Mark all read</Txt>
          </Pressable>
        ) : undefined}
      />
      <Screen>
        {items.length === 0 ? (
          <EmptyState icon={BellOff} title="Nothing new" body={user.role === "staff" ? "Messages, work orders and schedule changes show up here." : "Approvals, staff requests, messages and urgent repairs show up here."} />
        ) : (
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {items.map((n, i) => {
              const IconCmp = ICONS[n.kind];
              const isNew = !read.has(n.id);
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${isNew ? "New. " : ""}${n.title}. ${n.body}`}
                  onPress={() => {
                    if (isNew) update((d) => ({ ...d, readNotifications: [...d.readNotifications, n.id] }));
                    const params = { ...(n.open ? { open: n.open, at: String(Date.now()) } : {}), ...(n.view ? { view: n.view } : {}) };
                    router.navigate(Object.keys(params).length ? { pathname: n.path, params } : n.path);
                  }}
                  style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: n.urgent ? t.status.maintenance.bg : t.surface3 }}>
                    <IconCmp size={18} color={n.urgent ? t.status.maintenance.fg : t.text2} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt weight={isNew ? "semibold" : "regular"}>{n.title}</Txt>
                    <Txt v="bodySm" color={t.text3} numberOfLines={2}>{n.body}</Txt>
                  </View>
                  {isNew && <View accessibilityElementsHidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.green, marginTop: 8 }} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
    </View>
  );
}
