import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/config/constants";

export interface ClientPortalNavItem {
  titleKey: string;
  path: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function getClientPortalNavEntries(slug: string): ClientPortalNavItem[] {
  return [
    {
      titleKey: "overview",
      path: ROUTES.clientPortal(slug),
      icon: LayoutDashboard,
      exact: true,
    },
    {
      titleKey: "contracts",
      path: ROUTES.clientPortalContracts(slug),
      icon: ScrollText,
    },
    {
      titleKey: "invoices",
      path: ROUTES.clientPortalInvoices(slug),
      icon: Receipt,
    },
    {
      titleKey: "reports",
      path: ROUTES.clientPortalReports(slug),
      icon: FileText,
    },
    {
      titleKey: "services",
      path: ROUTES.clientPortalServices(slug),
      icon: Wrench,
    },
    {
      titleKey: "documents",
      path: ROUTES.clientPortalDocuments(slug),
      icon: FolderOpen,
    },
  ];
}
