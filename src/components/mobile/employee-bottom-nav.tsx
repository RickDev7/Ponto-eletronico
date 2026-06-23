"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { EMPLOYEE_NAV_ITEMS } from "@/components/mobile/employee-nav-config";
import { useEmployeeUnreadCount } from "@/components/mobile/employee-unread-count-provider";
import { AppFloatingNav, AppNavItem } from "@/components/mobile/app";

interface EmployeeBottomNavProps {
  slug: string;
}

export function EmployeeBottomNav({ slug }: EmployeeBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("employee.mobile.nav");
  const unreadCount = useEmployeeUnreadCount();

  return (
    <AppFloatingNav>
      {EMPLOYEE_NAV_ITEMS.map((item) => {
        const href = item.href(slug);
        const active = item.match(pathname, slug);
        const badge = item.badgeKey === "messages" ? unreadCount : undefined;

        return (
          <AppNavItem
            key={item.labelKey}
            href={href}
            active={active}
            icon={item.icon}
            label={t(item.labelKey)}
            badge={badge}
          />
        );
      })}
    </AppFloatingNav>
  );
}
