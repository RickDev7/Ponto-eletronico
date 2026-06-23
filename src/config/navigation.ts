import type { MemberRole } from "@/types";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Target,
  UserCircle2,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  type: "item";
  titleKey: string;
  path: string;
  icon: LucideIcon;
  minRole: MemberRole;
}

export interface NavGroupChild {
  titleKey: string;
  path: string;
}

export interface NavGroup {
  type: "group";
  titleKey: string;
  icon: LucideIcon;
  minRole: MemberRole;
  basePath: string;
  children: NavGroupChild[];
}

export interface NavSection {
  type: "section";
  titleKey: string;
}

export type NavEntry = NavItem | NavGroup | NavSection;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

export function isNavSection(entry: NavEntry): entry is NavSection {
  return entry.type === "section";
}

const NAV_DEFINITIONS: Array<
  | { type: "section"; titleKey: string }
  | { type: "item"; titleKey: string; href: (s: string) => string; icon: LucideIcon; minRole: MemberRole }
  | { type: "group"; titleKey: string; icon: LucideIcon; minRole: MemberRole; basePath: (s: string) => string; children: Array<{ titleKey: string; href: (s: string) => string }> }
> = [
  { type: "section", titleKey: "sectionOverview" },
  { type: "item", titleKey: "dashboard", href: (s) => `/${s}`, icon: LayoutDashboard, minRole: "employee" },
  { type: "item", titleKey: "myTasks", href: (s) => `/${s}/mobile`, icon: UserCircle2, minRole: "employee" },
  { type: "item", titleKey: "tasks", href: (s) => `/${s}/tasks`, icon: ClipboardList, minRole: "employee" },
  { type: "section", titleKey: "sectionCommercial" },
  {
    type: "group",
    titleKey: "crm",
    icon: Target,
    minRole: "supervisor",
    basePath: (s) => `/${s}/commercial`,
    children: [
      { titleKey: "crmOverview", href: (s) => `/${s}/commercial` },
      { titleKey: "crmPipeline", href: (s) => `/${s}/commercial/pipeline` },
      { titleKey: "crmLeads", href: (s) => `/${s}/crm/leads` },
      { titleKey: "crmContacts", href: (s) => `/${s}/crm/contacts` },
      { titleKey: "crmClients", href: (s) => `/${s}/clients` },
      { titleKey: "crmQuotes", href: (s) => `/${s}/finance/quotes` },
      { titleKey: "crmContracts", href: (s) => `/${s}/finance/contracts` },
    ],
  },
  { type: "section", titleKey: "sectionOperations" },
  {
    type: "group",
    titleKey: "operations",
    icon: ClipboardList,
    minRole: "supervisor",
    basePath: (s) => `/${s}/operations`,
    children: [
      { titleKey: "operationsOverview", href: (s) => `/${s}/operations` },
      { titleKey: "operationsWorkOrders", href: (s) => `/${s}/operations/work-orders` },
      { titleKey: "operationsProperties", href: (s) => `/${s}/operations/properties` },
      { titleKey: "operationsServices", href: (s) => `/${s}/operations/services` },
      { titleKey: "operationsScheduling", href: (s) => `/${s}/operations/scheduling` },
      { titleKey: "operationsRoutes", href: (s) => `/${s}/operations/routes` },
    ],
  },
  { type: "section", titleKey: "sectionWorkforce" },
  {
    type: "group",
    titleKey: "workforce",
    icon: Briefcase,
    minRole: "supervisor",
    basePath: (s) => `/${s}/workforce`,
    children: [
      { titleKey: "workforcePlanning", href: (s) => `/${s}/workforce/planning` },
      { titleKey: "workforceEmployees", href: (s) => `/${s}/workforce/employees` },
      { titleKey: "workforceTeams", href: (s) => `/${s}/workforce/teams` },
      { titleKey: "workforceSkills", href: (s) => `/${s}/workforce/skills` },
      { titleKey: "workforceAvailability", href: (s) => `/${s}/workforce/availability` },
      { titleKey: "workforceVacations", href: (s) => `/${s}/workforce/vacations` },
      { titleKey: "workforceMessages", href: (s) => `/${s}/workforce/messages` },
      { titleKey: "workforceAbsences", href: (s) => `/${s}/workforce/absences` },
      { titleKey: "workforceDocuments", href: (s) => `/${s}/workforce/documents` },
      { titleKey: "workforceTimeAccount", href: (s) => `/${s}/workforce/time-account` },
    ],
  },
  { type: "section", titleKey: "sectionResources" },
  {
    type: "group",
    titleKey: "assets",
    icon: Package,
    minRole: "supervisor",
    basePath: (s) => `/${s}/assets`,
    children: [
      { titleKey: "assetsOverview", href: (s) => `/${s}/assets` },
      { titleKey: "workforceVehicles", href: (s) => `/${s}/workforce/vehicles` },
      { titleKey: "operationsEquipment", href: (s) => `/${s}/operations/equipment` },
      { titleKey: "operationsMaterials", href: (s) => `/${s}/operations/materials` },
    ],
  },
  { type: "section", titleKey: "sectionFinance" },
  {
    type: "group",
    titleKey: "finance",
    icon: Wallet,
    minRole: "supervisor",
    basePath: (s) => `/${s}/finance`,
    children: [
      { titleKey: "financeOverview", href: (s) => `/${s}/finance` },
      { titleKey: "financeRevenue", href: (s) => `/${s}/finance/revenue` },
      { titleKey: "financeInvoices", href: (s) => `/${s}/finance/invoices` },
      { titleKey: "financePayments", href: (s) => `/${s}/finance/payments` },
      { titleKey: "financeCashflow", href: (s) => `/${s}/finance/cashflow` },
      { titleKey: "financeCosts", href: (s) => `/${s}/finance/costs` },
      { titleKey: "financeProfitability", href: (s) => `/${s}/finance/profitability` },
      { titleKey: "financeForecast", href: (s) => `/${s}/finance/forecast` },
    ],
  },
  { type: "section", titleKey: "sectionInsights" },
  {
    type: "group",
    titleKey: "analytics",
    icon: BarChart3,
    minRole: "supervisor",
    basePath: (s) => `/${s}/analytics`,
    children: [
      { titleKey: "analyticsOverview", href: (s) => `/${s}/analytics` },
      { titleKey: "analyticsExecutive", href: (s) => `/${s}/analytics/executive` },
      { titleKey: "analyticsOperational", href: (s) => `/${s}/analytics/operational` },
      { titleKey: "analyticsFinancial", href: (s) => `/${s}/analytics/financial` },
    ],
  },
  { type: "item", titleKey: "reports", href: (s) => `/${s}/reports`, icon: FileText, minRole: "supervisor" },
  { type: "item", titleKey: "automations", href: (s) => `/${s}/automations`, icon: Zap, minRole: "supervisor" },
  { type: "item", titleKey: "aiAssistant", href: (s) => `/${s}/assistant`, icon: Sparkles, minRole: "supervisor" },
  { type: "section", titleKey: "sectionSystem" },
  { type: "item", titleKey: "settings", href: (s) => `/${s}/settings`, icon: Settings, minRole: "supervisor" },
];

