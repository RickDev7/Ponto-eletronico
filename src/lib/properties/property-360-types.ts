import type { ServiceType, TaskStatus } from "@/types";

export interface Property360Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface Property360Address {
  id: string;
  client_id: string;
  label: string | null;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  property_type: string | null;
  area_sqm: number | null;
  service_types: ServiceType[];
  is_active: boolean;
  created_at: string;
}

export interface Property360Contract {
  id: string;
  contract_number: string | null;
  title: string;
  status: string;
  frequency: string;
  total_cents: number | null;
  is_active: boolean;
  start_date: string;
}

export interface Property360Service {
  key: string;
  label: string;
  source: "property" | "visit";
  visitCount: number;
}

export interface Property360Visit {
  id: string;
  title: string;
  status: TaskStatus;
  service_type: ServiceType;
  scheduled_date: string;
  scheduled_start: string | null;
  approved_at: string | null;
  assignees: string[];
}

export interface Property360CheckIn {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  employeeName: string | null;
  taskTitle: string | null;
  taskId: string;
}

export interface Property360Document {
  id: string;
  taskId: string;
  taskTitle: string;
  photo_type: string;
  storage_path: string;
  uploaded_at: string;
  signedUrl: string | null;
}

export interface Property360Kpis {
  upcomingVisits: number;
  completedVisits: number;
  activeContracts: number;
  serviceCount: number;
  documentCount: number;
  hoursLast90Days: number;
}

export interface Property360Data {
  property: Property360Address;
  client: Property360Client | null;
  contracts: Property360Contract[];
  services: Property360Service[];
  upcomingVisits: Property360Visit[];
  visitHistory: Property360Visit[];
  checkIns: Property360CheckIn[];
  documents: Property360Document[];
  kpis: Property360Kpis;
  mapsUrl: string;
}
