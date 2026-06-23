import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { FieldJobAiContext, FieldJobMaterialSuggestion } from "@/lib/ai/field-job-types";

export async function loadFieldJobAiContext(
  companyId: string,
  companyName: string,
  employeeId: string,
  taskId: string,
  locale: string,
): Promise<FieldJobAiContext | null> {
  const supabase = await createClient();

  const [{ data: assignment }, { data: task }, { data: checklist }, { data: templates }] =
    await Promise.all([
      supabase
        .from("task_assignments")
        .select("id")
        .eq("task_id", taskId)
        .eq("employee_id", employeeId)
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select(`
          id, title, service_type, description, scheduled_date,
          address:addresses(street, house_number, city, access_notes,
            client:clients(name))
        `)
        .eq("id", taskId)
        .eq("company_id", companyId)
        .single(),
      supabase
        .from("task_checklist_items")
        .select("text")
        .eq("task_id", taskId)
        .eq("company_id", companyId)
        .order("sort_order"),
      supabase
        .from("task_templates")
        .select("checklist_items, service_type")
        .eq("company_id", companyId)
        .eq("is_active", true),
    ]);

  if (!assignment || !task) return null;

  const address = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = address?.client
    ? Array.isArray(address.client)
      ? address.client[0]
      : address.client
    : null;

  const addressLine = address
    ? `${address.street}${address.house_number ? ` ${address.house_number}` : ""}, ${address.city}`
    : null;

  const templateChecklists = (templates ?? [])
    .filter((tpl) => tpl.service_type === task.service_type)
    .map((tpl) => {
      const items = tpl.checklist_items as Array<{ text?: string }> | null;
      return (items ?? []).map((i) => i.text).filter(Boolean) as string[];
    })
    .filter((items) => items.length > 0);

  const linkedMaterials = await loadMaterialsForServiceType(
    supabase,
    companyId,
    task.service_type as string,
  );

  return {
    companyId,
    companyName,
    locale,
    task: {
      id: task.id as string,
      title: task.title as string,
      serviceType: task.service_type as string,
      description: (task.description as string | null) ?? null,
      scheduledDate: task.scheduled_date as string,
      clientName: (client?.name as string | null) ?? null,
      addressLine,
      accessNotes: (address?.access_notes as string | null) ?? null,
    },
    existingChecklist: (checklist ?? []).map((c) => c.text as string),
    templateChecklists,
    linkedMaterials,
  };
}

async function loadMaterialsForServiceType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  serviceType: string,
): Promise<FieldJobMaterialSuggestion[]> {
  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("company_id", companyId)
    .ilike("name", `%${serviceType.replace(/_/g, " ")}%`)
    .limit(3);

  if (!services?.length) return [];

  const serviceIds = services.map((s) => s.id);
  const { data: links } = await supabase
    .from("material_service_links")
    .select(`
      quantity_per_service,
      material:materials(name, unit)
    `)
    .eq("company_id", companyId)
    .in("service_id", serviceIds)
    .limit(12);

  return (links ?? []).map((link) => {
    const material = Array.isArray(link.material) ? link.material[0] : link.material;
    const unit = (material?.unit as string | null) ?? "un";
    return {
      name: (material?.name as string) ?? "Material",
      quantity: `${link.quantity_per_service} ${unit}`,
    };
  });
}
