// Me: profile, this week's shifts and hours, time off and swaps, marinas, appearance and account.
// Managers and admins without a staff record see their role, marinas and a link to the web app.
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, CloudOff, ExternalLink, KeyRound, LogOut, Plus, UserRoundPen } from "lucide-react-native";
import { addDays, DAYS, fmtDuration, fmtShort, fmtTime, fromISO, localDay, minutesWorked, planFor, SHIFT_HOURS, today, type StaffRequest } from "@marina/shared";
import { Avatar, Badge, Button, Screen, Section, Txt, type Icon } from "@/components/ui";
import { PasswordSheet, ProfileSheet, RequestSheet } from "@/components/me-sheets";
import { useNow } from "@/lib/clock";
import { useMe, useStore } from "@/store";
import { useTheme, type ThemeMode } from "@/theme";

function RequestBadge({ r }: { r: StaffRequest }) {
  if (r.status === "approved") return <Badge tone="success" label="Approved" />;
  if (r.status === "declined") return <Badge tone="cancelled" label="Declined" />;
  return <Badge tone="pending" label="Waiting" />;
}

/** Office web app, for everything the phone app doesn't do (billing, reports, settings). */
const WEB_APP = "https://marina-patform.vercel.app";

const ROLE_LABEL = { admin: "Admin", manager: "Marina manager", staff: "Staff" } as const;

function ListRow({ icon: IconCmp, label, sub, onPress, external }: { icon: Icon; label: string; sub?: string; onPress: () => void; external?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable accessibilityRole={external ? "link" : "button"} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <IconCmp size={20} color={t.text2} strokeWidth={1.5} />
      <View style={{ flex: 1 }}>
        <Txt>{label}</Txt>
        {sub ? <Txt v="caption" color={t.text3}>{sub}</Txt> : null}
      </View>
      {external ? <ExternalLink size={18} color={t.text3} /> : <ChevronRight size={18} color={t.text3} />}
    </Pressable>
  );
}