/** @deprecated Use getDashboardNavEntries */
export function getDashboardNav(slug: string): NavItem[] {
  return getDashboardNavEntries(slug).filter((e): e is NavItem => !isNavGroup(e));
}

export function getDashboardNavEntries(slug: string): NavEntry[] {
  return NAV_DEFINITIONS.map((def) => {
    if (def.type === "section") {
      return { type: "section" as const, titleKey: def.titleKey };
    }
    if (def.type === "group") {
      return {
        type: "group" as const,
        titleKey: def.titleKey,
        icon: def.icon,
        minRole: def.minRole,
        basePath: def.basePath(slug),
        children: def.children.map((c) => ({
          titleKey: c.titleKey,
          path: c.href(slug),
        })),
      };
    }
    return {
      type: "item" as const,
      titleKey: def.titleKey,
      path: def.href(slug),
      icon: def.icon,
      minRole: def.minRole,
    };
  });
}

/** Resolve page title + subtitle from pathname for the app header. */
const CRM_CHILD_PREFIXES = ["crm", "commercial", "clients", "finance/quotes", "finance/contracts"] as const;
const ASSETS_CHILD_PREFIXES = [
  "assets",
  "workforce/vehicles",
  "operations/equipment",
  "operations/materials",
] as const;

export function resolvePageHeader(
  pathname: string,
  slug: string,
  t: (key: string) => string,
): { title: string; subtitle?: string } {
  const nav = getDashboardNavEntries(slug);
  for (const entry of nav) {
    if (isNavGroup(entry)) {
      const underBase =
        pathname === entry.basePath || pathname.startsWith(`${entry.basePath}/`);
      const underCrmChild =
        entry.titleKey === "crm" &&
        CRM_CHILD_PREFIXES.some((seg) => {
          const p = `/${slug}/${seg}`;
          return pathname === p || pathname.startsWith(`${p}/`);
        });
      const underAssetsChild =
        entry.titleKey === "assets" &&
        ASSETS_CHILD_PREFIXES.some((seg) => {
          const p = `/${slug}/${seg}`;
          return pathname === p || pathname.startsWith(`${p}/`);
        });

      if (underBase || underCrmChild || underAssetsChild) {
        for (const child of entry.children) {
          if (pathname === child.path || pathname.startsWith(`${child.path}/`)) {
            return { title: t(child.titleKey), subtitle: t(entry.titleKey) };
          }
        }
        return { title: t(entry.titleKey) };
      }
    } else if (pathname === entry.path || (entry.path !== `/${slug}` && pathname.startsWith(entry.path))) {
      return { title: t(entry.titleKey) };
    }
  }
  if (pathname === `/${slug}` || pathname === `/${slug}/`) {
    return { title: t("dashboard"), subtitle: t("executiveSubtitle") };
  }
  return { title: t("dashboard") };
}
