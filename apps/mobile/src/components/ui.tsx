// Brand components for React Native (guide sections 04–08): type scale, pill buttons,
// bordered cards, status badges, bottom sheets, inputs, the logomark and toasts.
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleAlert, LogIn, LogOut, Minus, Plus, CircleCheck, Eye, EyeOff, Search, Send, TriangleAlert, Undo2, WifiOff, X, type LucideProps } from "lucide-react-native";

import { router } from "expo-router";
import { weekday, fmtShort, fromISO, LOGOMARK_PATHS, radius, type as typeScale } from "@marina/shared";
import { alignEnd, flipRtl, fonts, useTheme } from "../theme";
import { useStore } from "../store";
import { useTr } from "../lib/i18n";

/** Icons that point along the reading direction; they are mirrored in Arabic. */
const DIRECTIONAL = new Set<unknown>([ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, LogIn, LogOut, Send, Undo2]);

export type Icon = ComponentType<LucideProps>;

// ---- Text -------------------------------------------------------------------

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "bodySm" | "caption" | "label" | "kpi";

export function Txt({
  v = "body",
  weight,
  color,
  num,
  style,
  children,
  numberOfLines,
}: {
  v?: Variant;
  weight?: "regular" | "medium" | "semibold";
  color?: string;
  /** Inter with tabular figures, for numbers (guide 04). */
  num?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const { t } = useTheme();
  const s = typeScale[v];
  const w = weight ?? (v === "h1" || v === "h2" || v === "h3" ? "medium" : v === "display" || v === "kpi" ? "semibold" : v === "label" ? "medium" : "regular");
  const family = num ? (w === "semibold" ? fonts.numBold : fonts.num) : fonts[w];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: family, fontSize: s.size, lineHeight: s.line, color: color ?? t.text },
        v === "label" && { textTransform: "uppercase", letterSpacing: 0.22, color: color ?? t.text3 },
        num && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---- Logo -------------------------------------------------------------------

export function Logomark({ size = 24, color }: { size?: number; color?: string }) {
  const { t } = useTheme();
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="6 6 60 60">
        {LOGOMARK_PATHS.map((d) => (
          <Path key={d} d={d} fill={color ?? t.text} />
        ))}
      </Svg>
    </View>
  );
}

export function Logo({ size = 20, color }: { size?: number; color?: string }) {
  const tr = useTr();
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size / 2 }} accessibilityLabel={tr("Marina")}>
      <Logomark size={size} color={color} />
      <Text style={{ fontFamily: fonts.medium, fontSize: size * 1.1, color: color ?? t.text, letterSpacing: -0.2 }}>{tr("Marina")}</Text>
    </View>
  );
}

// ---- Buttons ----------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = "secondary",
  icon: IconCmp,
  size = "md",
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: Icon;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const h = size === "sm" ? 40 : size === "lg" ? 52 : 48;
  const bg = variant === "primary" ? t.primary : variant === "danger" ? t.error.base : variant === "ghost" ? "transparent" : t.surface;
  const fg = variant === "primary" ? t.onPrimary : variant === "danger" ? "#FFFFFF" : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: h,
          paddingHorizontal: size === "sm" ? 16 : 22,
          borderRadius: radius.full,
          backgroundColor: pressed && variant === "primary" ? t.primaryPressed : pressed ? t.sidebar : bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: t.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : IconCmp && <IconCmp size={18} color={fg} strokeWidth={1.75} style={DIRECTIONAL.has(IconCmp) ? flipRtl() : undefined} />}
      <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: size === "sm" ? 13 : 15, color: fg, flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon: IconCmp, label, onPress, plain, badge = 0 }: { icon: Icon; label: string; onPress: () => void; plain?: boolean; badge?: number }) {
  const tr = useTr();
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? tr("{label}, {badge} new", { label: label, badge: badge }) : label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: plain ? 0 : 1, borderColor: t.border, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.sidebar : plain ? "transparent" : t.surface })}
    >
      <IconCmp size={plain ? 22 : 20} color={plain ? t.text : t.text2} strokeWidth={1.5} style={DIRECTIONAL.has(IconCmp) ? flipRtl() : undefined} />
      <Dot count={badge} />
    </Pressable>
  );
}

// ---- Layout -----------------------------------------------------------------

/** Scrollable screen body with brand side padding. */
export function Screen({ children, title, right }: { children: ReactNode; title?: string; right?: ReactNode }) {
  const { t } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      {title && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Txt v="h1">{title}</Txt>
          {right}
        </View>
      )}
      {children}
    </ScrollView>
  );
}

/** Header for full-screen pages opened from the tabs (inbox, messages, scanner). */
export function StackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const tr = useTr();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: 1, borderColor: t.border }}>
      <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Back")}
          hitSlop={4}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.sidebar : "transparent" })}
        >
          <ArrowLeft style={flipRtl()} size={22} color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" numberOfLines={1}>{title}</Txt>
          {subtitle ? <Txt v="caption" color={t.text3} numberOfLines={1}>{subtitle}</Txt> : null}
        </View>
        {right}
      </View>
      <OfflineBanner />
    </View>
  );
}

