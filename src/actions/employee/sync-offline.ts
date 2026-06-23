"use server";

import { checkIn, checkOut } from "@/actions/check-ins/actions";
import { toggleChecklistItem } from "@/actions/checklist/actions";
import { uploadTaskPhoto } from "@/actions/photos/actions";
import { signServiceReportAction } from "@/actions/field-execution/actions";
import { requireEmployeeMobileAccess } from "@/lib/auth/guards";
import type {
  CheckInPayload,
  CheckOutPayload,
  ChecklistTogglePayload,
  MessageReplyPayload,
  MessageComposePayload,
  PhotoUploadPayload,
  SignReportPayload,
  SyncQueueItem,
} from "@/lib/pwa/offline-queue";
import { replyEmployeeMessageAction, composeEmployeeMessageAction } from "@/actions/employee/messages";
import type { ActionResult } from "@/actions/auth/actions";

export interface SyncOfflineResult {
  id: string;
  success: boolean;
  error?: string;
  checkInId?: string;
  localSessionKey?: string;
}

function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const binary = Buffer.from(base64, "base64");
  return new File([binary], fileName, { type: mimeType });
}

export async function syncOfflineQueueAction(
  slug: string,
  items: SyncQueueItem[],
): Promise<ActionResult<{ results: SyncOfflineResult[] }>> {
  await requireEmployeeMobileAccess(slug);

  const results: SyncOfflineResult[] = [];
  const sessionCheckInIds = new Map<string, string>();

  for (const item of items) {
    const sessionKey =
      item.sessionKey ??
      (item.type === "check_in"
        ? (item.payload as CheckInPayload).localSessionKey
        : (item.payload as CheckOutPayload | PhotoUploadPayload | SignReportPayload)
            .localSessionKey);

    try {
      switch (item.type) {
        case "check_in": {
          const payload = item.payload as CheckInPayload;
          const { localSessionKey, ...checkInOpts } = payload;
          const result = await checkIn(slug, item.taskId, checkInOpts);
          if (result.success && result.data?.checkInId) {
            sessionCheckInIds.set(localSessionKey, result.data.checkInId);
          }
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
            checkInId: result.success ? result.data?.checkInId : undefined,
            localSessionKey,
          });
          break;
        }

        case "check_out": {
          const payload = item.payload as CheckOutPayload;
          const checkInId =
            payload.checkInId ??
            (payload.localSessionKey
              ? sessionCheckInIds.get(payload.localSessionKey)
              : undefined);

          if (!checkInId) {
            results.push({
              id: item.id,
              success: false,
              error: "Check-in pendente — aguarde sincronização",
            });
            break;
          }

          const { checkInId: _c, localSessionKey: _l, ...opts } = payload;
          const result = await checkOut(slug, checkInId, opts);
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        case "checklist_toggle": {
          const payload = item.payload as ChecklistTogglePayload;
          const result = await toggleChecklistItem(
            slug,
            payload.itemId,
            item.taskId,
            payload.checked,
          );
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        case "photo_upload": {
          const payload = item.payload as PhotoUploadPayload;
          if (!item.mediaBase64) {
            results.push({ id: item.id, success: false, error: "Media em falta" });
            break;
          }

          const checkInId =
            payload.checkInId ??
            (payload.localSessionKey
              ? sessionCheckInIds.get(payload.localSessionKey)
              : undefined);

          const file = base64ToFile(
            item.mediaBase64,
            item.mediaFileName ?? payload.fileName,
            item.mediaMimeType ?? payload.mimeType,
          );
          const fd = new FormData();
          fd.set("file", file);
          fd.set("photoType", payload.photoType);
          if (checkInId) fd.set("checkInId", checkInId);

          const result = await uploadTaskPhoto(slug, item.taskId, fd);
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        case "sign_report": {
          const payload = item.payload as SignReportPayload;
          if (!item.mediaBase64) {
            results.push({ id: item.id, success: false, error: "Assinatura em falta" });
            break;
          }

          const checkInId =
            payload.checkInId ??
            (payload.localSessionKey
              ? sessionCheckInIds.get(payload.localSessionKey)
              : undefined);

          if (!checkInId) {
            results.push({
              id: item.id,
              success: false,
              error: "Check-in pendente — aguarde sincronização",
            });
            break;
          }

          const file = base64ToFile(
            item.mediaBase64,
            item.mediaFileName ?? "signature.png",
            item.mediaMimeType ?? "image/png",
          );
          const fd = new FormData();
          fd.set("clientName", payload.clientName);
          fd.set("checkInId", checkInId);
          fd.set("signature", file);

          const result = await signServiceReportAction(slug, item.taskId, fd);
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        case "message_reply": {
          const payload = item.payload as MessageReplyPayload;
          const result = await replyEmployeeMessageAction(slug, {
            threadId: payload.threadId,
            body: payload.body,
          });
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        case "message_compose": {
          const payload = item.payload as MessageComposePayload;
          const result = await composeEmployeeMessageAction(slug, {
            body: payload.body,
            subject: payload.subject,
            threadId: payload.localThreadId,
          });
          results.push({
            id: item.id,
            success: result.success,
            error: result.success ? undefined : result.error,
          });
          break;
        }

        default:
          results.push({ id: item.id, success: false, error: "Ação não suportada" });
      }
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : "Erro de sincronização",
      });
    }
  }

  return { success: true, data: { results } };
}
