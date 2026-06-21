export type TenantStatus = "active" | "trial" | "suspended";

export type PlatformLogLevel = "debug" | "info" | "warn" | "error";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export interface PlatformTenantRow {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  email: string | null;
  created_at: string;
  suspended_at: string | null;
  suspended_reason: string | null;
  member_count: number;
  subscription?: {
    plan_key: string;
    status: string;
    trial_ends_at: string | null;
  } | null;
}

export interface PlatformSubscriptionRow {
  id: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  plan_key: string;
  status: string;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface PlatformSupportTicketRow {
  id: string;
  company_id: string;
  company_name: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  created_by: string;
  author_name: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface PlatformLogRow {
  id: string;
  level: PlatformLogLevel;
  source: string;
  message: string;
  company_id: string | null;
  company_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlatformAuditRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  company_id: string | null;
  company_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FeatureFlagRow {
  id: string;
  key: string;
  enabled: boolean;
  company_id: string | null;
  company_name: string | null;
  plan_key: string | null;
  description: string | null;
  updated_at: string;
}

export interface PlatformDashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialingSubscriptions: number;
  openTickets: number;
  mrrCents: number;
}

export interface PlatformContext {
  userId: string;
  profile: {
    id: string;
    full_name: string | null;
    email?: string;
  };
}
