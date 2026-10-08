// Home. Visitors: what the app does, a way into search, and the marinas. Owners: their next stay
// (with the dock office's number and directions), what they owe, contracts to sign and recent bookings.
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Anchor, ArrowRight, CalendarCheck, CalendarDays, Clock, FileSignature, MapPin, Receipt, Search, Ship } from "lucide-react-native";
import { amountDue, daysBetween, fmtDate, marinaFacts, money, moneyTotal, openMarinas, ownerBookings, ownerInvoices, ownerWaitlist, radius, stateOf, tn, today, type Marina } from "@marina/shared";
import { Badge, Button, Card, Logo, Section, Txt } from "@/components/ui";
import { BookingStatus, MarinaActions, Page } from "@/components/parts";
import { useStore } from "@/store";
import { flipRtl, useTheme } from "@/theme";
import { useTr } from "@/lib/i18n";
import { stamp } from "@/lib/useOpenParam";

function MarinaTile({ marina }: { marina: Marina }) {
  const { t } = useTheme();
  const { db, ix } = useStore();
  const tr = useTr();
  const f = marinaFacts(db, marina.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={marina.name}
      onPress={() => router.push({ pathname: "/marina/[id]", params: { id: marina.id } })}
      style={({ pressed }) => ({ width: 220, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.sidebar : t.surface, padding: 16, gap: 4 })}
    >
      <Txt v="caption" color={t.text3} numberOfLines={1}>{ix.city(marina.cityId)?.name}, {tr(stateOf(db, marina))}</Txt>
      <Txt weight="medium" numberOfLines={1}>{marina.name}</Txt>
      <Txt v="caption" color={t.text3}>{tr("{n} berths · boats up to {ft} ft", { n: f.berths, ft: f.maxLength })}</Txt>
      <Txt v="bodySm" style={{ marginTop: 8 }}>{tr("from")} <Txt v="bodySm" num weight="semibold">{money(f.fromDaily, f.currency)}</Txt> {tr("/night")}</Txt>
    </Pressable>
  );
}

function Marinas() {
  const { db } = useStore();
  const tr = useTr();
  const { t } = useTheme();
  const list = openMarinas(db);
  return (
    <Section title={tr("Our marinas")} count={list.length} action={<Button size="sm" variant="ghost" label={tr("See all")} icon={ArrowRight} onPress={() => router.push("/marinas")} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ marginHorizontal: -16 }}>
        <View style={{ width: 4 }} />
        {list.slice(0, 6).map((m) => <MarinaTile key={m.id} marina={m} />)}
        <View style={{ width: 4 }} />
      </ScrollView>
      <Txt v="caption" color={t.text3}>{tr("Tap a marina to see its berths, rates and amenities.")}</Txt>
    </Section>
  );
}

function Welcome() {
  const { t } = useTheme();
  const tr = useTr();
  const steps: [typeof Search, string, string][] = [
    [Search, tr("Search"), tr("Pick your dates and enter your boat's length. You'll only see berths your boat fits and that are free the whole time.")],
    [CalendarCheck, tr("Book"), tr("Choose a berth and send the request. The marina confirms it, usually within one business day, and emails your invoice.")],
    [Anchor, tr("Arrive"), tr("Check in at the dock office. Your bookings, invoices and receipts are always in your account.")],
  ];
  return (
    <>
      <View style={{ backgroundColor: t.primary, borderRadius: radius.xl, padding: 24, gap: 12 }}>
        <Logo size={20} color={t.onPrimary} />
        <Txt v="h1" color={t.onPrimary} style={{ marginTop: 12 }}>{tr("Your berth, booked in minutes.")}</Txt>
        <Txt v="bodySm" color={t.onPrimary} style={{ opacity: 0.85 }}>{tr("See which berths are free for your dates and boat, check the price, and book online. Stay a night, a season or the whole year.")}</Txt>
        <Button size="lg" icon={Search} label={tr("Find a berth")} onPress={() => router.navigate("/book")} style={{ marginTop: 8 }} />
        <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} style={{ alignSelf: "center", padding: 6 }}>
          <Txt v="bodySm" weight="semibold" color={t.onPrimary}>{tr("Already have an account? Sign in")}</Txt>
        </Pressable>
      </View>
      <Marinas />
      <Section title={tr("How it works")}>
        {steps.map(([Icon, title, body], i) => (
          <Card key={title} style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={t.onAccent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="medium"><Txt num color={t.text3}>{i + 1}.</Txt> {title}</Txt>
              <Txt v="bodySm" color={t.text2}>{body}</Txt>
            </View>
          </Card>
        ))}
      </Section>
    </>
  );
}

