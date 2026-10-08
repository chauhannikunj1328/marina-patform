// The floating Read button (bottom centre, above the tabs) and the guide for the screen you're on.
// Every language's guides ship inside the app, so they open instantly and work offline.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen } from "lucide-react-native";
import { guideFor, type GuideKey } from "@marina/shared";
import "@marina/shared/guides/bundled";
import { Sheet, Txt } from "./ui";
import { useTheme } from "../theme";
import { useLang, useTr } from "../lib/i18n";
import { useRole } from "../lib/role";

const SCREENS: Record<string, GuideKey> = {
  login: "m.login", berth: "m.berth", marina: "m.marina", scan: "m.scan", patrol: "m.patrol", report: "m.report", owners: "m.owners",
  invoices: "m.invoices", inbox: "m.inbox", chat: "m.chat", activity: "m.activity", compare: "m.compare", revenue: "m.revenue",
};
const TABS: Record<string, GuideKey> = { approvals: "m.approvals", bookings: "m.bookings", berths: "m.berths", tasks: "m.tasks", team: "m.team", me: "m.me" };

/** Which guide belongs to a screen (by its route segments). Nothing for the splash screen. */
export function mobileGuideKey(segments: string[], office: boolean): GuideKey | undefined {
  const [first, second] = segments;
  if (first === "(tabs)") return !second || second === "index" ? (office ? "m.overview" : "m.today") : TABS[second];
  return first ? SCREENS[first] : undefined;
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
  const guide = key ? guideFor(key, lang) : undefined;
  if (!guide) return null;
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
      <Sheet open={open} onClose={() => setOpen(false)} title={guide.title} subtitle={tr("Guide")}>
        <Txt>{guide.summary}</Txt>
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: t.surface2 }}>
          <Txt v="bodySm" color={t.text2}><Txt v="bodySm" weight="semibold">{tr("Who it's for")}: </Txt>{guide.who}</Txt>
        </View>
        {guide.sections.map((s, i) => (
          <View key={i} style={{ marginTop: 20, gap: 6 }}>
            <Txt v="h3" weight="semibold">{s.heading}</Txt>
            {s.text && <Txt color={t.text2}>{s.text}</Txt>}
            {s.steps?.map((x, j) => (
              <View key={`s${j}`} style={{ flexDirection: "row", gap: 8 }}>
                <Txt num weight="semibold" color={t.text3} style={{ minWidth: 18 }}>{`${j + 1}.`}</Txt>
                <Txt color={t.text2} style={{ flex: 1 }}>{x}</Txt>
              </View>
            ))}
            {s.points?.map((x, j) => (
              <View key={`p${j}`} style={{ flexDirection: "row", gap: 8 }}>
                <Txt color={t.text3} style={{ minWidth: 18 }}>•</Txt>
                <Txt color={t.text2} style={{ flex: 1 }}>{x}</Txt>
              </View>
            ))}
          </View>
        ))}
      </Sheet>
    </>
  );
}
