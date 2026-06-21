import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceType } from "@/types";
import type {
  Client360ActivityItem,
  Client360Client,
  Client360Contact,
  Client360Data,
  Client360Document,
  Client360Kpis,
  Client360Property,
  Client360Report,
  Client360Service,
} from "@/lib/clients/client-360-types";

function propertyLabel(
  addr: { label: string | null; street: string; house_number: string | null; city: string },
): string {
  return addr.label ?? `${addr.street}${addr.house_number ? ` ${addr.house_number}` : ""}, ${addr.city}`;
}

function buildContacts(
  client: Client360Client,
  leadContacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role_title: string | null;
    is_primary: boolean;
  }>,
): Client360Contact[] {
  const contacts: Client360Contact[] = [];

  if (client.contact_name || client.email || client.phone) {
    contacts.push({
      id: `client-${client.id}`,
      name: client.contact_name ?? client.name,
      email: client.email,
      phone: client.phone,
      roleTitle: null,
      isPrimary: true,
      source: "client",
    });
  }

  for (const c of leadContacts) {
    if (
      contacts.some(
        (x) => x.name === c.name && x.email === c.email && x.phone === c.phone,
      )
    ) {
      continue;
    }
    contacts.push({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      roleTitle: c.role_title,
      isPrimary: c.is_primary,
      source: "lead",
    });
  }

  return contacts;
}

