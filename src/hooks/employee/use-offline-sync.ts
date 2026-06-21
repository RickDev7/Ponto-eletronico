"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncOfflineQueueAction } from "@/actions/employee/sync-offline";
import {
  SW_SYNC_MESSAGE,
  incrementOfflineRetries,
  listOfflineQueue,
  removeOfflineAction,
  type OfflineQueueItem,
} from "@/lib/pwa/offline-queue";

const MAX_RETRIES = 5;

export function useOfflineSync(slug: string) {
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

      const result = await syncOfflineQueueAction(
        slug,
        slugItems.map((i) => ({
          id: i.id,
          type: i.type,
          taskId: i.taskId,
          payload: i.payload,
        })),
      );

      if (!result.success) return;

      for (const row of result.data.results) {
        if (row.success) {
          await removeOfflineAction(row.id);
        } else if (row.error) {
          await incrementOfflineRetries(row.id);
          const updated = await listOfflineQueue();
          const after = updated.find((i) => i.id === row.id);
          if (after && after.retries >= MAX_RETRIES) {
            await removeOfflineAction(row.id);
          }
        }
      }

      await refreshCount();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [slug, refreshCount]);

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
