export interface AnalyticsMonthPoint {
  key: string;
  label: string;
}

export interface UtilizationAnalytics {
  pct: number;
  plannedMinutes: number;
  workedMinutes: number;
  employeeCount: number;
  monthly: Array<AnalyticsMonthPoint & { plannedMinutes: number; workedMinutes: number; pct: number }>;
}

export interface RevenueAnalytics {
  receivedYtdCents: number;
  invoicedYtdCents: number;
  mrrCents: number;
  monthly: Array<AnalyticsMonthPoint & { receivedCents: number; invoicedCents: number }>;
}

export interface ProfitabilityAnalytics {
  grossMarginPct: number;
  grossProfitCents: number;
  revenueCents: number;
  costCents: number;
  topClients: Array<{ id: string; name: string; revenueCents: number; marginPct: number }>;
  topServices: Array<{ id: string; name: string; revenueCents: number; marginPct: number }>;
}

export interface SlaAnalytics {
  compliancePct: number;
  onTimeCount: number;
  lateCount: number;
  overdueOpenCount: number;
  invoiceCollectionPct: number;
  invoicesPaidOnTime: number;
  invoicesPaidLate: number;
  monthly: Array<AnalyticsMonthPoint & { compliancePct: number }>;
}

export interface WorkforcePerformanceAnalytics {
  activeEmployees: number;
  productivityPct: number;
  completedTasks: number;
  totalHoursWorked: number;
  topPerformers: Array<{
    id: string;
    name: string;
    completedTasks: number;
    hoursWorked: number;
    utilizationPct: number;
  }>;
}

export interface AnalyticsCenterData {
  utilization: UtilizationAnalytics;
  revenue: RevenueAnalytics;
  profitability: ProfitabilityAnalytics;
  sla: SlaAnalytics;
  workforce: WorkforcePerformanceAnalytics;
  yearStart: string;
}
