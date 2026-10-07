// Me: profile, this week's shifts and hours, time off and swaps, marinas, appearance and account.
import { useEffect, useState } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, CloudOff, ExternalLink, KeyRound, LogOut, Plus, UserRoundPen } from "lucide-react-native";
import { addDays, weekday, LANGS, fmtDuration, fmtShort, fmtTime, fromISO, localDay, minutesWorked, planFor, SHIFT_HOURS, today, type StaffRequest } from "@marina/shared";
import { Avatar, Badge, Button, Screen, Section, Txt, type Icon } from "@/components/ui";
import { PasswordSheet, ProfileSheet, RequestSheet } from "@/components/me-sheets";
import { useNow } from "@/lib/clock";
import { useRole } from "@/lib/role";
import { allowNotifications, remindersSupported } from "@/lib/reminders";
import { biometricInfo, biometricUnlock } from "@/lib/biometrics";
import { useMe, useStore } from "@/store";
import { flipRtl, useTheme, type ThemeMode } from "@/theme";
import { useLang, useTr } from "@/lib/i18n";
import { tn } from "@marina/shared";

function RequestBadge({ r }: { r: StaffRequest }) {
  const tr = useTr();
  if (r.status === "approved") return <Badge tone="success" label={tr("Approved")} />;
  if (r.status === "declined") return <Badge tone="cancelled" label={tr("Declined")} />;
  return <Badge tone="pending" label={tr("Waiting")} />;
}

function ListRow({ icon: IconCmp, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: pressed ? t.sidebar : "transparent" })}>
      <IconCmp size={20} color={t.text2} strokeWidth={1.5} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <ChevronRight style={flipRtl()} size={18} color={t.text3} />
    </Pressable>
  );
}

