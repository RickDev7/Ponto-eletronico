export const OFFLINE_DB_NAME = "feldops-employee";
export const OFFLINE_STORE = "offline_queue";
export const OFFLINE_MEDIA_STORE = "offline_media";
export const OFFLINE_CACHE_STORE = "offline_cache";
export const DEVICE_LOCK_STORE = "device_lock";
export const OFFLINE_DB_VERSION = 3;
export const SYNC_TAG = "employee-offline-sync";
export const SW_SYNC_MESSAGE = "SYNC_OFFLINE_QUEUE";

export type OfflineActionType =
  | "check_in"
  | "check_out"
  | "checklist_toggle"
  | "photo_upload"
  | "sign_report"
  | "message_reply"
  | "message_compose";

export type PhotoTypeOffline = "before" | "after" | "evidence";

export interface CheckInPayload {
  latitude?: number;
  longitude?: number;
  notes?: string;
  localSessionKey: string;
}

export interface CheckOutPayload {
  checkInId?: string;
  localSessionKey?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ChecklistTogglePayload {
  itemId: string;
  checked: boolean;
}

export interface PhotoUploadPayload {
  photoType: PhotoTypeOffline;
  mediaId: string;
  fileName: string;
  mimeType: string;
  checkInId?: string;
  localSessionKey?: string;
}

export interface SignReportPayload {
  clientName: string;
  mediaId: string;
  checkInId?: string;
  localSessionKey?: string;
}

export interface MessageReplyPayload {
  threadId: string;
  body: string;
}

export interface MessageComposePayload {
  body: string;
  subject?: string;
  localThreadId: string;
}

export type OfflineActionPayload =
  | CheckInPayload
  | CheckOutPayload
  | ChecklistTogglePayload
  | PhotoUploadPayload
  | SignReportPayload
  | MessageReplyPayload
  | MessageComposePayload;

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  slug: string;
  taskId: string;
  payload: OfflineActionPayload;
  createdAt: string;
  retries: number;
  sessionKey?: string;
}

export interface OfflineMediaRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  type: OfflineActionType;
  taskId: string;
  payload: OfflineActionPayload;
  sessionKey?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
}

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_MEDIA_STORE)) {
        db.createObjectStore(OFFLINE_MEDIA_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_CACHE_STORE)) {
        db.createObjectStore(OFFLINE_CACHE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(DEVICE_LOCK_STORE)) {
        db.createObjectStore(DEVICE_LOCK_STORE, { keyPath: "key" });
      }

      if (oldVersion > 0 && oldVersion < 3) {
        /* schema extensions are additive */
      }
    };
  });
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const store = tx.objectStore(OFFLINE_STORE);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const items = (request.result as OfflineQueueItem[]).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
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
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_STORE).add(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  notifyQueueChanged();
  return record;
}

export async function saveOfflineMedia(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const record: OfflineMediaRecord = {
    id,
    blob,
    mimeType,
    fileName,
    createdAt: new Date().toISOString(),
  };
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_MEDIA_STORE).add(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  return id;
}

export async function getOfflineMedia(id: string): Promise<OfflineMediaRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, "readonly");
    const request = tx.objectStore(OFFLINE_MEDIA_STORE).get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as OfflineMediaRecord) ?? null);
  });
}

export async function removeOfflineMedia(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_MEDIA_STORE).delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function removeOfflineAction(id: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const request = tx.objectStore(OFFLINE_STORE).delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  notifyQueueChanged();
}