function buildServices(
  properties: Client360Property[],
  tasks: Client360Data["tasks"],
): Client360Service[] {
  const map = new Map<string, Client360Service>();

  for (const prop of properties) {
    for (const st of prop.service_types) {
      const existing = map.get(st);
      if (existing) existing.propertyCount += 1;
      else map.set(st, { key: st, label: st, propertyCount: 1, taskCount: 0 });
    }
  }

  for (const task of tasks) {
    const existing = map.get(task.service_type);
    if (existing) existing.taskCount += 1;
    else {
      map.set(task.service_type, {
        key: task.service_type,
        label: task.service_type,
        propertyCount: 0,
        taskCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.taskCount - a.taskCount);
}

function buildActivity(
  slug: string,
  client: Client360Client,
  tasks: Client360Data["tasks"],
  invoices: Client360Data["invoices"],
  contracts: Client360Data["contracts"],
): Client360ActivityItem[] {
  const items: Client360ActivityItem[] = [];

  for (const task of tasks.slice(0, 8)) {
    items.push({
      id: `task-${task.id}`,
      label: task.title,
      description: task.status,
      createdAt: task.scheduled_date,
      href: `/${slug}/tasks/${task.id}`,
    });
  }

  for (const inv of invoices.slice(0, 5)) {
    items.push({
      id: `inv-${inv.id}`,
      label: inv.invoice_number,
      description: inv.status,
      createdAt: inv.issue_date,
      href: `/${slug}/finance/invoices/${inv.id}`,
    });
  }

  for (const c of contracts.slice(0, 5)) {
    items.push({
      id: `ctr-${c.id}`,
      label: c.title,
      description: c.status,
      createdAt: c.start_date,
      href: `/${slug}/finance/contracts/${c.id}`,
    });
  }

  items.push({
    id: `client-created`,
    label: client.name,
    description: "created",
    createdAt: client.created_at.slice(0, 10),
    href: null,
  });

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
}

export async function loadClient360Data(
  companyId: string,
  clientId: string,
  slug: string,
): Promise<Client360Data | null> {
  const supabase = await createClient();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, name, contact_name, email, phone, notes, status, created_at")
    .eq("id", clientId)
    .eq("company_id", companyId)
    .single();

  if (!clientRow) return null;

  const client: Client360Client = {
    ...(clientRow as Omit<Client360Client, "source_lead_id">),
    source_lead_id: null,
  };

  const { data: sourceLeadRow } = await supabase
    .from("leads")
    .select("id, company_name, status")
    .eq("company_id", companyId)
    .eq("converted_client_id", clientId)
    .maybeSingle();

  const leadId = sourceLeadRow?.id ?? null;
  client.source_lead_id = leadId;

  const [
    { data: leadContacts },
    { data: addresses },
    { data: contracts },
    { data: quotes },
    { data: invoices },
  ] = await Promise.all([
    leadId
      ? supabase
          .from("lead_contacts")
          .select("id, name, email, phone, role_title, is_primary")
          .eq("lead_id", leadId)
          .eq("company_id", companyId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("addresses")
      .select(
        "id, label, street, house_number, postal_code, city, service_types, access_notes, is_active",
      )
      .eq("client_id", clientId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select(
        "id, contract_number, title, status, frequency, total_cents, start_date, end_date, is_active, address_id",
      )
      .eq("client_id", clientId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, quote_number, status, total_cents, issue_date")
      .eq("client_id", clientId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, total_cents, amount_paid_cents, issue_date, due_date",
      )
      .eq("client_id", clientId)
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false })
      .limit(30),
  ]);

  const addressIds = (addresses ?? []).map((a) => a.id);
  const addressMap = new Map((addresses ?? []).map((a) => [a.id, propertyLabel(a)]));

  const taskCountByAddr = new Map<string, number>();
  let tasks: Client360Data["tasks"] = [];

  if (addressIds.length > 0) {
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id, title, status, service_type, scheduled_date, priority, address_id, approved_at")
      .eq("company_id", companyId)
      .in("address_id", addressIds)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false })
      .limit(50);

    for (const row of taskRows ?? []) {
      taskCountByAddr.set(row.address_id, (taskCountByAddr.get(row.address_id) ?? 0) + 1);
    }

    tasks = (taskRows ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      service_type: t.service_type as ServiceType,
      scheduled_date: t.scheduled_date,
      priority: t.priority,
      addressLabel: addressMap.get(t.address_id) ?? null,
      approved_at: t.approved_at,
    }));
  }

  const taskIds = tasks.map((t) => t.id);
  let documents: Client360Document[] = [];
  if (taskIds.length > 0) {
    const { data: photos } = await supabase
      .from("task_photos")
      .select("id, task_id, photo_type, storage_path, uploaded_at")
      .eq("company_id", companyId)
      .in("task_id", taskIds)
      .order("uploaded_at", { ascending: false })
      .limit(40);

    const taskTitleMap = new Map(tasks.map((t) => [t.id, t.title]));
    documents = (photos ?? []).map((p) => ({
      id: p.id,
      taskId: p.task_id,
      taskTitle: taskTitleMap.get(p.task_id) ?? "—",
      photo_type: p.photo_type,
      storage_path: p.storage_path,
      uploaded_at: p.uploaded_at,
    }));
  }

  const properties: Client360Property[] = (addresses ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    street: a.street,
    house_number: a.house_number,
    postal_code: a.postal_code,
    city: a.city,
    service_types: (a.service_types ?? []) as ServiceType[],
    access_notes: a.access_notes,
    is_active: a.is_active,
    taskCount: taskCountByAddr.get(a.id) ?? 0,
  }));

  const invoiceRows = invoices ?? [];
  const openInvoices = invoiceRows.filter(
    (i) => !["paid", "cancelled", "void"].includes(i.status),
  );
  const revenueCents = invoiceRows
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount_paid_cents, 0);

  const kpis: Client360Kpis = {
    properties: properties.filter((p) => p.is_active).length,
    activeContracts: (contracts ?? []).filter((c) => c.is_active).length,
    openInvoices: openInvoices.length,
    openBalanceCents: openInvoices.reduce(
      (s, i) => s + (i.total_cents - i.amount_paid_cents),
      0,
    ),
    revenueCents,
    activeTasks: tasks.filter((t) => ["scheduled", "in_progress", "draft"].includes(t.status))
      .length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
  };

  const reports: Client360Report[] = tasks
    .filter((t) => t.approved_at || t.status === "completed")
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      title: t.title,
      type: "task" as const,
      date: t.approved_at?.slice(0, 10) ?? t.scheduled_date,
      href: `/${slug}/tasks/${t.id}`,
      status: t.status,
    }));

  const contacts = buildContacts(client, leadContacts ?? []);
  const services = buildServices(properties, tasks);
  const activity = buildActivity(slug, client, tasks, invoiceRows, contracts ?? []);

  return {
    client,
    sourceLead: sourceLeadRow ?? null,
    contacts,
    properties,
    contracts: contracts ?? [],
    quotes: quotes ?? [],
    invoices: invoiceRows,
    tasks,
    services,
    documents,
    reports,
    activity,
    kpis,
  };
}
