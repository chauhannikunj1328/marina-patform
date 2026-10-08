// Bottom tabs: Home, Book, Bookings, Invoices and Account. Visitors see all of them; the ones that
// need an account ask them to sign in.
import type { ComponentType } from "react";
import { View, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { CalendarDays, House, Receipt, Search, UserRound, type LucideProps } from "lucide-react-native";
import { amountDue, ownerInvoices } from "@marina/shared";
import { useStore } from "@/store";
import { fonts, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

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
  const { db, owner } = useStore();
  const tr = useTr();
  const owed = owner ? ownerInvoices(db, owner.id).filter((i) => amountDue(i) > 0).length : 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.text3,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr("Home"), tabBarIcon: icon(House) }} />
      <Tabs.Screen name="book" options={{ title: tr("Book"), tabBarIcon: icon(Search) }} />
      <Tabs.Screen name="bookings" options={{ title: tr("Bookings"), tabBarIcon: icon(CalendarDays) }} />
      <Tabs.Screen name="invoices" options={{ title: tr("Invoices"), tabBarIcon: icon(Receipt), tabBarBadge: owed || undefined, tabBarBadgeStyle: { backgroundColor: t.error.base, fontFamily: fonts.numBold, fontSize: 10 } }} />
      <Tabs.Screen name="account" options={{ title: tr("Account"), tabBarIcon: icon(UserRound) }} />
    </Tabs>
  );
}
