// The floating Read button (bottom centre, above the tabs) and the guide for the screen you're on: a
// large pop-up with a tab per section, each with a screenshot (red boxes mark what to use). The text
// ships inside the app, so it opens instantly and works offline; pictures come from the web app and
// show when there's a connection.
import { useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, BookOpen, X } from "lucide-react-native";
import { guideFor, shotFile, type GuideKey, type GuideSection } from "@marina/shared";
import "@marina/shared/guides/bundled";
import { Txt } from "./ui";
import { flipRtl, useTheme } from "../theme";
import { useLang, useTr } from "../lib/i18n";
import { useRole } from "../lib/role";

/** Where the pictures are served (the web app). */
const IMAGES = process.env.EXPO_PUBLIC_GUIDE_IMAGES ?? "https://marina-patform.vercel.app/guides";

const SCREENS: Record<string, GuideKey> = {
  login: "m.login", berth: "m.berth", marina: "m.marina", scan: "m.scan", patrol: "m.patrol", report: "m.report", owners: "m.owners",
  invoices: "m.invoices", inbox: "m.inbox", chat: "m.chat", activity: "m.activity", compare: "m.compare", revenue: "m.revenue",
};
const TABS: Record<string, GuideKey> = { approvals: "m.approvals", bookings: "m.bookings", berths: "m.berths", tasks: "m.tasks", team: "m.team", me: "m.me" };
/** Guides shown together: a berth opens as a sheet over the Berths tab, covering the Read button. */
const ALSO: Partial<Record<GuideKey, GuideKey>> = { "m.berths": "m.berth" };

/** Which guide belongs to a screen (by its route segments). Nothing for the splash screen. */
export function mobileGuideKey(segments: string[], office: boolean): GuideKey | undefined {
  const [first, second] = segments;
  if (first === "(tabs)") return !second || second === "index" ? (office ? "m.overview" : "m.today") : TABS[second];
  return first ? SCREENS[first] : undefined;
}

function Shot({ guideKey, index, lang }: { guideKey: GuideKey; index: number; lang: string }) {
  const { t } = useTheme();
  const tr = useTr();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={{ alignItems: "center", marginBottom: 16 }}>
      <View style={{ width: "100%", maxWidth: 300, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: t.border, backgroundColor: t.surface2 }}>
        <Image
          source={{ uri: `${IMAGES}/${shotFile(guideKey, index, lang as "en")}` }}
          accessibilityLabel={tr("Screenshot")}
          onError={() => setFailed(true)}
          style={{ width: "100%", aspectRatio: 390 / 844 }}
          resizeMode="cover"
        />
      </View>
      <Txt v="caption" color={t.text3} style={{ marginTop: 6, textAlign: "center" }}>{tr("Red boxes show where to look, numbered in the order you use them.")}</Txt>
    </View>
  );
}

function Body({ section }: { section: GuideSection }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Txt v="h3" weight="semibold">{section.heading}</Txt>
      {section.text && <Txt color={t.text2}>{section.text}</Txt>}
      {section.steps?.map((x, j) => (
        <View key={`s${j}`} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.surface3, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            <Txt v="caption" num weight="semibold">{String(j + 1)}</Txt>
          </View>
          <Txt color={t.text2} style={{ flex: 1 }}>{x}</Txt>
        </View>
      ))}
      {section.points?.map((x, j) => (
        <View key={`p${j}`} style={{ flexDirection: "row", gap: 10 }}>
          <Txt color={t.text3} style={{ width: 22, textAlign: "center" }}>•</Txt>
          <Txt color={t.text2} style={{ flex: 1 }}>{x}</Txt>
        </View>
      ))}
    </View>
  );
}