/** Shown under the header while the phone has no connection. */
export function OfflineBanner() {
  const { online } = useStore();
  const tr = useTr();
  const { t } = useTheme();
  if (online) return null;
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: t.status.pending.bg }}>
      <WifiOff size={16} color={t.status.pending.fg} />
      <Txt v="caption" weight="medium" color={t.status.pending.fg} style={{ flex: 1 }}>{tr("You're offline. Keep working: changes are saved on this phone.")}</Txt>
    </View>
  );
}

/** Small count bubble for header icons. */
export function Dot({ count }: { count: number }) {
  const { t } = useTheme();
  if (!count) return null;
  return (
    <View style={{ position: "absolute", top: 4, end: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: t.error.base, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: t.surface }}>
      <Text style={{ fontFamily: fonts.numBold, fontSize: 10, lineHeight: 12, color: "#FFFFFF" }}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

/** Pill choice used for small option sets (methods, types, colleagues). */
export function Chip({ label, on, onPress, disabled, sub }: { label: string; on: boolean; onPress: () => void; disabled?: boolean; sub?: string }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, paddingVertical: sub ? 6 : 0, borderRadius: sub ? radius.md : 20, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : t.surface, opacity: disabled ? 0.4 : 1 }}
    >
      <Txt v="bodySm" weight="semibold" num color={on ? t.onPrimary : t.text}>{label}</Txt>
      {sub ? <Txt v="caption" num color={on ? t.onPrimary : t.text3}>{sub}</Txt> : null}
    </Pressable>
  );
}

/** − value + control for small whole numbers (nights, guests). */
export function Stepper({ value, onChange, min = 1, max = 99, label, unit }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; unit?: string }) {
  const { t } = useTheme();
  const btn = (icon: Icon, next: number, name: string) => {
    const IconCmp = icon;
    const off = next < min || next > max;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${name} ${label}`} disabled={off} onPress={() => onChange(next)} hitSlop={4} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.sidebar : t.surface, opacity: off ? 0.35 : 1 })}>
        <IconCmp size={18} color={t.text} />
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${value}${unit ? ` ${unit}` : ""}` }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {btn(Minus, value - 1, "Fewer")}
      <Txt v="h3" num weight="semibold" style={{ minWidth: unit ? 64 : 40, textAlign: "center" }}>{value}{unit ? <Txt v="bodySm" color={t.text3}> {unit}</Txt> : null}</Txt>
      {btn(Plus, value + 1, "More")}
    </View>
  );
}

/** Horizontal row of day chips ("Thu 8 Oct") for picking a date. */
export function DayChips({ days, value, onChange }: { days: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {days.map((d) => <Chip key={d} label={weekday(fromISO(d).getDay())} sub={fmtShort(d)} on={value === d} onPress={() => onChange(d)} />)}
    </ScrollView>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  const base: ViewStyle = { borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 16 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, pressed && { backgroundColor: t.sidebar }, style]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt v="h3">{title}</Txt>
          {count !== undefined && (
            <View style={{ backgroundColor: t.surface3, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 1 }}>
              <Txt v="caption" num weight="semibold" color={t.text2}>{count}</Txt>
            </View>
          )}
        </View>
        {action}
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  const { t } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: radius.full, padding: 4, marginBottom: 16, gap: 4 }}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(it.value)}
            style={{ flex: 1, height: 40, borderRadius: radius.full, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: on ? t.surface : "transparent" }}
          >
            <Txt v="bodySm" weight="semibold" color={on ? t.text : t.text3}>{it.label}</Txt>
            {it.count !== undefined && <Txt v="caption" num color={t.text3}>{it.count}</Txt>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon: IconCmp, title, body }: { icon: Icon; title: string; body?: string }) {
  const { t } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.surface3, alignItems: "center", justifyContent: "center" }}>
        <IconCmp size={20} color={t.text2} strokeWidth={1.5} />
      </View>
      <Txt v="body" weight="medium" style={{ marginTop: 12, textAlign: "center" }}>{title}</Txt>
      {body && <Txt v="bodySm" color={t.text3} style={{ marginTop: 4, textAlign: "center" }}>{body}</Txt>}
    </View>
  );
}

