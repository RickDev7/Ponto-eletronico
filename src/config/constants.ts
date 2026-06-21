import type { ServiceType } from "@/types";

export const APP_NAME = "FeldOps";
export const APP_DESCRIPTION =
  "Field service management for German cleaning & maintenance companies";

export const DEFAULT_LOCALE = "de-DE";
export const DEFAULT_TIMEZONE = "Europe/Berlin";
export const DEFAULT_COUNTRY = "DE";

export const COOKIE_ACTIVE_COMPANY = "feldops_company_id";

export const STORAGE_BUCKETS = {
  taskPhotos: "task-photos",
  reports: "reports",
  companyAssets: "company-assets",
  employeeDocuments: "employee-documents",
  clientDocuments: "client-documents",
} as const;

export const PAGINATION = {
  defaultPageSize: 25,
  maxPageSize: 100,
} as const;

/** Billing trial length in days for new workspaces. */
export const BILLING_TRIAL_DAYS = 14;

export const ROUTES = {
  home: "/",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
  demo: "/demo",
  privacy: "/privacy",
  terms: "/terms",
  impressum: "/impressum",
  cookies: "/cookies",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  selectCompany: "/select-company",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  authCallback: "/auth/callback",
  dashboard: (slug: string) => `/${slug}`,
  /** @deprecated Use ROUTES.workforceEmployees */
  employees: (slug: string) => `/${slug}/workforce/employees`,
  clients: (slug: string) => `/${slug}/clients`,
  addresses: (slug: string) => `/${slug}/addresses`,
  tasks: (slug: string) => `/${slug}/tasks`,
  reports: (slug: string) => `/${slug}/reports`,
  settings: (slug: string) => `/${slug}/settings`,
  settingsBilling: (slug: string) => `/${slug}/settings?tab=billing`,
  finance: (slug: string) => `/${slug}/finance`,
  financeQuotes: (slug: string) => `/${slug}/finance/quotes`,
  financeQuotesNew: (slug: string) => `/${slug}/finance/quotes/new`,
  financeQuote: (slug: string, id: string) => `/${slug}/finance/quotes/${id}`,
  financeQuoteEdit: (slug: string, id: string) => `/${slug}/finance/quotes/${id}/edit`,
  financeContracts: (slug: string) => `/${slug}/finance/contracts`,
  financeContractsNew: (slug: string) => `/${slug}/finance/contracts/new`,
  financeContract: (slug: string, id: string) => `/${slug}/finance/contracts/${id}`,
  financeContractEdit: (slug: string, id: string) =>
    `/${slug}/finance/contracts/${id}/edit`,
  /** CRM & Sales hub */
  crm: (slug: string) => `/${slug}/commercial`,
  crmLeads: (slug: string) => `/${slug}/crm/leads`,
  crmLead: (slug: string, id: string) => `/${slug}/crm/leads/${id}`,
  /** @deprecated Use ROUTES.commercialPipeline */
  crmPipeline: (slug: string) => `/${slug}/commercial/pipeline`,
  crmContacts: (slug: string) => `/${slug}/crm/contacts`,
  crmCompanies: (slug: string) => `/${slug}/crm/companies`,
  /** @deprecated Alias for ROUTES.crm */
  commercial: (slug: string) => `/${slug}/commercial`,
  commercialPipeline: (slug: string) => `/${slug}/commercial/pipeline`,
  financeInvoices: (slug: string, params?: { create?: string; clientId?: string }) => {
    const search = new URLSearchParams();
    if (params?.create) search.set("create", params.create);
    if (params?.clientId) search.set("clientId", params.clientId);
    const q = search.toString();
    return `/${slug}/finance/invoices${q ? `?${q}` : ""}`;
  },
  financeInvoice: (slug: string, id: string) => `/${slug}/finance/invoices/${id}`,
  financeRevenue: (slug: string) => `/${slug}/finance/revenue`,
  financePayments: (slug: string) => `/${slug}/finance/payments`,
  financeCashflow: (slug: string) => `/${slug}/finance/cashflow`,
  financeCosts: (slug: string) => `/${slug}/finance/costs`,
  financeProfitability: (slug: string) => `/${slug}/finance/profitability`,
  financeForecast: (slug: string) => `/${slug}/finance/forecast`,
  analytics: (slug: string) => `/${slug}/analytics`,
  analyticsExecutive: (slug: string) => `/${slug}/analytics/executive`,
  analyticsOperational: (
    slug: string,
    params?: { tab?: "activity" | "audits"; days?: string; page?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.tab) search.set("tab", params.tab);
    if (params?.days) search.set("days", params.days);
    if (params?.page) search.set("page", params.page);
    const q = search.toString();
    return `/${slug}/analytics/operational${q ? `?${q}` : ""}`;
  },
  analyticsFinancial: (slug: string) => `/${slug}/analytics/financial`,
  automations: (slug: string) => `/${slug}/automations`,
  assets: (slug: string) => `/${slug}/assets`,
  operations: (slug: string) => `/${slug}/operations`,
  operationsProperties: (slug: string) => `/${slug}/operations/properties`,
  operationsProperty: (slug: string, id: string) => `/${slug}/operations/properties/${id}`,
  operationsServices: (slug: string) => `/${slug}/operations/services`,
  operationsEquipment: (slug: string) => `/${slug}/operations/equipment`,
  operationsMaterials: (slug: string) => `/${slug}/operations/materials`,
  operationsScheduling: (
    slug: string,
    params?: { view?: string; week?: string; date?: string; mode?: string; month?: string; year?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.view) search.set("view", params.view);
    if (params?.week) search.set("week", params.week);
    if (params?.date) search.set("date", params.date);
    if (params?.mode) search.set("mode", params.mode);
    if (params?.month) search.set("month", params.month);
    if (params?.year) search.set("year", params.year);
    const q = search.toString();
    return `/${slug}/operations/scheduling${q ? `?${q}` : ""}`;
  },
  /** @deprecated Canonical calendar at ROUTES.calendar */
  operationsCalendar: (slug: string, params?: { month?: string; year?: string }) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", params.month);
    if (params?.year) search.set("year", params.year);
    const q = search.toString();
    return `/${slug}/calendar${q ? `?${q}` : ""}`;
  },
  /** @deprecated Use ROUTES.workforceTeams */
  operationsTeams: (slug: string) => `/${slug}/workforce/teams`,
  operationsRoutes: (slug: string, params?: { date?: string }) => {
    const search = new URLSearchParams();
    if (params?.date) search.set("date", params.date);
    const q = search.toString();
    return `/${slug}/operations/routes${q ? `?${q}` : ""}`;
  },
  operationsWorkOrders: (
    slug: string,
    params?: { tab?: "jobs" | "visits" },
  ) => {
    const search = new URLSearchParams();
    if (params?.tab && params.tab !== "jobs") search.set("tab", params.tab);
    const q = search.toString();
    return `/${slug}/operations/work-orders${q ? `?${q}` : ""}`;
  },
  /** @deprecated Use ROUTES.operationsWorkOrders */
  operationsJobs: (slug: string) => `/${slug}/operations/work-orders`,
  /** @deprecated Use ROUTES.operationsWorkOrders({ tab: 'visits' }) */
  operationsVisits: (slug: string) => `/${slug}/operations/work-orders?tab=visits`,
  workforce: (slug: string) => `/${slug}/workforce`,
  workforceEmployees: (slug: string) => `/${slug}/workforce/employees`,
  workforceEmployee: (slug: string, id: string) => `/${slug}/workforce/employees/${id}`,
  workforceShifts: (slug: string, params?: { view?: string; week?: string }) => {
    const search = new URLSearchParams();
    if (params?.view) search.set("view", params.view);
    if (params?.week) search.set("week", params.week);
    const q = search.toString();
    return `/${slug}/workforce/shifts${q ? `?${q}` : ""}`;
  },
  workforcePlanning: (slug: string, params?: { view?: string; week?: string }) => {
    const search = new URLSearchParams();
    if (params?.view) search.set("view", params.view);
    if (params?.week) search.set("week", params.week);
    const q = search.toString();
    return `/${slug}/workforce/planning${q ? `?${q}` : ""}`;
  },
  workforcePlanningReports: (slug: string, params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    const q = search.toString();
    return `/${slug}/workforce/planning/reports${q ? `?${q}` : ""}`;
  },
  workforceVehicles: (slug: string) => `/${slug}/workforce/vehicles`,
  workforceVacations: (slug: string) => `/${slug}/workforce/vacations`,
  workforceAbsences: (slug: string) => `/${slug}/workforce/absences`,
  workforceTimeAccount: (slug: string) => `/${slug}/workforce/time-account`,
  workforceTimeBank: (
    slug: string,
    params?: { tab?: "account" | "tracking" | "timesheets"; granularity?: string; date?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.tab && params.tab !== "account") search.set("tab", params.tab);
    if (params?.granularity) search.set("granularity", params.granularity);
    if (params?.date) search.set("date", params.date);
    const q = search.toString();
    return `/${slug}/workforce/time-account${q ? `?${q}` : ""}`;
  },
  /** @deprecated Use ROUTES.workforceTimeBank */
  workforceTimeTracking: (slug: string, params?: { granularity?: string; date?: string }) => {
    const search = new URLSearchParams();
    search.set("tab", "tracking");
    if (params?.granularity) search.set("granularity", params.granularity);
    if (params?.date) search.set("date", params.date);
    const q = search.toString();
    return `/${slug}/workforce/time-account?${q}`;
  },
  workforceTimeTrackingExport: (slug: string, params?: { granularity?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.granularity) q.set("granularity", params.granularity);
    if (params?.date) q.set("date", params.date);
    const qs = q.toString();
    return `/${slug}/workforce/time-tracking/export${qs ? `?${qs}` : ""}`;
  },
  /** @deprecated Use ROUTES.workforceTimeBank({ tab: 'timesheets' }) */
  workforceTimesheets: (slug: string) => `/${slug}/workforce/time-account?tab=timesheets`,
  workforceWorktime: (slug: string) => `/${slug}/workforce/worktime`,
  workforceDocuments: (slug: string) => `/${slug}/workforce/documents`,
  workforceTeams: (slug: string) => `/${slug}/workforce/teams`,
  workforceSkills: (slug: string) => `/${slug}/workforce/skills`,
  workforceAvailability: (slug: string) => `/${slug}/workforce/availability`,
  field: (slug: string) => `/${slug}/field`,
  fieldSchedule: (slug: string) => `/${slug}/field/schedule`,
  fieldExecute: (slug: string, taskId: string) => `/${slug}/field/tasks/${taskId}`,
  calendar: (slug: string, params?: { month?: string; year?: string }) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", params.month);
    if (params?.year) search.set("year", params.year);
    const q = search.toString();
    return `/${slug}/calendar${q ? `?${q}` : ""}`;
  },
  /** @deprecated Use ROUTES.operationsScheduling */
  schedule: (slug: string) => `/${slug}/operations/scheduling?view=week`,
  task: (slug: string, id: string) => `/${slug}/tasks/${id}`,
  client: (slug: string, id: string) => `/${slug}/clients/${id}`,
  clientPortal: (slug: string) => `/${slug}/portal`,
  clientPortalContracts: (slug: string) => `/${slug}/portal/contracts`,
  clientPortalInvoices: (slug: string) => `/${slug}/portal/invoices`,
  clientPortalInvoice: (slug: string, id: string) => `/${slug}/portal/invoices/${id}`,
  clientPortalReports: (slug: string) => `/${slug}/portal/reports`,
  clientPortalServices: (slug: string) => `/${slug}/portal/services`,
  clientPortalDocuments: (slug: string) => `/${slug}/portal/documents`,
  assistant: (slug: string) => `/${slug}/assistant`,
  mobile: (slug: string) => `/${slug}/mobile`,
  superAdmin: "/super-admin",
  superAdminTenants: "/super-admin/tenants",
  superAdminSubscriptions: "/super-admin/subscriptions",
  superAdminSupport: "/super-admin/support",
  superAdminLogs: "/super-admin/logs",
  superAdminFeatureFlags: "/super-admin/feature-flags",
  superAdminAudit: "/super-admin/audit",
  /** Alias for super-admin console */
  admin: "/admin",
  adminTenants: "/admin/tenants",
  adminSubscriptions: "/admin/subscriptions",
  adminSupport: "/admin/support",
  adminLogs: "/admin/logs",
  adminFeatureFlags: "/admin/feature-flags",
  adminAudit: "/admin/audit",
  /** @deprecated Use ROUTES.superAdmin */
  platform: "/super-admin",
  /** @deprecated Use ROUTES.superAdminTenants */
  platformTenants: "/super-admin/tenants",
  /** @deprecated Use ROUTES.superAdminSubscriptions */
  platformSubscriptions: "/super-admin/subscriptions",
  /** @deprecated Use ROUTES.superAdminSupport */
  platformSupport: "/super-admin/support",
  /** @deprecated Use ROUTES.superAdminLogs */
  platformLogs: "/super-admin/logs",
  /** @deprecated Use ROUTES.superAdminFeatureFlags */
  platformFeatureFlags: "/super-admin/feature-flags",
  /** @deprecated Use ROUTES.superAdminAudit */
  platformAudit: "/super-admin/audit",
} as const;

