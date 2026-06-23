"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { syncOfflineQueueAction } from "@/actions/employee/sync-offline";
import {
  SW_SYNC_MESSAGE,
  cleanupSyncedMedia,
  incrementOfflineRetries,
  listOfflineQueue,
  prepareSyncItems,
  removeOfflineAction,
} from "@/lib/pwa/offline-queue";

const MAX_RETRIES = 5;

export function useOfflineSync(slug: string) {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const items = await listOfflineQueue();
    setPendingCount(items.length);
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const items = await listOfflineQueue();
      if (!items.length) {
        setPendingCount(0);
        return;
      }

      const slugItems = items.filter((i) => i.slug === slug);
      if (!slugItems.length) {
        await refreshCount();
        return;
      }

      const prepared = await prepareSyncItems(slugItems);
      const result = await syncOfflineQueueAction(slug, prepared);

      if (!result.success) return;

      let hadSuccess = false;

      for (const row of result.data.results) {
        const original = slugItems.find((i) => i.id === row.id);
        if (row.success) {
          if (original) await cleanupSyncedMedia(original);
          await removeOfflineAction(row.id);
          hadSuccess = true;
        } else if (row.error) {
          await incrementOfflineRetries(row.id);
          const updated = await listOfflineQueue();
          const after = updated.find((i) => i.id === row.id);
          if (after && after.retries >= MAX_RETRIES) {
            if (original) await cleanupSyncedMedia(original);
            await removeOfflineAction(row.id);
          }
        }
      }

      await refreshCount();
      if (hadSuccess) router.refresh();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [slug, refreshCount, router]);

  useEffect(() => {
    void refreshCount();
    const onQueueChanged = () => void refreshCount();
    window.addEventListener("offline-queue-changed", onQueueChanged);
    return () => window.removeEventListener("offline-queue-changed", onQueueChanged);
  }, [refreshCount]);

  useEffect(() => {
    const onOnline = () => void runSync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runSync]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === SW_SYNC_MESSAGE) {
        void runSync();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [runSync]);

  useEffect(() => {
    if (navigator.onLine) {
      void runSync();
    }
  }, [runSync]);

  return { pendingCount, syncing, refreshCount, runSync };
}