export function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderColor: t.border, paddingBottom: 12, marginBottom: 12 }}>
      <Txt v="bodySm" color={t.text3}>{label}</Txt>
      <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
        <Txt v="bodySm" weight="medium" style={{ textAlign: alignEnd() }}>{value}</Txt>
        {sub ? <Txt v="caption" color={t.text3} style={{ textAlign: alignEnd() }}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

// ---- Badges (07 status badges) ----------------------------------------------

export type Tone = "active" | "pending" | "cancelled" | "maintenance" | "neutral" | "success" | "info" | "outline";

export function Badge({ tone, icon: IconCmp, label }: { tone: Tone; icon?: Icon; label: string }) {
  const { t } = useTheme();
  const map: Record<Tone, { bg: string; fg: string; border?: string }> = {
    active: { bg: t.status.active, fg: "#FFFFFF" },
    pending: t.status.pending,
    cancelled: { bg: t.status.cancelled, fg: "#FFFFFF" },
    maintenance: t.status.maintenance,
    neutral: t.status.neutral,
    success: t.success,
    info: t.info,
    outline: { bg: t.surface, fg: t.text2, border: t.border },
  };
  const c = map[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: c.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2, borderWidth: c.border ? 1 : 0, borderColor: c.border }}>
      {IconCmp && <IconCmp size={13} color={c.fg} strokeWidth={2} />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: c.fg }}>{label}</Text>
    </View>
  );
}

// ---- Inputs -----------------------------------------------------------------

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt v="bodySm" weight="medium">{label}</Txt>
      {children}
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <CircleAlert size={14} color={t.error.fg} />
          <Txt v="caption" weight="medium" color={t.error.fg}>{error}</Txt>
        </View>
      ) : hint ? (
        <Txt v="caption" color={t.text3}>{hint}</Txt>
      ) : null}
    </View>
  );
}

export function Input({ invalid, secure, ...props }: TextInputProps & { invalid?: boolean; secure?: boolean }) {
  const tr = useTr();
  const { t } = useTheme();
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ justifyContent: "center" }}>
      <TextInput
        placeholderTextColor={t.text3}
        secureTextEntry={secure && !show}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        {...props}
        style={[
          {
            minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingEnd: secure ? 48 : 14,
            fontFamily: fonts.regular, fontSize: 15, color: t.text, backgroundColor: t.surface,
            borderColor: invalid ? t.error.base : focus ? t.focus : t.borderStrong,
          },
          props.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
          props.style,
        ]}
      />
      {secure && (
        <Pressable accessibilityRole="button" accessibilityLabel={show ? tr("Hide password") : tr("Show password")} onPress={() => setShow((s) => !s)} hitSlop={8} style={{ position: "absolute", end: 12, padding: 4 }}>
          {show ? <EyeOff size={20} color={t.text2} /> : <Eye size={20} color={t.text2} />}
        </Pressable>
      )}
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { t } = useTheme();
  return (
    <View style={{ justifyContent: "center", marginBottom: 16 }}>
      <Search size={20} color={t.text3} style={{ position: "absolute", start: 16, zIndex: 1 }} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.text3}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{ height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: t.borderStrong, backgroundColor: t.surface, paddingStart: 46, paddingEnd: 16, fontFamily: fonts.regular, fontSize: 15, color: t.text }}
      />
    </View>
  );
}

// ---- Bottom sheet (07 modals: radius 20, padding 32 → 24 on phones) -----------

export function Sheet({ open, onClose, title, subtitle, children, footer }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const tr = useTr();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel={tr("Close")} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
        <View style={{ maxHeight: "90%", backgroundColor: t.raised, borderTopStartRadius: radius.xl, borderTopEndRadius: radius.xl, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.borderStrong }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt v="h2">{title}</Txt>
              {subtitle && <Txt v="bodySm" color={t.text3}>{subtitle}</Txt>}
            </View>
            <IconButton icon={X} label={tr("Close")} onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={{ paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderColor: t.border, gap: 8 }}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
      {/* Modals cover the app's own toasts, so confirmations show on top of the sheet too. */}
      <Toasts top={insets.top + 12} />
    </Modal>
  );
}

// ---- Toasts (07: white card with border and a colored leading icon) -------------

export function Toasts({ top }: { top?: number }) {
  const tr = useTr();
  const { toasts } = useStore();
  const { t } = useTheme();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" style={[{ position: "absolute", start: 12, end: 12, gap: 8 }, top !== undefined ? { top } : { bottom: 96 }]} accessibilityLiveRegion="polite">
      {toasts.map((x) => {
        const IconCmp = x.kind === "warning" ? TriangleAlert : x.kind === "error" ? CircleAlert : CircleCheck;
        const color = x.kind === "warning" ? "#E0A11B" : x.kind === "error" ? t.error.base : t.green;
        return (
          <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.raised, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#17191E", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
            <IconCmp size={20} color={color} />
            <Txt v="bodySm" style={{ flex: 1 }}>{x.message}</Txt>
            {x.undo && (
              <Pressable accessibilityRole="button" onPress={x.undo} hitSlop={8}>
                <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Undo")}</Txt>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Initials avatar. `dot` adds a green status dot (signed in, or on the clock). */
export function Avatar({ name, size = 48, dot }: { name: string; size?: number; dot?: boolean }) {
  const { t } = useTheme();
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.surface3, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: size / 3, color: t.text2 }}>{initials}</Text>
      {dot && <View style={{ position: "absolute", end: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: t.green, borderWidth: 2, borderColor: t.bg }} />}
    </View>
  );
}
