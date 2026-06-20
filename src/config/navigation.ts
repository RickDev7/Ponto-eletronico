import type { MemberRole } from "@/types";
import {
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Target,
  UserCircle2,
  Wallet,
  CalendarDays,
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

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

const NAV_DEFINITIONS: Array<
  | { type: "item"; titleKey: string; href: (s: string) => string; icon: LucideIcon; minRole: MemberRole }
  | { type: "group"; titleKey: string; icon: LucideIcon; minRole: MemberRole; basePath: (s: string) => string; children: Array<{ titleKey: string; href: (s: string) => string }> }
> = [
  { type: "item", titleKey: "dashboard", href: (s) => `/${s}`, icon: LayoutDashboard, minRole: "employee" },
  { type: "item", titleKey: "myTasks", href: (s) => `/${s}/minha-area`, icon: UserCircle2, minRole: "employee" },
  { type: "item", titleKey: "tasks", href: (s) => `/${s}/tasks`, icon: ClipboardList, minRole: "employee" },
  { type: "item", titleKey: "calendar", href: (s) => `/${s}/calendar`, icon: CalendarDays, minRole: "employee" },
  {
    type: "group",
    titleKey: "crm",
    icon: Target,
    minRole: "supervisor",
    basePath: (s) => `/${s}/crm`,
    children: [
      { titleKey: "crmDashboard", href: (s) => `/${s}/crm` },
      { titleKey: "crmLeads", href: (s) => `/${s}/crm/leads` },
      { titleKey: "crmContacts", href: (s) => `/${s}/crm/contacts` },
      { titleKey: "crmCompanies", href: (s) => `/${s}/crm/companies` },
      { titleKey: "crmPipeline", href: (s) => `/${s}/crm/pipeline` },
    ],
  },
  {
    type: "group",
    titleKey: "operations",
    icon: ClipboardList,
    minRole: "supervisor",
    basePath: (s) => `/${s}/operations`,
    children: [
      { titleKey: "operationsClients", href: (s) => `/${s}/clients` },
      { titleKey: "operationsProperties", href: (s) => `/${s}/operations/properties` },
      { titleKey: "operationsServices", href: (s) => `/${s}/operations/services` },
      { titleKey: "operationsScheduling", href: (s) => `/${s}/operations/scheduling` },
    ],
  },
  {
    type: "group",
    titleKey: "workforce",
    icon: Briefcase,
    minRole: "supervisor",
    basePath: (s) => `/${s}/workforce`,
    children: [
      { titleKey: "workforcePlanning", href: (s) => `/${s}/workforce/planning` },
      { titleKey: "workforceEmployees", href: (s) => `/${s}/workforce/employees` },
      { titleKey: "workforceShifts", href: (s) => `/${s}/workforce/shifts` },
      { titleKey: "workforceVacations", href: (s) => `/${s}/workforce/vacations` },
      { titleKey: "workforceAbsences", href: (s) => `/${s}/workforce/absences` },
      { titleKey: "workforceTimeAccount", href: (s) => `/${s}/workforce/time-account` },
    ],
  },
  {
    type: "group",
    titleKey: "finance",
    icon: Wallet,
    minRole: "supervisor",
    basePath: (s) => `/${s}/finance`,
    children: [
      { titleKey: "financeOverview", href: (s) => `/${s}/finance` },
      { titleKey: "financeInvoices", href: (s) => `/${s}/finance/invoices` },
      { titleKey: "financePayments", href: (s) => `/${s}/finance/payments` },
      { titleKey: "financeCashflow", href: (s) => `/${s}/finance/cashflow` },
      { titleKey: "financeContracts", href: (s) => `/${s}/finance/contracts` },
      { titleKey: "financeCosts", href: (s) => `/${s}/finance/costs` },
      { titleKey: "financeProfitability", href: (s) => `/${s}/finance/profitability` },
      { titleKey: "financeForecast", href: (s) => `/${s}/finance/forecast` },
    ],
  },
  { type: "item", titleKey: "reports", href: (s) => `/${s}/reports`, icon: FileText, minRole: "supervisor" },
  { type: "item", titleKey: "automations", href: (s) => `/${s}/automations`, icon: Zap, minRole: "supervisor" },
  { type: "item", titleKey: "settings", href: (s) => `/${s}/settings`, icon: Settings, minRole: "supervisor" },
];

/** @deprecated Use getDashboardNavEntries */
export function getDashboardNav(slug: string): NavItem[] {
  return getDashboardNavEntries(slug).filter((e): e is NavItem => !isNavGroup(e));
}

export function getDashboardNavEntries(slug: string): NavEntry[] {
  return NAV_DEFINITIONS.map((def) => {
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
export function resolvePageHeader(
  pathname: string,
  slug: string,
  t: (key: string) => string,
): { title: string; subtitle?: string } {
  const nav = getDashboardNavEntries(slug);
  for (const entry of nav) {
    if (isNavGroup(entry)) {
      if (pathname === entry.basePath || pathname.startsWith(`${entry.basePath}/`)) {
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