export default function Home() {
  const { t } = useTheme();
  const { db, ix, owner } = useStore();
  const tr = useTr();
  if (!owner) return <Page><Welcome /></Page>;

  const now = today();
  const bookings = ownerBookings(db, owner.id);
  const live = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed" && b.end > now).sort((a, b) => a.start.localeCompare(b.start));
  const next = live[0];
  const nextMarina = next && ix.marinaOfBerth(next.berthId);
  const owed = ownerInvoices(db, owner.id).filter((i) => amountDue(i) > 0);
  const balance = moneyTotal(owed.map((i) => ({ amount: amountDue(i), currency: ix.curOfInvoice(i) })));
  const toSign = db.contracts.filter((c) => c.ownerId === owner.id && c.status === "active" && c.end > now && !c.signed);
  const boats = db.boats.filter((b) => b.ownerId === owner.id);
  const waiting = ownerWaitlist(db, owner.email);

  return (
    <Page>
      <View style={{ paddingTop: 8 }}>
        <Txt v="caption" color={t.text3}>{fmtDate(now)}</Txt>
        <Txt v="h1">{tr("Hi, {name}", { name: owner.name.split(" ")[0] })}</Txt>
      </View>

      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <CalendarDays size={16} color={t.text3} />
          <Txt v="bodySm" color={t.text3}>{next && next.start <= now ? tr("Staying now") : tr("Next stay")}</Txt>
        </View>
        {next && nextMarina ? (
          <>
            <Txt v="h3" style={{ marginTop: 4 }}>{nextMarina.name}</Txt>
            <Txt v="bodySm" color={t.text2}>{fmtDate(next.start)} – {fmtDate(next.end)} · {tr("Berth {code}", { code: ix.berth(next.berthId)?.code })}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <BookingStatus b={next} />
              {next.start > now && <Txt v="caption" color={t.text3}>{tn(daysBetween(now, next.start), "in {n} day", "in {n} days")}</Txt>}
            </View>
            <View style={{ marginTop: 10 }}><MarinaActions marina={nextMarina} /></View>
          </>
        ) : (
          <>
            <Txt color={t.text2} style={{ marginTop: 4 }}>{tr("No stays booked.")}</Txt>
            <Button variant="primary" size="sm" label={tr("Book a berth")} onPress={() => router.navigate("/book")} style={{ alignSelf: "flex-start", marginTop: 8 }} />
          </>
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Receipt size={16} color={t.text3} />
          <Txt v="bodySm" color={t.text3}>{tr("To pay")}</Txt>
        </View>
        <Txt v="kpi" num>{balance}</Txt>
        <Txt v="bodySm" color={t.text2}>{owed.length ? tn(owed.length, "{n} open invoice", "{n} open invoices") : tr("You're all paid up.")}</Txt>
        {owed.length > 0 && (
          <Button variant="primary" size="sm" label={tr("Pay now")} style={{ alignSelf: "flex-start", marginTop: 8 }}
            onPress={() => (owed.length === 1 ? router.push({ pathname: "/invoice/[id]", params: { id: owed[0].id } }) : router.navigate("/invoices"))} />
        )}
      </Card>

      {toSign.length > 0 && (
        <Card onPress={() => router.push("/contracts")} style={{ backgroundColor: t.accentSoft, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <FileSignature size={20} color={t.text} />
          <Txt weight="medium" style={{ flex: 1 }}>{tn(toSign.length, "{n} contract is waiting for your signature", "{n} contracts are waiting for your signature")}</Txt>
          <ArrowRight size={18} color={t.text} style={flipRtl()} />
        </Card>
      )}

      {waiting.length > 0 && (
        <Section title={tr("On the waitlist")}>
          {waiting.map((w) => (
            <Card key={w.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Clock size={16} color={t.text3} />
                <Txt weight="medium">{ix.marina(w.marinaId)?.name}</Txt>
              </View>
              <Txt v="caption" color={t.text3}>{fmtDate(w.start)} – {fmtDate(w.end)} · {w.boatName}</Txt>
              {w.status === "offered" ? <Badge tone="success" label={tr("Berth offered: the dock office will call you")} /> : <Badge tone="pending" label={tr("Waiting")} />}
            </Card>
          ))}
        </Section>
      )}

      <Section title={tr("Recent bookings")} action={bookings.length ? <Button size="sm" variant="ghost" label={tr("View all")} icon={ArrowRight} onPress={() => router.navigate("/bookings")} /> : undefined}>
        {bookings.length === 0 ? (
          <Card><Txt v="bodySm" color={t.text3}>{tr("Your stays will show here once you book.")}</Txt></Card>
        ) : bookings.slice(0, 3).map((b) => (
          <Card key={b.id} onPress={() => router.navigate({ pathname: "/bookings", params: { open: b.id, view: "upcoming", at: stamp() } })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt weight="medium" numberOfLines={1}>{ix.marinaOfBerth(b.berthId)?.name}</Txt>
              <Txt v="caption" color={t.text3}>{b.code} · {fmtDate(b.start)} – {fmtDate(b.end)}</Txt>
            </View>
            <BookingStatus b={b} />
          </Card>
        ))}
      </Section>

      <Card onPress={() => router.push("/boats")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ship size={20} color={t.text3} />
        <Txt style={{ flex: 1 }}>{boats.length ? tn(boats.length, "{n} boat on your account", "{n} boats on your account") : tr("No boats on your account yet")}</Txt>
        <Txt v="bodySm" weight="semibold" color={t.greenText}>{tr("Manage boats")}</Txt>
      </Card>

      <Card onPress={() => router.push("/marinas")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <MapPin size={20} color={t.text3} />
        <Txt style={{ flex: 1 }}>{tr("Explore our marinas")}</Txt>
        <ArrowRight size={18} color={t.text3} style={flipRtl()} />
      </Card>
    </Page>
  );
}
