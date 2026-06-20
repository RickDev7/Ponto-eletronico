import type { Subscription, SubscriptionStatus } from "@/lib/billing/types";
import type {
  ActivityAction,
  ClientStatus,
  EmployeeStatus,
  MemberRole,
  MemberStatus,
  PhotoType,
  ReportType,
  ServiceType,
  TaskPriority,
  TaskStatus,
} from "./enums";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface CompanySettings {
  locale: string;
  timezone: string;
  currency: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  settings: CompanySettings;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  member_id: string | null;
  employee_number: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: EmployeeStatus;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  company_id: string;
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
  service_types: ServiceType[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  address_id: string;
  created_by: string | null;
  service_type: ServiceType;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  company_id: string;
  task_id: string;
  employee_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface CheckIn {
  id: string;
  company_id: string;
  task_id: string;
  employee_id: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_in_notes: string | null;
  check_out_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskPhoto {
  id: string;
  company_id: string;
  task_id: string;
  check_in_id: string | null;
  photo_type: PhotoType;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: ActivityAction;
  metadata: Json;
  created_at: string;
}

export interface Report {
  id: string;
  company_id: string;
  report_type: ReportType;
  title: string;
  period_start: string | null;
  period_end: string | null;
  storage_path: string | null;
  file_size: number | null;
  generated_by: string | null;
  generated_at: string;
  metadata: Json;
}

export interface CompanyInvite {
  id: string;
  company_id: string;
  email: string;
  role: MemberRole;
  token_hash: string;
  expires_at: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

/** Joined types for application layer */
export interface TaskWithRelations extends Task {
  address?: Address & { client?: Client };
  assignments?: (TaskAssignment & { employee?: Employee })[];
  photos?: TaskPhoto[];
  check_ins?: CheckIn[];
}

export interface CompanyContext {
  company: Company;
  membership: CompanyMember;
  profile: Profile;
  employee: Employee | null;
}

export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Partial<Company> & Pick<Company, "name" | "slug">; Update: Partial<Company> };
      profiles: { Row: Profile; Insert: Pick<Profile, "id"> & Partial<Profile>; Update: Partial<Profile> };
      company_members: { Row: CompanyMember; Insert: Pick<CompanyMember, "company_id" | "user_id"> & Partial<CompanyMember>; Update: Partial<CompanyMember> };
      employees: { Row: Employee; Insert: Pick<Employee, "company_id" | "full_name"> & Partial<Employee>; Update: Partial<Employee> };
      clients: { Row: Client; Insert: Pick<Client, "company_id" | "name"> & Partial<Client>; Update: Partial<Client> };
      addresses: { Row: Address; Insert: Pick<Address, "company_id" | "client_id" | "street" | "postal_code" | "city"> & Partial<Address>; Update: Partial<Address> };
      tasks: { Row: Task; Insert: Pick<Task, "company_id" | "address_id" | "service_type" | "title" | "scheduled_date"> & Partial<Task>; Update: Partial<Task> };
      task_assignments: { Row: TaskAssignment; Insert: Pick<TaskAssignment, "task_id" | "employee_id"> & Partial<TaskAssignment>; Update: Partial<TaskAssignment> };
      check_ins: { Row: CheckIn; Insert: Pick<CheckIn, "company_id" | "task_id" | "employee_id"> & Partial<CheckIn>; Update: Partial<CheckIn> };
      task_photos: { Row: TaskPhoto; Insert: Pick<TaskPhoto, "company_id" | "task_id" | "photo_type" | "storage_path"> & Partial<TaskPhoto>; Update: Partial<TaskPhoto> };
      activity_logs: { Row: ActivityLog; Insert: Pick<ActivityLog, "company_id" | "entity_type" | "entity_id" | "action"> & Partial<ActivityLog>; Update: never };
      reports: { Row: Report; Insert: Pick<Report, "company_id" | "report_type" | "title"> & Partial<Report>; Update: Partial<Report> };
      company_invites: { Row: CompanyInvite; Insert: Pick<CompanyInvite, "company_id" | "email" | "token_hash" | "expires_at"> & Partial<CompanyInvite>; Update: Partial<CompanyInvite> };
      subscriptions: {
        Row: Subscription;
        Insert: Pick<Subscription, "company_id"> & Partial<Subscription>;
        Update: Partial<Subscription>;
      };
      billing_events: {
        Row: {
          id: string;
          company_id: string | null;
          stripe_event_id: string;
          event_type: string;
          payload: Json;
          processed_at: string;
        };
        Insert: {
          stripe_event_id: string;
          event_type: string;
          payload?: Json;
          company_id?: string | null;
        };
        Update: never;
      };
    };
    Enums: {
      member_role: MemberRole;
      member_status: MemberStatus;
      subscription_status: SubscriptionStatus;
      service_type: ServiceType;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      photo_type: PhotoType;
      activity_action: ActivityAction;
      report_type: ReportType;
      client_status: ClientStatus;
      employee_status: EmployeeStatus;
    };
    Functions: {
      create_company_with_admin: {
        Args: {
          p_name: string;
          p_slug: string;
          p_legal_name?: string | null;
        };
        Returns: string;
      };
    };
  };
}
