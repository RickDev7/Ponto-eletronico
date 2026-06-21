import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceType } from "@/types";
import type {
  Property360CheckIn,
  Property360Contract,
  Property360Data,
  Property360Document,
  Property360Kpis,
  Property360Service,
  Property360Visit,
} from "@/lib/properties/property-360-types";

function assigneeNames(
  assignments: unknown,
): string[] {
  if (!Array.isArray(assignments)) return [];
  return assignments
    .map((a) => {
      const emp = (a as { employee?: { full_name: string | null } | { full_name: string | null }[] })
        .employee;
      if (!emp) return null;
      const row = Array.isArray(emp) ? emp[0] : emp;
      return row?.full_name ?? null;
    })
    .filter((n): n is string => Boolean(n));
}

function buildServices(
  serviceTypes: ServiceType[],
  visits: Property360Visit[],
): Property360Service[] {
  const map = new Map<string, Property360Service>();

  for (const st of serviceTypes) {
    map.set(st, { key: st, label: st, source: "property", visitCount: 0 });
  }

  for (const visit of visits) {
    const existing = map.get(visit.service_type);
    if (existing) {
      existing.visitCount += 1;
      if (existing.source === "property") existing.source = "property";
    } else {
      map.set(visit.service_type, {
        key: visit.service_type,
        label: visit.service_type,
        source: "visit",
        visitCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.visitCount - a.visitCount);
}

export async function loadProperty360Data(
  companyId: string,
  propertyId: string,
): Promise<Property360Data | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: propertyRow } = await supabase
    .from("addresses")
    .select(
      `
      id, client_id, label, street, house_number, postal_code, city, country,
      latitude, longitude, access_notes, property_type, area_sqm, service_types,
      is_active, created_at,
      client:clients(id, name, contact_name, email, phone)
    `,
    )
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .single();

  if (!propertyRow) return null;

  const clientRaw = propertyRow.client as
    | { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null }
    | Array<{ id: string; name: string; contact_name: string | null; email: string | null; phone: string | null }>
    | null;
  const clientRow = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;

  const [{ data: taskRows }, { data: contractRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        id, title, status, service_type, scheduled_date, scheduled_start, approved_at,
        assignments:task_assignments(employee:employees(full_name))
      `)
      .eq("address_id", propertyId)
      .eq("company_id", companyId)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false })
      .limit(60),
    supabase
      .from("contracts")
      .select("id, contract_number, title, status, frequency, total_cents, is_active, start_date")
      .eq("company_id", companyId)
      .eq("address_id", propertyId)
      .order("created_at", { ascending: false }),
  ]);

  const visits: Property360Visit[] = (taskRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    service_type: t.service_type as ServiceType,
    scheduled_date: t.scheduled_date,
    scheduled_start: t.scheduled_start,
    approved_at: t.approved_at,
    assignees: assigneeNames(t.assignments),
  }));

  const upcomingVisits = visits.filter(
    (v) => v.scheduled_date >= today && v.status !== "completed" && !v.approved_at,
  );
  const visitHistory = visits.filter(
    (v) => v.scheduled_date < today || v.status === "completed" || v.approved_at,
  );

  const taskIds = visits.map((v) => v.id);
  let checkIns: Property360CheckIn[] = [];
  let documents: Property360Document[] = [];

  if (taskIds.length > 0) {
    const [{ data: checkInRows }, { data: photoRows }] = await Promise.all([
      supabase
        .from("check_ins")
        .select("id, task_id, check_in_at, check_out_at, employee:employees(full_name)")
        .eq("company_id", companyId)
        .in("task_id", taskIds)
        .gte("check_in_at", ninetyDaysAgo.toISOString())
        .order("check_in_at", { ascending: false })
        .limit(30),
      supabase
        .from("task_photos")
        .select("id, task_id, photo_type, storage_path, uploaded_at")
        .eq("company_id", companyId)
        .in("task_id", taskIds)
        .order("uploaded_at", { ascending: false })
        .limit(40),
    ]);

    const taskTitleMap = new Map(visits.map((v) => [v.id, v.title]));

    checkIns = (checkInRows ?? []).map((ci) => {
      const emp = ci.employee as { full_name: string | null } | { full_name: string | null }[] | null;
      const row = Array.isArray(emp) ? emp[0] : emp;
      return {
        id: ci.id,
        check_in_at: ci.check_in_at,
        check_out_at: ci.check_out_at,
        employeeName: row?.full_name ?? null,
        taskTitle: taskTitleMap.get(ci.task_id) ?? null,
        taskId: ci.task_id,
      };
    });

    const photosWithUrls = await Promise.all(
      (photoRows ?? []).map(async (p) => {
        const { data } = await supabase.storage
          .from("task-photos")
          .createSignedUrl(p.storage_path, 3600);
        return {
          id: p.id,
          taskId: p.task_id,
          taskTitle: taskTitleMap.get(p.task_id) ?? "—",
          photo_type: p.photo_type,
          storage_path: p.storage_path,
          uploaded_at: p.uploaded_at,
          signedUrl: data?.signedUrl ?? null,
        } satisfies Property360Document;
      }),
    );
    documents = photosWithUrls;
  }

  const totalMinutes = checkIns.reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return (
      acc +
      Math.floor(
        (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
      )
    );
  }, 0);

  const serviceTypes = (propertyRow.service_types ?? []) as ServiceType[];
  const contracts = (contractRows ?? []) as Property360Contract[];

  const kpis: Property360Kpis = {
    upcomingVisits: upcomingVisits.length,
    completedVisits: visits.filter((v) => v.status === "completed" || v.approved_at).length,
    activeContracts: contracts.filter((c) => c.is_active).length,
    serviceCount: buildServices(serviceTypes, visits).length,
    documentCount: documents.length,
    hoursLast90Days: Math.floor(totalMinutes / 60),
  };

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${propertyRow.street} ${propertyRow.house_number ?? ""}, ${propertyRow.postal_code} ${propertyRow.city}`,
  )}`;

  const { client: _c, ...property } = propertyRow;

  return {
    property: {
      ...property,
      service_types: serviceTypes,
    },
    client: clientRow ?? null,
    contracts,
    services: buildServices(serviceTypes, visits),
    upcomingVisits,
    visitHistory,
    checkIns,
    documents,
    kpis,
    mapsUrl,
  };
}
