"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { hasMinRole } from "@/types/enums";
import {
  getDashboardNavEntries,
  isNavGroup,
  isNavSection,
} from "@/config/navigation";
import type { CompanyContext } from "@/types/database";
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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

const EMPLOYEE_ONLY_NAV = new Set(["tasks", "calendar", "myTasks"]);

export function AppSidebar({ ctx, userCompanies = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const nav = getDashboardNavEntries(ctx.company.slug).filter((item) => {
    if (isNavSection(item)) return true;
    if (!hasMinRole(ctx.membership.role, item.minRole)) return false;
    if (
      ctx.membership.role !== "employee" &&
      !isNavGroup(item) &&
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

      <SidebarContent className="px-2 py-2">
        {nav.map((entry, index) => {
          if (isNavSection(entry)) {
            const hasVisibleItems = nav.slice(index + 1).some((next) => {
              if (isNavSection(next)) return false;
              if (!hasMinRole(ctx.membership.role, next.minRole)) return false;
              return true;
            });
            if (!hasVisibleItems) return null;
            return (
              <SidebarGroup key={entry.titleKey} label={t(entry.titleKey)} />
            );
          }

          if (isNavGroup(entry)) {
            if (!hasMinRole(ctx.membership.role, entry.minRole)) return null;
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
            (entry.path !== `/${ctx.company.slug}` &&
              pathname.startsWith(entry.path));

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
        <div className="flex justify-center pb-1">
          <SidebarCollapseTrigger className="size-8" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
