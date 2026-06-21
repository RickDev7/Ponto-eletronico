import {
  Building2,
  CreditCard,
  Flag,
  Headphones,
  LayoutDashboard,
  ScrollText,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/config/constants";

export interface PlatformNavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
}

export const PLATFORM_NAV: PlatformNavItem[] = [
  { titleKey: "overview", href: ROUTES.superAdmin, icon: LayoutDashboard },
  { titleKey: "tenants", href: ROUTES.superAdminTenants, icon: Building2 },
  { titleKey: "subscriptions", href: ROUTES.superAdminSubscriptions, icon: CreditCard },
  { titleKey: "support", href: ROUTES.superAdminSupport, icon: Headphones },
  { titleKey: "logs", href: ROUTES.superAdminLogs, icon: ScrollText },
  { titleKey: "featureFlags", href: ROUTES.superAdminFeatureFlags, icon: Flag },
  { titleKey: "audit", href: ROUTES.superAdminAudit, icon: Shield },
];

export function resolvePlatformHeader(
  pathname: string,
  t: (key: string) => string,
): { title: string } {
  const item = PLATFORM_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  return { title: t(item?.titleKey ?? "overview") };
}
