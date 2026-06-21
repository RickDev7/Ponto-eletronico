export const OFFLINE_DB_NAME = "feldops-employee";
export const OFFLINE_STORE = "offline_queue";
export const OFFLINE_DB_VERSION = 1;
export const SYNC_TAG = "employee-offline-sync";
export const SW_SYNC_MESSAGE = "SYNC_OFFLINE_QUEUE";

export type OfflineActionType = "check_in";

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  slug: string;
  taskId: string;
  payload: {
    latitude?: number;
    longitude?: number;
    notes?: string;
  };
  createdAt: string;
  retries: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const store = tx.objectStore(OFFLINE_STORE);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const items = (request.result as OfflineQueueItem[]).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt),
      );
      resolve(items);
    };
  });
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  }
}

export async function enqueueOfflineAction(
  item: Omit<OfflineQueueItem, "id" | "createdAt" | "retries">,
): Promise<OfflineQueueItem> {
  const record: OfflineQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_STORE).add(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  notifyQueueChanged();
  return record;
}

export async function removeOfflineAction(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_STORE).delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  notifyQueueChanged();
}

export async function incrementOfflineRetries(id: string): Promise<void> {
  const db = await openDb();
  const items = await listOfflineQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.retries += 1;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_STORE).put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // Background Sync — Chromium; safe no-op elsewhere
    const syncManager = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
    if (syncManager) {
      await syncManager.register(SYNC_TAG);
    }
  } catch {
    /* optional */
  }
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  return false;
}
