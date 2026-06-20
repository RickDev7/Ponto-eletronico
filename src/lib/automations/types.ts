import type {
  AutomationActionStep,
  AutomationCondition,
  AutomationTriggerType,
  DeliveryChannel,
} from "@/lib/validations/automations";

export type AutomationRunStatus = "pending" | "running" | "success" | "failed" | "skipped";
export type DeliveryStatus = "queued" | "sent" | "failed" | "skipped";

export interface AutomationRuleRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_type: AutomationTriggerType;
  conditions: AutomationCondition[];
  actions: AutomationActionStep[];
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRunRow {
  id: string;
  company_id: string;
  rule_id: string | null;
  trigger_type: AutomationTriggerType;
  trigger_payload: Record<string, unknown>;
  status: AutomationRunStatus;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  rule?: { name: string } | { name: string }[] | null;
}

export interface AutomationDeliveryRow {
  id: string;
  run_id: string;
  channel: DeliveryChannel;
  recipient: string | null;
  subject: string | null;
  status: DeliveryStatus;
  provider: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface AutomationEventPayload {
  [key: string]: unknown;
}

export interface EmitAutomationEventParams {
  companyId: string;
  trigger: AutomationTriggerType;
  payload: AutomationEventPayload;
  slug?: string;
  triggeredBy?: string | null;
}

export interface DeliveryRequest {
  companyId: string;
  runId: string;
  channel: DeliveryChannel;
  recipient: string;
  subject?: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface DeliveryResult {
  status: DeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
}
