import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function logTaskEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    companyId: string;
    taskId: string;
    eventType: string;
    createdBy?: string | null;
    message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("task_events").insert({
    company_id: params.companyId,
    task_id: params.taskId,
    event_type: params.eventType,
    message: params.message ?? null,
    metadata: params.metadata ?? {},
    created_by: params.createdBy ?? null,
  });
}
