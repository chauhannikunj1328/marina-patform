// Notifications: messages, work orders, request decisions, arrivals and tomorrow's shift.
import { Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { BellOff, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, LogIn, MessageSquare, Receipt, TriangleAlert } from "lucide-react-native";
import { Screen, StackHeader, Txt, type Icon } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import type { InboxKind } from "@/lib/inbox";
import { useInbox } from "@/lib/role";
import { useStore } from "@/store";
import { useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { tx } from "@marina/shared";

const ICONS: Record<InboxKind, Icon> = { message: MessageSquare, task: ClipboardList, request: CalendarClock, arrival: LogIn, late: TriangleAlert, schedule: CalendarDays, booking: CalendarCheck, invoice: Receipt };

export default function Inbox() {
  const { db, update, user } = useStore();
  const { t } = useTheme();
  const tr = useTr();
  const items = useInbox();
  const read = new Set(db.readNotifications);
  const unread = items.filter((i) => !read.has(i.id));
  if (!user) return <Redirect href="/login" />;
  const markAll = () => update((d) => ({ ...d, readNotifications: [...new Set([...d.readNotifications, ...items.map((i) => i.id)])] }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader
        title={tr("Notifications")}
        subtitle={unread.length ? tr("{n} new", { n: unread.length }) : tr("All caught up")}
        right={unread.length ? (
          <Pressable accessibilityRole="button" onPress={markAll} hitSlop={8} style={{ paddingHorizontal: 12 }}>
            <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Mark all read")}</Txt>
          </Pressable>
        ) : undefined}
      />
      <Screen>
        {items.length === 0 ? (
          <EmptyState icon={BellOff} title={tr("Nothing new")} body={tr("Messages, work orders and schedule changes show up here.")} />
        ) : (
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {items.map((n, i) => {
              const IconCmp = ICONS[n.kind];
              const isNew = !read.has(n.id);
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${isNew ? tr("New.") + " " : ""}${tx(n.title)}. ${tx(n.body)}`}
                  onPress={() => {
                    if (isNew) update((d) => ({ ...d, readNotifications: [...d.readNotifications, n.id] }));
                    router.navigate(n.open || n.view ? { pathname: n.path, params: { ...(n.open ? { open: n.open } : {}), ...(n.view ? { view: n.view } : {}), at: String(Date.now()) } } : n.path);
                  }}
                  style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: n.urgent ? t.status.maintenance.bg : t.surface3 }}>
                    <IconCmp size={18} color={n.urgent ? t.status.maintenance.fg : t.text2} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt weight={isNew ? "semibold" : "regular"}>{tx(n.title)}</Txt>
                    <Txt v="bodySm" color={t.text3} numberOfLines={2}>{tx(n.body)}</Txt>
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
