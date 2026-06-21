"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getClientPortalNavEntries } from "@/config/client-portal-navigation";
import type { ClientPortalContext } from "@/types/database";
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavItem,
} from "@/components/design-system/layout";
import { CompanySwitcher } from "@/components/layout/company-switcher";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface ClientPortalSidebarProps {
  ctx: ClientPortalContext;
  userCompanies?: Company[];
}

export function ClientPortalSidebar({
  ctx,
  userCompanies = [],
}: ClientPortalSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("clientPortal.nav");
  const nav = getClientPortalNavEntries(ctx.company.slug);
  const otherCompanies = userCompanies.filter((c) => c.id !== ctx.company.id);

  return (
    <Sidebar>
      <SidebarHeader>
        <CompanySwitcher ctx={ctx} otherCompanies={otherCompanies} />
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          {ctx.client.name}
        </p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {nav.map((item) => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname.startsWith(item.path);

          return (
            <SidebarNavItem
              key={item.path}
              href={item.path}
              icon={item.icon}
              label={t(item.titleKey)}
              isActive={isActive}
            />
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarCollapseTrigger />
      </SidebarFooter>
    </Sidebar>
  );
}
