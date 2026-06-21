import type { ClientStatus, ServiceType, TaskStatus } from "@/types";

export interface Client360Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleTitle: string | null;
  isPrimary: boolean;
  source: "client" | "lead";
}

export interface Client360Property {
  id: string;
  label: string | null;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
  service_types: ServiceType[];
  access_notes: string | null;
  is_active: boolean;
  taskCount: number;
}

export interface Client360Contract {
  id: string;
  contract_number: string | null;
  title: string;
  status: string;
  frequency: string;
  total_cents: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  address_id: string | null;
}

export interface Client360Quote {
  id: string;
  quote_number: string;
  status: string;
  total_cents: number;
  issue_date: string | null;
}

export interface Client360Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  issue_date: string;
  due_date: string;
}

export interface Client360Task {
  id: string;
  title: string;
  status: TaskStatus;
  service_type: ServiceType;
  scheduled_date: string;
  priority: string;
  addressLabel: string | null;
  approved_at: string | null;
}

export interface Client360Service {
  key: string;
  label: string;
  propertyCount: number;
  taskCount: number;
}

export interface Client360Document {
  id: string;
  taskId: string;
  taskTitle: string;
  photo_type: string;
  storage_path: string;
  uploaded_at: string;
}

export interface Client360Report {
  id: string;
  title: string;
  type: "task" | "company";
  date: string;
  href: string;
  status?: string;
}

export interface Client360ActivityItem {
  id: string;
  label: string;
  description: string | null;
  createdAt: string;
  href: string | null;
}

export interface Client360Kpis {
  properties: number;
  activeContracts: number;
  openInvoices: number;
  openBalanceCents: number;
  revenueCents: number;
  activeTasks: number;
  completedTasks: number;
}

export interface Client360Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  source_lead_id: string | null;
  created_at: string;
}

export interface Client360Data {
  client: Client360Client;
  sourceLead: { id: string; company_name: string; status: string } | null;
  contacts: Client360Contact[];
  properties: Client360Property[];
  contracts: Client360Contract[];
  quotes: Client360Quote[];
  invoices: Client360Invoice[];
  tasks: Client360Task[];
  services: Client360Service[];
  documents: Client360Document[];
  reports: Client360Report[];
  activity: Client360ActivityItem[];
  kpis: Client360Kpis;
}
