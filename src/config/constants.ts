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
  employees: (slug: string) => `/${slug}/employees`,
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
  crm: (slug: string) => `/${slug}/crm`,
  crmLeads: (slug: string) => `/${slug}/crm/leads`,
  crmLead: (slug: string, id: string) => `/${slug}/crm/leads/${id}`,
  crmPipeline: (slug: string) => `/${slug}/crm/pipeline`,
  crmContacts: (slug: string) => `/${slug}/crm/contacts`,
  crmCompanies: (slug: string) => `/${slug}/crm/companies`,
  financeInvoices: (slug: string, params?: { create?: string; clientId?: string }) => {
    const search = new URLSearchParams();
    if (params?.create) search.set("create", params.create);
    if (params?.clientId) search.set("clientId", params.clientId);
    const q = search.toString();
    return `/${slug}/finance/invoices${q ? `?${q}` : ""}`;
  },
  financePayments: (slug: string) => `/${slug}/finance/payments`,
  financeCashflow: (slug: string) => `/${slug}/finance/cashflow`,
  financeCosts: (slug: string) => `/${slug}/finance/costs`,
  financeProfitability: (slug: string) => `/${slug}/finance/profitability`,
  financeForecast: (slug: string) => `/${slug}/finance/forecast`,
  automations: (slug: string) => `/${slug}/automations`,
  operations: (slug: string) => `/${slug}/operations`,
  operationsProperties: (slug: string) => `/${slug}/operations/properties`,
  operationsProperty: (slug: string, id: string) => `/${slug}/operations/properties/${id}`,
  operationsServices: (slug: string) => `/${slug}/operations/services`,
  operationsScheduling: (
    slug: string,
    params?: { view?: string; week?: string; date?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.view) search.set("view", params.view);
    if (params?.week) search.set("week", params.week);
    if (params?.date) search.set("date", params.date);
    const q = search.toString();
    return `/${slug}/operations/scheduling${q ? `?${q}` : ""}`;
  },
  operationsCalendar: (slug: string, params?: { month?: string; year?: string }) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", params.month);
    if (params?.year) search.set("year", params.year);
    const q = search.toString();
    return `/${slug}/operations/calendar${q ? `?${q}` : ""}`;
  },
  operationsTeams: (slug: string) => `/${slug}/operations/teams`,
  operationsRoutes: (slug: string, params?: { date?: string }) => {
    const search = new URLSearchParams();
    if (params?.date) search.set("date", params.date);
    const q = search.toString();
    return `/${slug}/operations/routes${q ? `?${q}` : ""}`;
  },
  operationsJobs: (slug: string) => `/${slug}/operations/jobs`,
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
  workforceVacations: (slug: string) => `/${slug}/workforce/vacations`,
  workforceAbsences: (slug: string) => `/${slug}/workforce/absences`,
  workforceTimeAccount: (slug: string) => `/${slug}/workforce/time-account`,
  workforceTimesheets: (slug: string) => `/${slug}/workforce/timesheets`,
  workforceWorktime: (slug: string) => `/${slug}/workforce/worktime`,
  workforceDocuments: (slug: string) => `/${slug}/workforce/documents`,
  calendar: (slug: string) => `/${slug}/calendar`,
  schedule: (slug: string) => `/${slug}/schedule`,
  task: (slug: string, id: string) => `/${slug}/tasks/${id}`,
  client: (slug: string, id: string) => `/${slug}/clients/${id}`,
} as const;

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
  "pt",
  "en",
]);

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
