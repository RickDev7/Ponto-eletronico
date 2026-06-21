"use server";

import { checkIn } from "@/actions/check-ins/actions";
import { requireEmployeeMobileAccess } from "@/lib/auth/guards";
import type { OfflineQueueItem } from "@/lib/pwa/offline-queue";
import type { ActionResult } from "@/actions/auth/actions";

export interface SyncOfflineResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function syncOfflineQueueAction(
  slug: string,
  items: Pick<OfflineQueueItem, "id" | "type" | "taskId" | "payload">[],
): Promise<ActionResult<{ results: SyncOfflineResult[] }>> {
  await requireEmployeeMobileAccess(slug);

  const results: SyncOfflineResult[] = [];

  for (const item of items) {
    if (item.type !== "check_in") {
      results.push({ id: item.id, success: false, error: "Unsupported action" });
      continue;
    }

    const result = await checkIn(slug, item.taskId, item.payload);
    results.push({
      id: item.id,
      success: result.success,
      error: result.success ? undefined : result.error,
    });
  }

  return { success: true, data: { results } };
}
