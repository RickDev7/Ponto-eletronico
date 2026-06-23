import {
  OFFLINE_CACHE_STORE,
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  openOfflineDb,
} from "@/lib/pwa/offline-queue";

export interface OfflineCacheEntry<T = unknown> {
  key: string;
  data: T;
  updatedAt: string;
}

export function offlineCacheKey(
  kind: "home" | "jobs" | "schedule" | "execution" | "messages",
  slug: string,
  id?: string,
) {
  if (kind === "execution" && id) return `execution:${slug}:${id}`;
  if (id) return `${kind}:${slug}:${id}`;
  return `${kind}:${slug}`;
}

export async function saveOfflineCache<T>(key: string, data: T): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openOfflineDb();
  const entry: OfflineCacheEntry<T> = {
    key,
    data,
    updatedAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_CACHE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_CACHE_STORE).put(entry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadOfflineCache<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_CACHE_STORE, "readonly");
    const request = tx.objectStore(OFFLINE_CACHE_STORE).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const row = request.result as OfflineCacheEntry<T> | undefined;
      resolve(row?.data ?? null);
    };
  });
}

export async function removeOfflineCache(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_CACHE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_CACHE_STORE).delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
