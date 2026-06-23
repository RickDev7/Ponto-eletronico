"use client";

import { useEffect, useState } from "react";
import { loadOfflineCache } from "@/lib/pwa/offline-cache";

function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Uses live server props when online; falls back to IndexedDB cache when offline.
 * Compares server payloads by serialized snapshot to avoid reference churn loops.
 */
export function useOfflineCacheFallback<T>(cacheKey: string, serverData: T): T {
  const [offlineOverride, setOfflineOverride] = useState<T | null>(null);
  const serverSnapshot = stableSerialize(serverData);

  useEffect(() => {
    setOfflineOverride(null);
  }, [serverSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearOverride = () => setOfflineOverride(null);

    const applyCache = async () => {
      if (navigator.onLine) {
        clearOverride();
        return;
      }
      const cached = await loadOfflineCache<T>(cacheKey);
      if (cached) setOfflineOverride(cached);
    };

    void applyCache();
    window.addEventListener("offline", applyCache);
    window.addEventListener("online", clearOverride);
    return () => {
      window.removeEventListener("offline", applyCache);
      window.removeEventListener("online", clearOverride);
    };
  }, [cacheKey]);

  return offlineOverride ?? serverData;
}
