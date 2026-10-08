// Pieces the customer app's screens share: the tab page frame, status badges, a sign-in prompt
// for visitors, checkbox and radio rows, and links that call or give directions to a marina.
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, LogIn, Navigation, Phone, type LucideProps } from "lucide-react-native";
import { directionsUrl, marinaPoint, radius, today, type Booking, type Invoice, type Marina } from "@marina/shared";
import { Badge, Button, Card, OfflineBanner, Txt, type Tone } from "@/components/ui";
import { useStore } from "@/store";
import { flipRtl, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";

/** A tab's screen: safe-area top, offline banner, scrolling body with a large title. */
export function Page({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 8 }}>
            <Txt v="h1" style={{ flexShrink: 1 }}>{title}</Txt>
            {right}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

/** Scrolling body of a full-screen page under a StackHeader. */
export function Body({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

const BOOKING: Record<Booking["status"], { label: string; tone: Tone }> = {
  pending: { label: "Waiting for confirmation", tone: "pending" },
  confirmed: { label: "Confirmed", tone: "active" },
  "checked-in": { label: "Checked in", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "outline" },
};

export function BookingStatus({ b }: { b: Booking }) {
  const tr = useTr();
  return <Badge tone={BOOKING[b.status].tone} label={tr(BOOKING[b.status].label)} />;
}

export function InvoiceStatus({ inv }: { inv: Invoice }) {
  const tr = useTr();
  if (inv.status === "paid") return <Badge tone="success" label={tr("Paid")} />;
  if (inv.status === "void") return <Badge tone="outline" label={tr("invoice|Void")} />;
  if (inv.status === "overdue" || inv.due < today()) return <Badge tone="cancelled" label={tr("Overdue")} />;
  return <Badge tone="pending" label={inv.payments.length ? tr("Part paid") : tr("Due")} />;
}

/** Where a sign-in is needed: a short reason and buttons to sign in or create an account. */
export function SignInPrompt({ icon: Icon, title, body }: { icon: React.ComponentType<LucideProps>; title: string; body: string }) {
  const { t } = useTheme();
  const tr = useTr();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.surface3, alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} color={t.text2} strokeWidth={1.5} />
      </View>
      <Txt v="h3" style={{ textAlign: "center", marginTop: 4 }}>{title}</Txt>
      <Txt v="bodySm" color={t.text3} style={{ textAlign: "center" }}>{body}</Txt>
      <View style={{ alignSelf: "stretch", gap: 8, marginTop: 12 }}>
        <Button variant="primary" icon={LogIn} label={tr("Sign in")} onPress={() => router.push("/sign-in")} />
        <Button label={tr("Create an account")} onPress={() => router.push("/register")} />
      </View>
    </Card>
  );
}

/** A tappable row with a check box. */
export function CheckRow({ checked, onChange, label, invalid }: { checked: boolean; onChange: (v: boolean) => void; label: string; invalid?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: invalid ? t.error.base : checked ? t.primary : t.borderStrong, backgroundColor: checked ? t.primary : t.surface, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {checked && <Check size={15} color={t.onPrimary} strokeWidth={3} />}
      </View>
      <Txt v="bodySm" color={t.text2} style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}

/** One choice in a list of options (a boat, a marina). */
export function RadioRow({ on, onPress, title, sub, icon: Icon }: { on: boolean; onPress: () => void; title: string; sub?: string; icon?: React.ComponentType<LucideProps> }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: on ? t.primary : t.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: on || pressed ? t.sidebar : t.surface })}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: on ? t.primary : t.borderStrong, alignItems: "center", justifyContent: "center" }}>
        {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} />}
      </View>
      {Icon && <Icon size={18} color={t.text3} strokeWidth={1.5} />}
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{title}</Txt>
        {sub ? <Txt v="caption" color={t.text3}>{sub}</Txt> : null}
      </View>
    </Pressable>
  );
}

/** Call the marina's dock office and get directions in the phone's map app. */
export function MarinaActions({ marina }: { marina: Marina }) {
  const { ix } = useStore();
  const tr = useTr();
  const point = marinaPoint(marina, ix.city(marina.cityId));
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button size="sm" icon={Phone} label={tr("Call")} style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${marina.phone.replace(/[^\d+]/g, "")}`)} />
      {point && <Button size="sm" icon={Navigation} label={tr("Directions")} style={{ flex: 1 }} onPress={() => void Linking.openURL(directionsUrl(point))} />}
    </View>
  );
}

/** A row in a settings-style list: icon, label, optional value or count, and a chevron. */
export function ListRow({ icon: Icon, label, value, onPress, last }: { icon: React.ComponentType<LucideProps>; label: string; value?: ReactNode; onPress: () => void; last?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 56, borderBottomWidth: last ? 0 : 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <Icon size={20} color={t.text2} strokeWidth={1.5} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {typeof value === "string" ? <Txt v="bodySm" color={t.text3}>{value}</Txt> : value}
      <ChevronRight size={18} color={t.text3} style={flipRtl()} />
    </Pressable>
  );
}
