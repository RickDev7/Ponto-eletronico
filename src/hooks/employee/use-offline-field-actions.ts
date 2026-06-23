"use client";

import { useCallback } from "react";
import {
  enqueueOfflineAction,
  isLikelyNetworkError,
  registerBackgroundSync,
  saveOfflineMedia,
  type CheckOutPayload,
  type ChecklistTogglePayload,
  type PhotoUploadPayload,
  type SignReportPayload,
} from "@/lib/pwa/offline-queue";
import { compressImageFile } from "@/lib/pwa/compress-image";

interface OfflineFieldContext {
  slug: string;
  taskId: string;
  checkInId?: string;
  localSessionKey?: string;
}

async function enqueueWithSync(
  item: Parameters<typeof enqueueOfflineAction>[0],
): Promise<void> {
  await enqueueOfflineAction(item);
  await registerBackgroundSync();
}

export function useOfflineFieldActions(ctx: OfflineFieldContext) {
  const sessionKey = ctx.localSessionKey;

  const resolveRefs = useCallback(
    () => ({
      checkInId: ctx.checkInId,
      localSessionKey: sessionKey,
      sessionKey,
    }),
    [ctx.checkInId, sessionKey],
  );

  const enqueueChecklistToggle = useCallback(
    async (itemId: string, checked: boolean) => {
      const payload: ChecklistTogglePayload = { itemId, checked };
      await enqueueWithSync({
        type: "checklist_toggle",
        slug: ctx.slug,
        taskId: ctx.taskId,
        payload,
        sessionKey,
      });
    },
    [ctx.slug, ctx.taskId, sessionKey],
  );

  const enqueuePhoto = useCallback(
    async (file: File, photoType: PhotoUploadPayload["photoType"]) => {
      const compressed = await compressImageFile(file);
      const ext = compressed.type === "image/png" ? "png" : "jpg";
      const fileName = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
      const mediaId = await saveOfflineMedia(compressed, fileName, compressed.type);
      const refs = resolveRefs();
      const payload: PhotoUploadPayload = {
        photoType,
        mediaId,
        fileName,
        mimeType: compressed.type,
        ...refs,
      };
      await enqueueWithSync({
        type: "photo_upload",
        slug: ctx.slug,
        taskId: ctx.taskId,
        payload,
        sessionKey,
      });
    },
    [ctx.slug, ctx.taskId, resolveRefs, sessionKey],
  );

  const enqueueSign = useCallback(
    async (clientName: string, signatureBlob: Blob) => {
      const mediaId = await saveOfflineMedia(signatureBlob, "signature.png", "image/png");
      const refs = resolveRefs();
      const payload: SignReportPayload = {
        clientName,
        mediaId,
        ...refs,
      };
      await enqueueWithSync({
        type: "sign_report",
        slug: ctx.slug,
        taskId: ctx.taskId,
        payload,
        sessionKey,
      });
    },
    [ctx.slug, ctx.taskId, resolveRefs, sessionKey],
  );

  const enqueueCheckOut = useCallback(
    async (opts: { latitude?: number; longitude?: number; notes?: string }) => {
      const refs = resolveRefs();
      const payload: CheckOutPayload = { ...opts, ...refs };
      await enqueueWithSync({
        type: "check_out",
        slug: ctx.slug,
        taskId: ctx.taskId,
        payload,
        sessionKey,
      });
    },
    [ctx.slug, ctx.taskId, resolveRefs, sessionKey],
  );

  const tryOnlineOrEnqueue = useCallback(
    async <T>(
      onlineFn: () => Promise<{ success: boolean; error?: string }>,
      enqueueFn: () => Promise<void>,
    ): Promise<"online" | "queued" | "failed"> => {
      if (!navigator.onLine) {
        await enqueueFn();
        return "queued";
      }
      try {
        const result = await onlineFn();
        if (result.success) return "online";
        if (result.error) return "failed";
        return "failed";
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          await enqueueFn();
          return "queued";
        }
        throw error;
      }
    },
    [],
  );

  return {
    enqueueChecklistToggle,
    enqueuePhoto,
    enqueueSign,
    enqueueCheckOut,
    tryOnlineOrEnqueue,
  };
}