export default function Me() {
  const tr = useTr();
  const { db, ix, user, scope, signOut, update, toast, outbox, reminders, setReminders, biometric, setBiometric } = useStore();
  const [bio, setBio] = useState<{ available: boolean; label: string }>({ available: false, label: tr("Face ID or fingerprint") });
  useEffect(() => {
    void biometricInfo().then(setBio);
  }, []);
  const me = useMe();
  const { t, mode, setMode } = useTheme();
  const { office, isAdmin } = useRole();
  const { lang, setLang } = useLang();
  const now = useNow();
  const [sheet, setSheet] = useState<"request" | "profile" | "password" | undefined>();
  const start = addDays(today(), -fromISO(today()).getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekMinutes = me ? minutesWorked(db.timeEntries, me.id, start, addDays(start, 7), now) : 0;
  const lastStart = addDays(start, -7);
  const lastWeekMinutes = me ? minutesWorked(db.timeEntries, me.id, lastStart, start, now) : 0;
  const lastApproval = me ? (db.timesheetApprovals ?? []).find((a) => a.staffId === me.id && a.weekStart === lastStart) : undefined;
  const entries = me ? db.timeEntries.filter((e) => e.staffId === me.id).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 6) : [];
  const mine = me ? db.requests.filter((r) => r.staffId === me.id && r.end >= addDays(today(), -14)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const askedToCover = me ? db.requests.filter((r) => r.kind === "swap" && r.swapWithId === me.id && r.status !== "declined" && r.start >= today()) : [];

  const withdraw = (r: StaffRequest) => {
    const before = db;
    update((d) => ({ ...d, requests: d.requests.filter((x) => x.id !== r.id) }), { text: `${me?.name} withdrew a ${r.kind === "leave" ? "time off" : "shift swap"} request`, marinaId: me?.marinaId });
    toast(tr("Request withdrawn"), before);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Avatar name={user?.name ?? ""} size={56} dot />
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{user?.name}</Txt>
          <Txt v="bodySm" color={t.text3} numberOfLines={1}>{isAdmin ? tr("Admin") : user?.role === "manager" ? tr("Marina manager") : me?.position ?? tr("Staff")} · {office ? user?.email : me?.phone ?? user?.email}</Txt>
        </View>
      </View>

      {me && !office && (
        <Section title={tr("My week")}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {week.map((d, i) => {
              const plan = planFor(me, d, db.requests);
              const isToday = d === today();
              const tag = plan.working ? (plan.covering ? tr("Cover") : tr(me.shift)) : plan.why === "leave" ? tr("Leave") : plan.why === "swapped" ? tr("Swap") : tr("Off");
              return (
                <View key={d} accessibilityLabel={`${weekday(i)} ${fmtShort(d)}: ${plan.working ? tr("{shift} shift", { shift: tr(me.shift) }) : tag}`} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: isToday ? 2 : 1, borderColor: isToday ? t.primary : t.border, backgroundColor: plan.working ? t.tealStrong : t.surface }}>
                  <Txt v="label" color={plan.working ? t.onTealStrong : t.text3}>{weekday(i)}</Txt>
                  <Txt weight="semibold" num color={plan.working ? t.onTealStrong : t.text}>{Number(d.slice(8))}</Txt>
                  <Txt v="caption" color={plan.working ? t.onTealStrong : t.text3} style={{ fontSize: 10 }}>{tag}</Txt>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt v="bodySm" color={t.text3}>{tr(me.shift)} {tr("shift ·")} {tr(SHIFT_HOURS[me.shift])}</Txt>
            <Txt v="bodySm" num weight="semibold">{tr("{time} worked", { time: fmtDuration(weekMinutes) })}</Txt>
          </View>
          {lastWeekMinutes > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Txt v="bodySm" color={t.text3}>{tr("Last week")}: {fmtDuration(lastWeekMinutes)}</Txt>
              {lastApproval && lastApproval.minutes === Math.round(lastWeekMinutes) ? <Badge tone="success" label={tr("Approved by {name}", { name: lastApproval.approvedBy.split(" ")[0] })} /> : <Badge tone="pending" label={tr("Waiting for approval")} />}
            </View>
          )}
        </Section>
      )}

      {entries.length > 0 && !office && (
        <Section title={tr("Timesheet")}>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface }}>
            {entries.map((e, i) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
                <Txt v="bodySm" style={{ width: 92 }}>{localDay(e.start) === today() ? tr("Today") : `${weekday(new Date(e.start).getDay())} ${fmtShort(localDay(e.start))}`}</Txt>
                <Txt v="bodySm" num color={t.text2} style={{ flex: 1 }}>{fmtTime(e.start)} – {e.end ? fmtTime(e.end) : "now"}</Txt>
                <Txt v="bodySm" num weight="medium">{fmtDuration(((e.end ? Date.parse(e.end) : now) - Date.parse(e.start)) / 60_000)}</Txt>
              </View>
            ))}
          </View>
        </Section>
      )}

      {me && !office && (
        <Section title={tr("Time off and swaps")} action={<Button size="sm" icon={Plus} label={tr("Request")} onPress={() => setSheet("request")} />}>
          {mine.length === 0 && askedToCover.length === 0 && <Txt v="bodySm" color={t.text3}>{tr("Ask for time off or swap a shift with a colleague. Your manager approves it.")}</Txt>}
          {askedToCover.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, backgroundColor: t.accentSoft }}>
              <Txt v="bodySm" weight="semibold">{tr("Covering for {name}", { name: ix.staffMember(r.staffId)?.name })}</Txt>
              <Txt v="bodySm" color={t.text2}>{fmtShort(r.start)} · {tr(ix.staffMember(r.staffId)?.shift)} {tr("shift ·")} {r.status === "approved" ? tr("confirmed") : tr("waiting for your manager")}</Txt>
            </View>
          ))}
          {mine.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, backgroundColor: t.surface, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Txt v="bodySm" weight="semibold" style={{ flex: 1 }}>
                  {r.kind === "leave" ? tr("Time off {dates}", { dates: r.end !== r.start ? `${fmtShort(r.start)} – ${fmtShort(r.end)}` : fmtShort(r.start) }) : tr("Swap {date} with {name}", { date: fmtShort(r.start), name: ix.staffMember(r.swapWithId)?.name })}
                </Txt>
                <RequestBadge r={r} />
              </View>
              <Txt v="caption" color={t.text3}>{r.reason}{r.decidedBy ? tr(" · {status} by {decidedBy}", { status: tr(r.status), decidedBy: r.decidedBy }) : ""}</Txt>
              {r.status === "pending" && (
                <Pressable accessibilityRole="button" onPress={() => withdraw(r)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
                  <Txt v="caption" weight="semibold" color={t.error.fg}>{tr("Withdraw")}</Txt>
                </Pressable>
              )}
            </View>
          ))}
        </Section>
      )}

      <Section title={isAdmin ? tr("Marinas") : tr("My marinas")} count={scope.length}>
        <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface }}>
          {(isAdmin ? [] : scope).map((id, i) => (
            <View key={id} style={{ padding: 16, borderTopWidth: i ? 1 : 0, borderColor: t.border }}>
              <Txt>{ix.marina(id)?.name}</Txt>
              <Txt v="bodySm" color={t.text3}>{ix.marina(id)?.address}, {ix.city(ix.marina(id)?.cityId ?? "")?.name}</Txt>
            </View>
          ))}
          {isAdmin && (
            <View style={{ padding: 16 }}>
              <Txt>{tr("All")} {scope.length} {tr("marinas")}</Txt>
              <Txt v="bodySm" color={t.text3}>{tr("{counties} counties · {cities} cities. Each one is on the Overview.", { counties: db.counties.length, cities: db.cities.length })}</Txt>
            </View>
          )}
        </View>
      </Section>

      {me && !office && (
        <Section title={tr("Notifications")}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, backgroundColor: t.surface }}>
            <View style={{ flex: 1 }}>
              <Txt>{tr("Shift reminders")}</Txt>
              <Txt v="caption" color={t.text3}>{remindersSupported ? tr("A notification 30 minutes before each shift.") : tr("Available in the phone app.")}</Txt>
            </View>
            <Switch
              accessibilityLabel={tr("Shift reminders")}
              disabled={!remindersSupported}
              value={reminders && remindersSupported}
              trackColor={{ true: t.tealStrong, false: t.surface3 }}
              onValueChange={async (on) => {
                if (on && !(await allowNotifications())) return toast(tr("Turn on notifications for Marina in your phone's Settings."), undefined, "warning");
                setReminders(on);
                toast(on ? tr("Reminders on for your next 2 weeks of shifts") : tr("Shift reminders off"));
              }}
            />
          </View>
        </Section>
      )}

      <Section title={tr("Appearance")}>
        <View style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: 9999, padding: 4, gap: 4 }}>
          {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: mode === m }} onPress={() => setMode(m)} style={{ flex: 1, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: mode === m ? t.surface : "transparent" }}>
              <Txt v="bodySm" weight="semibold" color={mode === m ? t.text : t.text3}>{m === "system" ? tr("Automatic") : m === "light" ? tr("Light") : tr("Dark")}</Txt>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={tr("Language")}>
        <View style={{ flexDirection: "row", backgroundColor: t.surface3, borderRadius: 9999, padding: 4, gap: 4 }}>
          {LANGS.map(({ code, name }) => (
            <Pressable key={code} accessibilityRole="radio" accessibilityState={{ checked: lang === code }} onPress={() => setLang(code)} style={{ flex: 1, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: lang === code ? t.surface : "transparent" }}>
              <Txt v="bodySm" weight="semibold" color={lang === code ? t.text : t.text3}>{name}</Txt>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={tr("Security")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, backgroundColor: t.surface }}>
          <View style={{ flex: 1 }}>
            <Txt>{tr("Unlock with {label}", { label: tr(bio.label) })}</Txt>
            <Txt v="caption" color={t.text3}>{bio.available ? tr("Asked when you open the app or come back after a minute.") : tr("Set up Face ID or a fingerprint on this phone first. Not available in the web preview.")}</Txt>
          </View>
          <Switch
            accessibilityLabel={tr("Unlock with {label}", { label: bio.label })}
            disabled={!bio.available}
            value={biometric && bio.available}
            trackColor={{ true: t.tealStrong, false: t.surface3 }}
            onValueChange={async (on) => {
              if (on && !(await biometricUnlock(`Turn on ${bio.label} for Marina`))) return;
              setBiometric(on);
              toast(on ? tr("{label} unlock is on", { label: bio.label }) : tr("{label} unlock is off", { label: bio.label }));
            }}
          />
        </View>
      </Section>

      <Section title={tr("Account")}>
        <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 16, backgroundColor: t.surface, overflow: "hidden" }}>
          {me && !office && <ListRow icon={UserRoundPen} label={tr("Edit profile")} onPress={() => setSheet("profile")} />}
          {me && !office && <View style={{ height: 1, backgroundColor: t.border }} />}
          <ListRow icon={KeyRound} label={tr("Change password")} onPress={() => setSheet("password")} />
          {office && (
            <>
              <View style={{ height: 1, backgroundColor: t.border }} />
              <ListRow icon={ExternalLink} label={tr("Open the web app")} onPress={() => Linking.openURL("https://marina-patform.vercel.app")} />
            </>
          )}
        </View>
        {outbox.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CloudOff size={16} color={t.text3} />
            <Txt v="caption" color={t.text3}>{tn(outbox.length, "{n} change made offline, saved on this phone", "{n} changes made offline, saved on this phone")}</Txt>
          </View>
        )}
      </Section>

      <Button size="lg" icon={LogOut} label={tr("Sign out")} onPress={() => { signOut(); router.replace("/login"); }} />

      {sheet === "request" && <RequestSheet onClose={() => setSheet(undefined)} />}
      {sheet === "profile" && <ProfileSheet onClose={() => setSheet(undefined)} />}
      {sheet === "password" && <PasswordSheet onClose={() => setSheet(undefined)} />}
    </Screen>
  );
}
