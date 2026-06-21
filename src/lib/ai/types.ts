export type AiDomain =
  | "operations"
  | "workforce"
  | "finance"
  | "analytics"
  | "commercial"
  | "tasks"
  | "reports"
  | "automations"
  | "portal"
  | "general";

export type AiCapability =
  | "optimize_schedules"
  | "suggest_workforce_allocation"
  | "estimate_costs"
  | "predict_delays"
  | "generate_quotes"
  | "generate_reports"
  | "analyze_productivity";

export interface AiInsightItem {
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
  metric?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface AiStructuredResult {
  summary: string;
  insights: AiInsightItem[];
  recommendations: string[];
  metrics?: Record<string, string | number>;
  generatedContent?: string;
}

export interface AiRunResult {
  capability: AiCapability;
  domain: AiDomain;
  provider: "openai" | "fallback";
  result: AiStructuredResult;
  insightId?: string;
}

export interface AiCompanyContext {
  companyId: string;
  companyName: string;
  domain: AiDomain;
  locale: string;
  tasks: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    overdue: number;
    unassigned: number;
  };
  workforce: {
    activeEmployees: number;
    openShifts: number;
    onVacation: number;
    utilizationPct: number;
  };
  finance: {
    openInvoices: number;
    overdueInvoices: number;
    mrrCents: number;
    receivedYtdCents: number;
    outstandingCents: number;
  };
  operations: {
    activeContracts: number;
    activeProperties: number;
    visitsThisWeek: number;
  };
  productivity: {
    completionRatePct: number;
    avgTasksPerEmployee: number;
    onTimeRatePct: number;
  };
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}
