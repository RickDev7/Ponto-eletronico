"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { hasMinRole } from "@/types/enums";
import { getDashboardNavEntries, isNavGroup } from "@/config/navigation";
import type { CompanyContext } from "@/types/database";
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavGroup,
  SidebarNavItem,
} from "@/components/design-system/layout";
import { CompanySwitcher } from "@/components/layout/company-switcher";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface AppSidebarProps {
  ctx: CompanyContext;
  userCompanies?: Company[];
}

const EMPLOYEE_ONLY_NAV = new Set(["tasks", "calendar"]);

export function AppSidebar({ ctx, userCompanies = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const nav = getDashboardNavEntries(ctx.company.slug).filter((item) => {
    if (!hasMinRole(ctx.membership.role, item.minRole)) return false;
    if (
      ctx.membership.role !== "employee" &&
      EMPLOYEE_ONLY_NAV.has(item.titleKey)
    ) {
      return false;
    }
    return true;
  });

  const otherCompanies = userCompanies.filter((c) => c.id !== ctx.company.id);

  return (
    <Sidebar>
      <SidebarHeader>
        <CompanySwitcher ctx={ctx} otherCompanies={otherCompanies} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {nav.map((entry) => {
          if (isNavGroup(entry)) {
            return (
              <SidebarNavGroup
                key={entry.basePath}
                icon={entry.icon}
                label={t(entry.titleKey)}
                basePath={entry.basePath}
                pathname={pathname}
                items={entry.children.map((child) => ({
                  ...child,
                  label: t(child.titleKey),
                }))}
              />
            );
          }

          const isActive =
            pathname === entry.path ||
            (entry.path !== `/${ctx.company.slug}` && pathname.startsWith(entry.path));

          return (
            <SidebarNavItem
              key={entry.path}
              href={entry.path}
              icon={entry.icon}
              label={t(entry.titleKey)}
              isActive={isActive}
            />
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex justify-center">
          <SidebarCollapseTrigger className="size-7" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
