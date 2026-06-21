"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ActionResult } from "@/actions/auth/actions";
import { revalidateEmployeeMobilePaths } from "@/lib/employee/revalidate-mobile";

function fieldPaths(slug: string, taskId?: string) {
  const paths = [
    `/${slug}/field`,
    `/${slug}/field/schedule`,
    `/${slug}/mobile`,
    `/${slug}/tasks`,
  ];
  if (taskId) paths.push(`/${slug}/field/tasks/${taskId}`, `/${slug}/tasks/${taskId}`);
  return paths;
}

function revalidateField(slug: string, taskId?: string) {
  for (const path of fieldPaths(slug, taskId)) {
    revalidatePath(path);
  }
  revalidateEmployeeMobilePaths(slug, taskId);
}

export async function signServiceReportAction(
  slug: string,
  taskId: string,
  formData: FormData,
): Promise<ActionResult<{ reportId: string }>> {
  const ctx = await requireCompanyContext({ slug });
  if (!ctx.employee) return { success: false, error: "Perfil de colaborador não encontrado" };

  const clientName = (formData.get("clientName") as string | null)?.trim();
  const checkInId = formData.get("checkInId") as string | null;
  const file = formData.get("signature") as File | null;

  if (!clientName || !checkInId || !file) {
    return { success: false, error: "Nome do cliente e assinatura são obrigatórios" };
  }

  const ext = "png";
  const storagePath = `${ctx.company.id}/${taskId}/signatures/${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.taskPhotos)
    .upload(storagePath, file, { contentType: "image/png", upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: existing } = await supabase
    .from("service_reports")
    .select("id")
    .eq("check_in_id", checkInId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  const payload = {
    company_id: ctx.company.id,
    task_id: taskId,
    check_in_id: checkInId,
    employee_id: ctx.employee.id,
    status: "signed" as const,
    client_name: clientName,
    client_signature_path: storagePath,
    signed_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("service_reports")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
    revalidateField(slug, taskId);
    return { success: true, data: { reportId: existing.id as string } };
  }

  const { data, error } = await supabase
    .from("service_reports")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateField(slug, taskId);
  return { success: true, data: { reportId: data.id as string } };
}

export async function openServiceReportAction(
  slug: string,
  reportId: string,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("service_reports")
    .select("storage_path")
    .eq("id", reportId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!report?.storage_path) {
    return { success: false, error: "Relatório ainda não gerado" };
  }

  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.reports)
    .createSignedUrl(report.storage_path, 60 * 60);

  if (!data?.signedUrl) return { success: false, error: "Não foi possível abrir o relatório" };
  return { success: true, data: { url: data.signedUrl } };
}
