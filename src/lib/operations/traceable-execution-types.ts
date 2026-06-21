import type { ExecutionRow } from "@/lib/operations/operations-data";
import type { TaskStatus } from "@/types";

export interface TraceableExecution extends ExecutionRow {
  service_id: string | null;
  serviceName: string | null;
  contractTitle: string | null;
  contractNumber: string | null;
  propertyId: string | null;
  clientName: string | null;
}

export interface TaskEventRow {
  id: string;
  event_type: string;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  task_id: string;
  taskTitle?: string | null;
  creatorName: string | null;
}

export interface OperationsHubData {
  executions: TraceableExecution[];
  kpis: {
    todayCount: number;
    weekCount: number;
    completedWeek: number;
    overdueCount: number;
    traceablePercent: number;
    upcomingVisits: number;
  };
  workflowCounts: Record<"contract" | "property" | "service" | "execution", number>;
  recentHistory: TaskEventRow[];
  activeContracts: number;
  activeProperties: number;
  activeServices: number;
}

export interface VisitRow extends TraceableExecution {
  assigneeName: string | null;
  executionStatus: string;
}

function mapTaskRow(row: Record<string, unknown>): TraceableExecution {
  const contract = row.contract as
    | { id: string; title: string; contract_number: string | null }
    | { id: string; title: string; contract_number: string | null }[]
    | null;
  const contractRow = Array.isArray(contract) ? contract[0] : contract;

  const service = row.service as { id: string; name: string } | { id: string; name: string }[] | null;
  const serviceRow = Array.isArray(service) ? service[0] : service;

  const address = row.address as
    | {
        id: string;
        label: string | null;
        street: string;
        city: string;
        client?: { name: string } | { name: string }[] | null;
      }
    | null;

  const client = address?.client;
  const clientRow = Array.isArray(client) ? client[0] : client;

  return {
    id: row.id as string,
    title: row.title as string,
    status: row.status as TaskStatus,
    scheduled_date: row.scheduled_date as string,
    scheduled_start: (row.scheduled_start as string | null) ?? null,
    scheduled_end: (row.scheduled_end as string | null) ?? null,
    service_type: row.service_type as string,
    approved_at: (row.approved_at as string | null) ?? null,
    invoice_id: (row.invoice_id as string | null) ?? null,
    contract_id: (row.contract_id as string | null) ?? null,
    team_id: (row.team_id as string | null) ?? null,
    service_id: (row.service_id as string | null) ?? null,
    serviceName: serviceRow?.name ?? null,
    contractTitle: contractRow?.title ?? null,
    contractNumber: contractRow?.contract_number ?? null,
    propertyId: address?.id ?? null,
    clientName: clientRow?.name ?? null,
    address: address
      ? { label: address.label, street: address.street, city: address.city, client: address.client }
      : null,
    assignments: row.assignments as TraceableExecution["assignments"],
  };
}

export const TRACEABLE_TASK_SELECT = `
  id, title, status, scheduled_date, scheduled_start, scheduled_end,
  service_type, approved_at, invoice_id, contract_id, team_id, service_id,
  contract:contracts(id, title, contract_number),
  service:services(id, name),
  address:addresses(id, label, street, city, client:clients(name)),
  assignments:task_assignments(employee:employees(full_name))
`;

export function mapTraceableRows(rows: Record<string, unknown>[]): TraceableExecution[] {
  return rows.map(mapTaskRow);
}
