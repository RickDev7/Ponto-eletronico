"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "feldops-notification-prefs";

export type NotificationPreferenceKey =
  | "overdueTasks"
  | "checkInWarnings"
  | "newInvites"
  | "weeklyReport"
  | "activityFeed"
  | "taskAssignments";

export type NotificationPreferences = Partial<
  Record<NotificationPreferenceKey, boolean>
>;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readPrefs(userId: string): NotificationPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as NotificationPreferences;
  } catch {
    return {};
  }
}

function writePrefs(userId: string, prefs: NotificationPreferences) {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export function useNotificationPreferences(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});

  useEffect(() => {
    if (!userId) return;
    setPrefs(readPrefs(userId));
  }, [userId]);

  const getPreference = useCallback(
    (key: NotificationPreferenceKey, fallback: boolean) => {
      if (!userId) return fallback;
      return prefs[key] ?? fallback;
    },
    [prefs, userId],
  );

  const setPreference = useCallback(
    (key: NotificationPreferenceKey, value: boolean) => {
      if (!userId) return;
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        writePrefs(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { getPreference, setPreference, prefs };
}
