import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/types";
import { generateOccurrenceDates, type RecurrenceRule } from "@/lib/recurring/generator";
import { logTaskEvent } from "@/lib/operations/task-events";

function contractFrequencyToRule(frequency: string): RecurrenceRule {
  const map: Record<string, RecurrenceRule> = {
    monthly: { type: "monthly", interval: 1, until: null, occurrences: 6 },
    bimonthly: { type: "monthly", interval: 2, until: null, occurrences: 6 },
    quarterly: { type: "monthly", interval: 3, until: null, occurrences: 4 },
    semiannual: { type: "monthly", interval: 6, until: null, occurrences: 4 },
    annual: { type: "monthly", interval: 12, until: null, occurrences: 3 },
  };
  return map[frequency] ?? map.monthly;
}

export async function generateTasksFromContractInternal(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    contractId: string;
    createdBy?: string | null;
  },
): Promise<{ count: number; error?: string }> {
  const { companyId, contractId, createdBy } = params;

  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, title, client_id, address_id, frequency, start_date, end_date, status, is_active, service_description",
    )
    .eq("id", contractId)
    .eq("company_id", companyId)
    .single();

  if (!contract) return { count: 0, error: "contract_not_found" };
  if (!contract.is_active || contract.status !== "active") {
    return { count: 0, error: "contract_inactive" };
  }
  if (!contract.address_id) return { count: 0, error: "contract_no_address" };

  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("contract_id", contractId)
    .gte("scheduled_date", new Date().toISOString().slice(0, 10))
    .limit(1);

  if (existing?.length) return { count: 0 };

  const { data: services } = await supabase
    .from("services")
    .select("id, legacy_service_type, default_checklist")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("sort_order")
    .limit(1);

  const service = services?.[0];
  const serviceType = (service?.legacy_service_type ?? "treppenhausreinigung") as ServiceType;
  const rule = contractFrequencyToRule(contract.frequency);
  const today = new Date().toISOString().slice(0, 10);
  const baseDate = contract.start_date >= today ? contract.start_date : today;

  const dates = [baseDate, ...generateOccurrenceDates(baseDate, rule, rule.occurrences ?? 6)];
  const filteredDates = contract.end_date
    ? dates.filter((d) => d <= contract.end_date!)
    : dates;

  const rows = filteredDates.map((date) => ({
    company_id: companyId,
    address_id: contract.address_id,
    contract_id: contract.id,
    service_id: service?.id ?? null,
    created_by: createdBy ?? null,
    service_type: serviceType,
    title: contract.title,
    description: contract.service_description ?? null,
    scheduled_date: date,
    status: "scheduled" as const,
    priority: "normal" as const,
  }));

  const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) return { count: 0, error: error.message };

  for (const task of inserted ?? []) {
    await logTaskEvent(supabase, {
      companyId,
      taskId: task.id,
      eventType: "created",
      createdBy: createdBy ?? null,
      message: "Gerado automaticamente a partir do contrato",
      metadata: { contractId, source: "automation" },
    });
  }

  return { count: inserted?.length ?? 0 };
}
