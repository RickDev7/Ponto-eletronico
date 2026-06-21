import { createClient } from "@/lib/supabase/server";
import { getCompanyBySlug, getMembership, getSession } from "@/lib/auth/session";
import type { Address, ClientDocument, Report } from "@/types/database";

export interface PortalOverview {
  activeContracts: number;
  openInvoices: number;
  overdueInvoices: number;
  properties: number;
  recentInvoices: PortalInvoiceRow[];
  upcomingServices: PortalServiceRow[];
}

export interface PortalContractRow {
  id: string;
  title: string;
  service_description: string | null;
  amount_cents: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  currency: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
}

export interface PortalInvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  total_cents: number;
  amount_paid_cents: number;
  currency: string;
  contract?: { title: string | null } | null;
}

export interface PortalReportRow {
  id: string;
  title: string;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  storage_path: string | null;
  generated_at: string;
  source: "report" | "service_report";
}

export interface PortalServiceRow {
  id: string;
  title: string;
  service_type: string;
  scheduled_date: string;
  status: string;
  address_label: string | null;
  street: string;
  city: string;
}

export interface PortalAddressRow extends Address {
  active_tasks: number;
}

async function resolveClientContext(slug: string) {
  const company = await getCompanyBySlug(slug);
  if (!company) return null;

  const user = await getSession();
  if (!user) return null;

  const membership = await getMembership(user.id, company.id);
  if (!membership?.client_id || membership.role !== "client") return null;

  return { company, clientId: membership.client_id };
}

export async function loadPortalOverview(slug: string): Promise<PortalOverview | null> {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return null;

  const supabase = await createClient();
  const { company, clientId } = ctx;

  const [
    { count: activeContracts },
    { count: openInvoices },
    { count: overdueInvoices },
    { count: properties },
    { data: recentInvoices },
    { data: upcomingTasks },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("client_id", clientId)
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("client_id", clientId)
      .in("status", ["sent", "partial"]),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("client_id", clientId)
      .eq("status", "overdue"),
    supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("client_id", clientId)
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, currency, contract:contracts(title)")
      .eq("company_id", company.id)
      .eq("client_id", clientId)
      .neq("status", "draft")
      .order("issue_date", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, service_type, scheduled_date, status, address:addresses(label, street, city, client_id)")
      .eq("company_id", company.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date")
      .limit(5),
  ]);

  const upcomingServices: PortalServiceRow[] = (upcomingTasks ?? [])
    .filter((task) => {
      const addr = task.address as
        | { client_id: string; label: string | null; street: string; city: string }
        | { client_id: string; label: string | null; street: string; city: string }[]
        | null;
      const address = Array.isArray(addr) ? addr[0] : addr;
      return address?.client_id === clientId;
    })
    .map((task) => {
      const addr = task.address as
        | { label: string | null; street: string; city: string }
        | { label: string | null; street: string; city: string }[]
        | null;
      const address = Array.isArray(addr) ? addr[0] : addr;
      return {
        id: task.id,
        title: task.title,
        service_type: task.service_type,
        scheduled_date: task.scheduled_date,
        status: task.status,
        address_label: address?.label ?? null,
        street: address?.street ?? "",
        city: address?.city ?? "",
      };
    });

  return {
    activeContracts: activeContracts ?? 0,
    openInvoices: openInvoices ?? 0,
    overdueInvoices: overdueInvoices ?? 0,
    properties: properties ?? 0,
    recentInvoices: (recentInvoices ?? []) as unknown as PortalInvoiceRow[],
    upcomingServices,
  };
}

export async function loadPortalContracts(slug: string): Promise<PortalContractRow[]> {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("*, items:contract_items(*)")
    .eq("company_id", ctx.company.id)
    .eq("client_id", ctx.clientId)
    .order("created_at", { ascending: false });

  return (data ?? []) as PortalContractRow[];
}

export async function loadPortalInvoices(slug: string): Promise<PortalInvoiceRow[]> {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, currency, contract:contracts(title)")
    .eq("company_id", ctx.company.id)
    .eq("client_id", ctx.clientId)
    .neq("status", "draft")
    .order("issue_date", { ascending: false });

  return (data ?? []) as unknown as PortalInvoiceRow[];
}

export async function loadPortalInvoiceDetail(slug: string, invoiceId: string) {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ data: invoice }, { data: company }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, items:invoice_items(*), payments:payments(*), contract:contracts(title)")
      .eq("id", invoiceId)
      .eq("company_id", ctx.company.id)
      .eq("client_id", ctx.clientId)
      .neq("status", "draft")
      .maybeSingle(),
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", ctx.company.id)
      .single(),
  ]);

  if (!invoice) return null;
  return { invoice, company: company ?? { name: ctx.company.name } };
}

