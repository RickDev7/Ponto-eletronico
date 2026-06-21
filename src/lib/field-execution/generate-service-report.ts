import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import { buildServiceReportHtml } from "@/lib/field-execution/service-report-html";

export async function generateServiceReport(
  companyId: string,
  taskId: string,
  checkInId: string,
  supabaseClient?: SupabaseClient,
): Promise<{ reportId: string; storagePath: string } | null> {
  const supabase = supabaseClient ?? (await createClient());

  const { data: checkIn } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, check_in_notes, check_out_notes, employee_id,
      employee:employees(full_name)
    `)
    .eq("id", checkInId)
    .eq("company_id", companyId)
    .single();

  if (!checkIn?.check_out_at) return null;

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      id, title, service_type, scheduled_date,
      address:addresses(street, house_number, city, postal_code, client:clients(name))
    `)
    .eq("id", taskId)
    .eq("company_id", companyId)
    .single();

  if (!task) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  const [{ data: checklist }, { data: photos }, { data: existingReport }] = await Promise.all([
    supabase
      .from("task_checklist_items")
      .select("text, is_checked")
      .eq("task_id", taskId)
      .eq("company_id", companyId)
      .order("sort_order"),
    supabase
      .from("task_photos")
      .select("photo_type, storage_path")
      .eq("task_id", taskId)
      .eq("company_id", companyId),
    supabase
      .from("service_reports")
      .select("id, client_name, client_signature_path, status")
      .eq("check_in_id", checkInId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const address = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = address?.client
    ? Array.isArray(address.client)
      ? address.client[0]
      : address.client
    : null;
  const employee = Array.isArray(checkIn.employee) ? checkIn.employee[0] : checkIn.employee;

  const photoUrls: Array<{ type: string; url: string }> = [];
  for (const photo of photos ?? []) {
    if (photo.photo_type === "signature") continue;
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.taskPhotos)
      .createSignedUrl(photo.storage_path, 60 * 60 * 24);
    if (data?.signedUrl) {
      photoUrls.push({ type: photo.photo_type, url: data.signedUrl });
    }
  }

  let signatureUrl: string | null = null;
  if (existingReport?.client_signature_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.taskPhotos)
      .createSignedUrl(existingReport.client_signature_path, 60 * 60 * 24);
    signatureUrl = data?.signedUrl ?? null;
  }

  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(checkIn.check_out_at).getTime() - new Date(checkIn.check_in_at).getTime()) / 60_000,
    ),
  );

  const addressLine = address
    ? `${address.street ?? ""} ${address.house_number ?? ""}, ${address.postal_code ?? ""} ${address.city ?? ""}`.trim()
    : "—";

  const html = buildServiceReportHtml({
    taskTitle: task.title,
    serviceType: task.service_type,
    scheduledDate: task.scheduled_date,
    clientName: existingReport?.client_name ?? client?.name ?? "—",
    addressLine,
    employeeName: employee?.full_name ?? "—",
    companyName: company?.name ?? "",
    checkInAt: checkIn.check_in_at,
    checkOutAt: checkIn.check_out_at,
    durationMinutes,
    checklist: (checklist ?? []).map((c) => ({ text: c.text, checked: c.is_checked })),
    photos: photoUrls,
    clientSignatureUrl: signatureUrl,
    signedClientName: existingReport?.client_name ?? null,
    notes: checkIn.check_out_notes ?? checkIn.check_in_notes ?? null,
  });

  const storagePath = `${companyId}/service-reports/${taskId}/${checkInId}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.reports)
    .upload(storagePath, blob, { contentType: "text/html", upsert: true });

  if (uploadError) {
    console.error("service report upload failed", uploadError.message);
    return null;
  }

  const metadata = {
    durationMinutes,
    checklistCount: checklist?.length ?? 0,
    photoCount: photos?.length ?? 0,
    signed: Boolean(existingReport?.client_signature_path),
  };

  const reportPayload = {
    company_id: companyId,
    task_id: taskId,
    check_in_id: checkInId,
    employee_id: checkIn.employee_id,
    status: existingReport?.client_signature_path ? "generated" : "generated",
    storage_path: storagePath,
    metadata,
    generated_at: new Date().toISOString(),
  };

  if (existingReport?.id) {
    await supabase
      .from("service_reports")
      .update(reportPayload)
      .eq("id", existingReport.id);
    return { reportId: existingReport.id, storagePath };
  }

  const { data: inserted } = await supabase
    .from("service_reports")
    .insert(reportPayload)
    .select("id")
    .single();

  return inserted ? { reportId: inserted.id as string, storagePath } : null;
}
