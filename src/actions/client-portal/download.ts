"use server";

import { z } from "zod";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ActionResult } from "@/actions/auth/actions";

const reportSchema = z.object({
  storagePath: z.string().min(1),
  source: z.enum(["report", "service_report"]),
});

export async function getPortalDocumentDownloadUrl(
  slug: string,
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  await requireClientPortalContext(slug);

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.clientDocuments)
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message ?? "Download failed" };
  }

  return { success: true, data: { url: data.signedUrl } };
}

export async function getPortalReportDownloadUrl(
  slug: string,
  raw: unknown,
): Promise<ActionResult<{ url: string }>> {
  await requireClientPortalContext(slug);
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const supabase = await createClient();
  const bucket =
    parsed.data.source === "service_report"
      ? STORAGE_BUCKETS.reports
      : STORAGE_BUCKETS.reports;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(parsed.data.storagePath, 3600);

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message ?? "Download failed" };
  }

  return { success: true, data: { url: data.signedUrl } };
}