export async function loadPortalReports(slug: string): Promise<PortalReportRow[]> {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return [];

  const supabase = await createClient();

  const [{ data: reports }, { data: serviceReports }] = await Promise.all([
    supabase
      .from("reports")
      .select("*")
      .eq("company_id", ctx.company.id)
      .eq("client_id", ctx.clientId)
      .eq("visible_to_client", true)
      .order("generated_at", { ascending: false }),
    supabase
      .from("service_reports")
      .select("id, status, storage_path, generated_at, signed_at, task:tasks(title, scheduled_date, address:addresses(client_id))")
      .eq("company_id", ctx.company.id)
      .in("status", ["signed", "generated"])
      .order("generated_at", { ascending: false }),
  ]);

  const reportRows: PortalReportRow[] = (reports ?? []).map((r: Report) => ({
    id: r.id,
    title: r.title,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    storage_path: r.storage_path,
    generated_at: r.generated_at,
    source: "report" as const,
  }));

  for (const sr of serviceReports ?? []) {
    const task = sr.task as unknown as {
      title: string;
      scheduled_date: string;
      address: { client_id: string } | { client_id: string }[] | null;
    } | null;
    const address = task?.address
      ? Array.isArray(task.address)
        ? task.address[0]
        : task.address
      : null;
    if (address?.client_id !== ctx.clientId) continue;

    reportRows.push({
      id: sr.id,
      title: task?.title ?? "Service report",
      report_type: "client",
      period_start: task?.scheduled_date ?? null,
      period_end: null,
      storage_path: sr.storage_path,
      generated_at: sr.generated_at ?? sr.signed_at ?? new Date().toISOString(),
      source: "service_report",
    });
  }

  return reportRows.sort(
    (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
  );
}

export async function loadPortalServices(slug: string) {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return { addresses: [], contracts: [], recentTasks: [] };

  const supabase = await createClient();

  const [{ data: addresses }, { data: contracts }, { data: tasks }] = await Promise.all([
    supabase
      .from("addresses")
      .select("*")
      .eq("company_id", ctx.company.id)
      .eq("client_id", ctx.clientId)
      .eq("is_active", true)
      .order("city"),
    supabase
      .from("contracts")
      .select("id, title, service_description, frequency, is_active")
      .eq("company_id", ctx.company.id)
      .eq("client_id", ctx.clientId)
      .eq("is_active", true)
      .order("title"),
    supabase
      .from("tasks")
      .select("id, title, service_type, scheduled_date, status, completed_at, address:addresses(label, street, city, client_id)")
      .eq("company_id", ctx.company.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const recentTasks: PortalServiceRow[] = (tasks ?? [])
    .filter((task) => {
      const addr = task.address as { client_id: string } | { client_id: string }[] | null;
      const address = Array.isArray(addr) ? addr[0] : addr;
      return address?.client_id === ctx.clientId;
    })
    .map((task) => {
      const addr = task.address as
        | { label: string | null; street: string; city: string }
        | { label: string | null; street: string; city: string }[]
        | null;
      const address = Array.isArray(addr) ? addr[0] : addr;
      return {
        id: task.id,
        title: task.title,
        service_type: task.service_type,
        scheduled_date: task.scheduled_date,
        status: task.status,
        address_label: address?.label ?? null,
        street: address?.street ?? "",
        city: address?.city ?? "",
      };
    });

  return {
    addresses: (addresses ?? []) as PortalAddressRow[],
    contracts: contracts ?? [],
    recentTasks,
  };
}

export async function loadPortalDocuments(slug: string): Promise<ClientDocument[]> {
  const ctx = await resolveClientContext(slug);
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("client_documents")
    .select("*")
    .eq("company_id", ctx.company.id)
    .eq("client_id", ctx.clientId)
    .eq("visible_to_client", true)
    .order("uploaded_at", { ascending: false });

  return (data ?? []) as ClientDocument[];
}

export async function getPortalDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
