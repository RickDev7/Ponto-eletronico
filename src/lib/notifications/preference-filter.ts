import type { NotificationPreferenceKey } from "@/hooks/use-notification-preferences";

/** Maps notification types to settings preference keys. */
export const NOTIFICATION_TYPE_PREFERENCE: Record<
  string,
  NotificationPreferenceKey
> = {
  check_in: "checkInWarnings",
  check_out: "checkInWarnings",
  comment: "activityFeed",
  task_assigned: "taskAssignments",
};

export function isNotificationTypeEnabled(
  type: string,
  getPreference: (key: NotificationPreferenceKey, fallback: boolean) => boolean,
): boolean {
  const key = NOTIFICATION_TYPE_PREFERENCE[type];
  if (!key) return true;
  return getPreference(key, true);
}