export default function Me() {
  const { db, ix, user, scope, signOut, update, toast, outbox, isManager } = useStore();
  const me = useMe();
  const { t, mode, setMode } = useTheme();
  const now = useNow();
  const [sheet, setSheet] = useState<"request" | "profile" | "password" | undefined>();
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekMinutes = me ? minutesWorked(db.timeEntries, me.id, start, addDays(start, 7), now) : 0;
  const entries = me ? db.timeEntries.filter((e) => e.staffId === me.id).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 6) : [];
  const mine = me ? db.requests.filter((r) => r.staffId === me.id && r.end >= addDays(today(), -14)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const askedToCover = me ? db.requests.filter((r) => r.kind === "swap" && r.swapWithId === me.id && r.status !== "declined" && r.start >= today()) : [];

  const withdraw = (r: StaffRequest) => {
    const before = db;
    update((d) => ({ ...d, requests: d.requests.filter((x) => x.id !== r.id) }), { text: `${me?.name} withdrew a ${r.kind === "leave" ? "time off" : "shift swap"} request`, marinaId: me?.marinaId });
    toast("Request withdrawn", before);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Avatar name={user?.name ?? ""} size={56} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{user?.name}</Txt>
          <Txt v="bodySm" color={t.text3} numberOfLines={1}>{me?.position ?? ROLE_LABEL[user?.role ?? "staff"]} · {me?.phone ?? user?.email}</Txt>
        </View>
      </View>

      {me && (
        <Section title="My week">
          <View style={{ flexDirection: "row", gap: 6 }}>
            {week.map((d, i) => {
              const plan = planFor(me, d, db.requests);
              const isToday = d === today();
              const tag = plan.working ? (plan.covering ? "Cover" : me.shift) : plan.why === "leave" ? "Leave" : plan.why === "swapped" ? "Swap" : "Off";
              return (
                <View key={d} accessibilityLabel={`${DAYS[i]} ${fmtShort(d)}: ${plan.working ? `${me.shift} shift` : tag}`} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: isToday ? 2 : 1, borderColor: isToday ? t.primary : t.border, backgroundColor: plan.working ? t.tealStrong : t.surface }}>
                  <Txt v="label" color={plan.working ? t.onTealStrong : t.text3}>{DAYS[i]}</Txt>
                  <Txt weight="semibold" num color={plan.working ? t.onTealStrong : t.text}>{Number(d.slice(8))}</Txt>
                  <Txt v="caption" color={plan.working ? t.onTealStrong : t.text3} style={{ fontSize: 10 }}>{tag}</Txt>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt v="bodySm" color={t.text3}>{me.shift} shift · {SHIFT_HOURS[me.shift]}</Txt>
            <Txt v="bodySm" num weight="semibold">{fmtDuration(weekMinutes)} worked</Txt>
          </View>
        </Section>
      )}

      {entries.length > 0 && (
        <Section title="Timesheet">
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface }}>
            {entries.map((e, i) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                <Txt v="bodySm" style={{ width: 92 }}>{localDay(e.start) === today() ? "Today" : `${DAYS[new Date(e.start).getDay()]} ${fmtShort(localDay(e.start))}`}</Txt>
                <Txt v="bodySm" num color={t.text2} style={{ flex: 1 }}>{fmtTime(e.start)} – {e.end ? fmtTime(e.end) : "now"}</Txt>
                <Txt v="bodySm" num weight="medium">{fmtDuration(((e.end ? Date.parse(e.end) : now) - Date.parse(e.start)) / 60_000)}</Txt>
              </View>
            ))}
          </View>
        </Section>
      )}

      {me && !isManager && (
        <Section title="Time off and swaps" action={<Button size="sm" icon={Plus} label="Request" onPress={() => setSheet("request")} />}>
          {mine.length === 0 && askedToCover.length === 0 && <Txt v="bodySm" color={t.text3}>Ask for time off or swap a shift with a colleague. Your manager approves it.</Txt>}
          {askedToCover.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, backgroundColor: t.accentSoft }}>
              <Txt v="bodySm" weight="semibold">Covering for {ix.staffMember(r.staffId)?.name}</Txt>
              <Txt v="bodySm" color={t.text2}>{fmtShort(r.start)} · {ix.staffMember(r.staffId)?.shift} shift · {r.status === "approved" ? "confirmed" : "waiting for your manager"}</Txt>
            </View>
          ))}
          {mine.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, backgroundColor: t.surface, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Txt v="bodySm" weight="semibold" style={{ flex: 1 }}>
                  {r.kind === "leave" ? `Time off ${fmtShort(r.start)}${r.end !== r.start ? ` – ${fmtShort(r.end)}` : ""}` : `Swap ${fmtShort(r.start)} with ${ix.staffMember(r.swapWithId)?.name}`}
                </Txt>
                <RequestBadge r={r} />
              </View>
              <Txt v="caption" color={t.text3}>{r.reason}{r.decidedBy ? ` · ${r.status} by ${r.decidedBy}` : ""}</Txt>
              {r.status === "pending" && (
                <Pressable accessibilityRole="button" onPress={() => withdraw(r)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
                  <Txt v="caption" weight="semibold" color={t.error.fg}>Withdraw</Txt>
                </Pressable>
              )}
            </View>
          ))}
        </Section>
      )}

      {user?.role === "admin" && !user.marinaIds.length ? (
        <Section title="Access">
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, padding: 16 }}>
            <Txt>All {scope.length} marinas</Txt>
            <Txt v="bodySm" color={t.text3}>{db.counties.length} counties · {db.cities.length} cities. Open any marina from Overview.</Txt>
          </View>
        </Section>
      ) : (
        <Section title="My marinas">
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
            {scope.map((id, i) => {
              const body = (
                <>
                  <View style={{ flex: 1 }}>
                    <Txt>{ix.marina(id)?.name}</Txt>
                    <Txt v="bodySm" color={t.text3}>{ix.marina(id)?.address}, {ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
                  </View>
                  {isManager && <ChevronRight size={18} color={t.text3} />}
                </>
              );
              const style = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border };
              return isManager ? (
                <Pressable key={id} accessibilityRole="button" onPress={() => router.push({ pathname: "/marina", params: { id } })} style={({ pressed }) => [style, pressed && { backgroundColor: t.sidebar }]}>{body}</Pressable>
              ) : (
                <View key={id} style={style}>{body}</View>
              );
            })}
          </View>
        </Section>
      )}

      <Section title="Appearance">
        <View style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: 9999, padding: 4, gap: 4 }}>
          {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: mode === m }} onPress={() => setMode(m)} style={{ flex: 1, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: mode === m ? t.surface : "transparent" }}>
              <Txt v="bodySm" weight="semibold" color={mode === m ? t.text : t.text3}>{m === "system" ? "Automatic" : m === "light" ? "Light" : "Dark"}</Txt>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Account">
        <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
          {me && <ListRow icon={UserRoundPen} label="Edit profile" onPress={() => setSheet("profile")} />}
          {me && <View style={{ height: 1, backgroundColor: t.border }} />}
          <ListRow icon={KeyRound} label="Change password" onPress={() => setSheet("password")} />
          {isManager && (
            <>
              <View style={{ height: 1, backgroundColor: t.border }} />
              <ListRow external icon={ExternalLink} label="Open the web app" sub="Billing, reports, staff accounts and settings" onPress={() => void Linking.openURL(WEB_APP)} />
            </>
          )}
        </View>
        {outbox.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CloudOff size={16} color={t.text3} />
            <Txt v="caption" color={t.text3}>{outbox.length} {outbox.length === 1 ? "change" : "changes"} made offline, saved on this phone</Txt>
          </View>
        )}
      </Section>

      <Button size="lg" icon={LogOut} label="Sign out" onPress={() => { signOut(); router.replace("/login"); }} />

      {sheet === "request" && <RequestSheet onClose={() => setSheet(undefined)} />}
      {sheet === "profile" && <ProfileSheet onClose={() => setSheet(undefined)} />}
      {sheet === "password" && <PasswordSheet onClose={() => setSheet(undefined)} />}
    </Screen>
  );
}