export const SUPER_ADMIN_PREFIX = "/super-admin";

export function isSuperAdminPath(barePath: string): boolean {
  return (
    barePath === SUPER_ADMIN_PREFIX ||
    barePath.startsWith(`${SUPER_ADMIN_PREFIX}/`) ||
    barePath === "/admin" ||
    barePath.startsWith("/admin/") ||
    barePath === "/platform" ||
    barePath.startsWith("/platform/")
  );
}

/** Map legacy/alias admin paths to canonical /super-admin paths. */
export function toCanonicalSuperAdminPath(barePath: string): string {
  if (barePath === "/admin" || barePath.startsWith("/admin/")) {
    return barePath.replace(/^\/admin/, SUPER_ADMIN_PREFIX);
  }
  if (barePath === "/platform" || barePath.startsWith("/platform/")) {
    return barePath.replace(/^\/platform/, SUPER_ADMIN_PREFIX);
  }
  return barePath;
}

/** Paths accessible without authentication (locale prefix added by middleware). */
export const AUTH_PUBLIC_PATHS = [
  ROUTES.home,
  ROUTES.features,
  ROUTES.pricing,
  ROUTES.contact,
  ROUTES.demo,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.impressum,
  ROUTES.cookies,
  ROUTES.login,
  ROUTES.register,
  "/reset",
  "/update-password",
] as const;

/**
 * URL segments that must never be treated as a company slug.
 * Prevents /{locale}/login from being captured by [companySlug] layout.
 */
export const RESERVED_COMPANY_SLUGS = new Set([
  "login",
  "register",
  "onboarding",
  "select-company",
  "checkout",
  "features",
  "pricing",
  "contact",
  "demo",
  "privacy",
  "terms",
  "impressum",
  "cookies",
  "reset",
  "update-password",
  "invite",
  "offline",
  "auth",
  "platform",
  "super-admin",
  "admin",
  "pt",
  "en",
]);

/** True when the first URL segment is a company slug (tenant workspace). */
export function isTenantWorkspacePath(barePath: string): boolean {
  const segments = barePath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  return !RESERVED_COMPANY_SLUGS.has(segments[0]!);
}

export const SERVICE_TYPE_LABELS: Record<
  ServiceType,
  { de: string; en: string }
> = {
  treppenhausreinigung: {
    de: "Treppenhausreinigung",
    en: "Stairwell Cleaning",
  },
  gartenpflege: { de: "Gartenpflege", en: "Garden Maintenance" },
  winterdienst: { de: "Winterdienst", en: "Winter Service" },
  glasreinigung: { de: "Glasreinigung", en: "Window Cleaning" },
};
