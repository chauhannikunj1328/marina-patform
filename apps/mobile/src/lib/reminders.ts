// Shift reminders: a local notification 30 minutes before each shift in the next two weeks.
// Scheduled on the phone itself, so it works without a server (not available in the web preview).
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { addDays, t, SHIFT_HOURS, SHIFT_START_HOUR, shiftOn, today, fromISO, type Db, type Staff } from "@marina/shared";

export const remindersSupported = Platform.OS !== "web";
const LEAD_MINUTES = 30;
const TAG = "shift-reminder";

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Ask for permission. Returns false when the person says no. */
export async function allowNotifications(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replace the scheduled reminders with ones matching the current schedule. Returns how many were set. */
export async function syncShiftReminders(me: Staff | undefined, db: Db, marinaName: string, enabled: boolean): Promise<number> {
  if (!remindersSupported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.content.data?.tag === TAG).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!enabled || !me) return 0;
  let count = 0;
  for (let i = 0; i < 14; i++) {
    const day = addDays(today(), i);
    const shift = shiftOn(me, day, db.requests, db.staff);
    if (!shift) continue;
    const at = fromISO(day);
    at.setHours(SHIFT_START_HOUR[shift], -LEAD_MINUTES, 0, 0);
    if (at.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: t("Your {shift} shift starts in {n} minutes", { shift: t(shift), n: LEAD_MINUTES }), body: t("{hours} at {marina}. Clock in from the Today tab.", { hours: t(SHIFT_HOURS[shift]), marina: marinaName }), data: { tag: TAG } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    count++;
  }
  return count;
}