export async function incrementOfflineRetries(id: string): Promise<void> {
  const db = await openOfflineDb();
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

export async function listPendingChecklistToggles(
  slug: string,
  taskId: string,
): Promise<Map<string, boolean>> {
  const items = await listOfflineQueue();
  const map = new Map<string, boolean>();
  for (const item of items) {
    if (
      item.slug === slug &&
      item.taskId === taskId &&
      item.type === "checklist_toggle"
    ) {
      const payload = item.payload as ChecklistTogglePayload;
      map.set(payload.itemId, payload.checked);
    }
  }
  return map;
}

export async function removeChecklistTogglesForItem(
  slug: string,
  taskId: string,
  itemId: string,
): Promise<void> {
  const items = await listOfflineQueue();
  const matches = items.filter(
    (i) =>
      i.slug === slug &&
      i.taskId === taskId &&
      i.type === "checklist_toggle" &&
      (i.payload as ChecklistTogglePayload).itemId === itemId,
  );
  for (const item of matches) {
    await removeOfflineAction(item.id);
  }
}

export interface ChecklistConflict {
  itemId: string;
  text: string;
  serverChecked: boolean;
  localChecked: boolean;
  queueItemId: string;
}

export async function listChecklistConflicts(
  slug: string,
  taskId: string,
  serverItems: Array<{ id: string; text: string; is_checked: boolean }>,
): Promise<ChecklistConflict[]> {
  const items = await listOfflineQueue();
  const toggles = items.filter(
    (i) => i.slug === slug && i.taskId === taskId && i.type === "checklist_toggle",
  );

  const conflicts: ChecklistConflict[] = [];
  for (const item of toggles) {
    const payload = item.payload as ChecklistTogglePayload;
    const server = serverItems.find((s) => s.id === payload.itemId);
    if (server && server.is_checked !== payload.checked) {
      conflicts.push({
        itemId: payload.itemId,
        text: server.text,
        serverChecked: server.is_checked,
        localChecked: payload.checked,
        queueItemId: item.id,
      });
    }
  }
  return conflicts;
}

export async function listPendingMessageReplies(
  slug: string,
): Promise<Array<{ id: string; threadId: string; body: string; createdAt: string }>> {
  const items = await listOfflineQueue();
  return items
    .filter((i) => i.slug === slug && i.type === "message_reply")
    .map((i) => {
      const payload = i.payload as MessageReplyPayload;
      return {
        id: i.id,
        threadId: payload.threadId,
        body: payload.body,
        createdAt: i.createdAt,
      };
    });
}

export async function listPendingMessageComposes(
  slug: string,
): Promise<
  Array<{ id: string; body: string; subject: string | null; localThreadId: string; createdAt: string }>
> {
  const items = await listOfflineQueue();
  return items
    .filter((i) => i.slug === slug && i.type === "message_compose")
    .map((i) => {
      const payload = i.payload as MessageComposePayload;
      return {
        id: i.id,
        body: payload.body,
        subject: payload.subject ?? null,
        localThreadId: payload.localThreadId,
        createdAt: i.createdAt,
      };
    });
}

export async function getPendingOfflineSession(
  slug: string,
  taskId: string,
): Promise<{ localSessionKey: string; checkInAt: string } | null> {
  const items = await listOfflineQueue();
  const checkIn = items.find(
    (i) => i.slug === slug && i.taskId === taskId && i.type === "check_in",
  );
  if (!checkIn) return null;
  const payload = checkIn.payload as CheckInPayload;
  return {
    localSessionKey: payload.localSessionKey,
    checkInAt: checkIn.createdAt,
  };
}

export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const syncManager = (
      reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }
    ).sync;
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export async function prepareSyncItems(items: OfflineQueueItem[]): Promise<SyncQueueItem[]> {
  const prepared: SyncQueueItem[] = [];

  for (const item of items) {
    const syncItem: SyncQueueItem = {
      id: item.id,
      type: item.type,
      taskId: item.taskId,
      payload: item.payload,
      sessionKey: item.sessionKey,
    };

    if (item.type === "photo_upload") {
      const payload = item.payload as PhotoUploadPayload;
      const media = await getOfflineMedia(payload.mediaId);
      if (media) {
        syncItem.mediaBase64 = await blobToBase64(media.blob);
        syncItem.mediaMimeType = media.mimeType;
        syncItem.mediaFileName = media.fileName;
      }
    }

    if (item.type === "sign_report") {
      const payload = item.payload as SignReportPayload;
      const media = await getOfflineMedia(payload.mediaId);
      if (media) {
        syncItem.mediaBase64 = await blobToBase64(media.blob);
        syncItem.mediaMimeType = media.mimeType;
        syncItem.mediaFileName = media.fileName;
      }
    }

    prepared.push(syncItem);
  }

  return prepared;
}

export async function cleanupSyncedMedia(item: OfflineQueueItem): Promise<void> {
  if (item.type === "photo_upload") {
    await removeOfflineMedia((item.payload as PhotoUploadPayload).mediaId);
  }
  if (item.type === "sign_report") {
    await removeOfflineMedia((item.payload as SignReportPayload).mediaId);
  }
}