function GuideDialog({ guideKey, onClose }: { guideKey: GuideKey; onClose: () => void }) {
  const { lang } = useLang();
  const tr = useTr();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const tabBar = useRef<ScrollView>(null);
  const tabX = useRef<number[]>([]);
  const [tab, setTab] = useState(0);
  const main = guideFor(guideKey, lang)!;
  const also = ALSO[guideKey] ? guideFor(ALSO[guideKey]!, lang) : undefined;
  // Every section of this screen's guide, then any guide shown with it.
  const items = [
    ...main.sections.map((section, index) => ({ key: guideKey, index, section })),
    ...(also ? also.sections.map((section, index) => ({ key: ALSO[guideKey]!, index, section })) : []),
  ];
  const count = items.length + 1;
  const go = (i: number) => {
    const next = Math.max(0, Math.min(count - 1, i));
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
    // Keep the selected tab in view.
    tabBar.current?.scrollTo({ x: Math.max(0, (tabX.current[next] ?? 0) - 40), animated: true });
  };
  const item = tab > 0 ? items[tab - 1] : null;
  const labels = [tr("Overview"), ...items.map((x, i) => `${i + 1}. ${x.section.heading}`)];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.scrim, justifyContent: "center", paddingHorizontal: 10, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }}>
        <View accessibilityViewIsModal style={{ height: Math.min(height - insets.top - insets.bottom - 20, 900), backgroundColor: t.raised, borderRadius: 20, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 20, paddingTop: 18 }}>
            <View style={{ flex: 1 }}>
              <Txt v="label" color={t.text3}>{tr("Guide").toUpperCase()}</Txt>
              <Txt v="h2">{main.title}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={tr("Close guide")} onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={t.text2} strokeWidth={1.5} />
            </Pressable>
          </View>
          <ScrollView ref={tabBar} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" style={{ flexGrow: 0, marginTop: 12, borderBottomWidth: 1, borderColor: t.border }} contentContainerStyle={{ paddingHorizontal: 14, gap: 4 }}>
            {labels.map((label, i) => (
              <Pressable key={i} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} onPress={() => go(i)} onLayout={(e) => { tabX.current[i] = e.nativeEvent.layout.x; }}
                style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderColor: tab === i ? t.primary : "transparent" }}>
                <Txt v="bodySm" weight={tab === i ? "semibold" : "medium"} color={tab === i ? t.text : t.text3}>{label}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
            {!item ? (
              <View style={{ gap: 14 }}>
                <Txt v="h3">{main.summary}</Txt>
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: t.surface2 }}>
                  <Txt v="bodySm" color={t.text2}><Txt v="bodySm" weight="semibold">{tr("Who it's for")}: </Txt>{main.who}</Txt>
                </View>
                <Txt weight="semibold" style={{ marginTop: 6 }}>{tr("What's in this guide")}</Txt>
                {items.map((x, i) => (
                  <Pressable key={i} accessibilityRole="button" onPress={() => go(i + 1)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.surface3, alignItems: "center", justifyContent: "center" }}>
                      <Txt v="caption" num weight="semibold">{String(i + 1)}</Txt>
                    </View>
                    <Txt weight="medium" style={{ flex: 1 }}>{x.section.heading}</Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View>
                <Shot key={`${item.key}-${item.index}`} guideKey={item.key} index={item.index} lang={lang} />
                <Body section={item.section} />
              </View>
            )}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: t.border }}>
            <Pressable accessibilityRole="button" disabled={tab === 0} onPress={() => go(tab - 1)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: t.border, opacity: tab === 0 ? 0.4 : 1 }}>
              <ArrowLeft size={16} color={t.text} strokeWidth={1.5} style={flipRtl()} />
              <Txt v="bodySm" weight="semibold">{tr("Previous")}</Txt>
            </Pressable>
            <Txt v="caption" num color={t.text3}>{tr("{n} of {total}", { n: tab + 1, total: count })}</Txt>
            <Pressable accessibilityRole="button" onPress={() => (tab === count - 1 ? onClose() : go(tab + 1))} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.primary }}>
              <Txt v="bodySm" weight="semibold" color={t.onPrimary}>{tab === count - 1 ? tr("guide|Done") : tr("Next")}</Txt>
              {tab < count - 1 && <ArrowRight size={16} color={t.onPrimary} strokeWidth={1.5} style={flipRtl()} />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function GuideButton() {
  const segments = useSegments() as string[];
  const { office } = useRole();
  const { lang } = useLang();
  const tr = useTr();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const key = mobileGuideKey(segments, office);
  if (!key || !guideFor(key, lang)) return null;
  // Above the tab bar on tab screens; near the bottom edge elsewhere.
  const bottom = insets.bottom + (segments[0] === "(tabs)" ? 64 + 10 : 16);
  return (
    <>
      <View pointerEvents="box-none" style={{ position: "absolute", start: 0, end: 0, bottom, alignItems: "center" }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={tr("Read the guide for this page")}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 20, borderRadius: 9999,
            backgroundColor: pressed ? t.primaryPressed : t.primary,
            shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          })}
        >
          <BookOpen size={16} color={t.onPrimary} strokeWidth={1.5} />
          <Txt weight="semibold" color={t.onPrimary}>{tr("Read")}</Txt>
        </Pressable>
      </View>
      {open && <GuideDialog guideKey={key} onClose={() => setOpen(false)} />}
    </>
  );
}
