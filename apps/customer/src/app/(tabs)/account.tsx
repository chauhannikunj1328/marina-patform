// Account: the owner's details, boats and contracts; language and appearance; help and sign out.
// Visitors get sign-in, the marinas and the same settings.
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { FileSignature, LogIn, LogOut, Mail, MapPin, Phone, Ship, UserRoundPen } from "lucide-react-native";
import { CONTACT, LANGS, today } from "@marina/shared";
import { Avatar, Badge, Button, Card, Section, Txt } from "@/components/ui";
import { ListRow, Page } from "@/components/parts";
import { useStore } from "@/store";
import { useTheme, type ThemeMode } from "@/theme";
import { useLang, useTr } from "@/lib/i18n";

function Group({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>{children}</View>;
}

function Toggle<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  const { t } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: 9999, padding: 4, gap: 4 }}>
      {items.map((it) => (
        <Pressable key={it.value} accessibilityRole="radio" accessibilityState={{ checked: value === it.value }} onPress={() => onChange(it.value)} style={{ flex: 1, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: value === it.value ? t.surface : "transparent" }}>
          <Txt v="bodySm" weight="semibold" color={value === it.value ? t.text : t.text3}>{it.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

export default function Account() {
  const { t, mode, setMode } = useTheme();
  const tr = useTr();
  const { lang, setLang } = useLang();
  const { db, owner, signOut, toast } = useStore();
  const now = today();
  const toSign = owner ? db.contracts.filter((c) => c.ownerId === owner.id && c.status === "active" && c.end > now && !c.signed).length : 0;
  const boats = owner ? db.boats.filter((b) => b.ownerId === owner.id).length : 0;

  return (
    <Page title={tr("Account")}>
      {owner ? (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={owner.name} size={52} />
          <View style={{ flex: 1 }}>
            <Txt v="h3" numberOfLines={1}>{owner.name}</Txt>
            <Txt v="bodySm" color={t.text3} numberOfLines={1}>{owner.email}</Txt>
          </View>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <Txt v="h3">{tr("Sign in to book and pay")}</Txt>
          <Txt v="bodySm" color={t.text3}>{tr("Your account keeps your bookings, invoices and receipts together. Pay online, sign your berth contract and keep your boat's details up to date.")}</Txt>
          <Button variant="primary" icon={LogIn} label={tr("Sign in")} onPress={() => router.push("/sign-in")} />
          <Button label={tr("Create an account")} onPress={() => router.push("/register")} />
        </Card>
      )}

      {owner && (
        <Section title={tr("My account")}>
          <Group>
            <ListRow icon={UserRoundPen} label={tr("Profile")} onPress={() => router.push("/profile")} />
            <ListRow icon={Ship} label={tr("My boats")} value={String(boats)} onPress={() => router.push("/boats")} />
            <ListRow icon={FileSignature} label={tr("Contracts")} value={toSign ? <Badge tone="pending" label={tr("To sign")} /> : undefined} onPress={() => router.push("/contracts")} last />
          </Group>
        </Section>
      )}

      <Section title={tr("Marinas")}>
        <Group>
          <ListRow icon={MapPin} label={tr("All marinas")} onPress={() => router.push("/marinas")} last />
        </Group>
      </Section>

      <Section title={tr("Language")}>
        <Toggle value={lang} onChange={setLang} items={LANGS.map((l) => ({ value: l.code, label: l.name }))} />
      </Section>

      <Section title={tr("Appearance")}>
        <Toggle<ThemeMode> value={mode} onChange={setMode} items={[{ value: "system", label: tr("Automatic") }, { value: "light", label: tr("Light") }, { value: "dark", label: tr("Dark") }]} />
      </Section>

      <Section title={tr("Help")}>
        <Group>
          <ListRow icon={Phone} label={tr("Call us")} value={CONTACT.phone} onPress={() => void Linking.openURL(`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`)} />
          <ListRow icon={Mail} label={tr("Email us")} onPress={() => void Linking.openURL(`mailto:${CONTACT.email}`)} last />
        </Group>
        <Txt v="caption" color={t.text3}>{tr(CONTACT.hours)}</Txt>
      </Section>

      {owner && <Button size="lg" icon={LogOut} label={tr("Sign out")} onPress={() => { signOut(); toast(tr("You're signed out")); }} />}

      <Txt v="caption" color={t.text3} style={{ textAlign: "center" }}>{tr("Marina Berths · version {version}", { version: Constants.expoConfig?.version ?? "1.0.0" })}</Txt>
      <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginTop: -12 }}>{tr("Sample data. Bookings and payments made here stay on this phone.")}</Txt>
    </Page>
  );
}
