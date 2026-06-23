"use client";

import { useEffect } from "react";
import { saveOfflineCache } from "@/lib/pwa/offline-cache";

function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function usePersistOfflineCache<T>(
  cacheKey: string,
  data: T,
  enabled = true,
) {
  const dataSnapshot = stableSerialize(data);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!navigator.onLine) return;
    void saveOfflineCache(cacheKey, data);
  }, [cacheKey, dataSnapshot, enabled]);
}
