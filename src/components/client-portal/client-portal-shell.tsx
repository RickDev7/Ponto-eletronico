"use client";

import { ThemePreferenceSync } from "@/components/theme";
import { AppShellContent as AppShell } from "@/components/design-system/layout/app-shell-content";
import { AppShellLayout } from "@/components/design-system/layout/shell";
import { AppHeader } from "@/components/layout/app-header";
import { ClientPortalSidebar } from "@/components/client-portal/client-portal-sidebar";
import { ClientPortalBottomNav } from "@/components/client-portal/client-portal-bottom-nav";
import type { ClientPortalContext } from "@/types/database";

interface ShellCompany {
  id: string;
  name: string;
  slug: string;
}

interface ClientPortalShellProps {
  ctx: ClientPortalContext;
  userCompanies: ShellCompany[];
  children: React.ReactNode;
}

export function ClientPortalShell({
  ctx,
  userCompanies,
  children,
}: ClientPortalShellProps) {
  return (
    <>
      <ThemePreferenceSync profileTheme={ctx.profile.theme} />
      <AppShellLayout
        defaultSidebarCollapsed={false}
        sidebar={
          <ClientPortalSidebar ctx={ctx} userCompanies={userCompanies} />
        }
        header={<AppHeader ctx={ctx} userCompanies={userCompanies} />}
        footer={
          <ClientPortalBottomNav slug={ctx.company.slug} />
        }
      >
        <AppShell>{children}</AppShell>
      </AppShellLayout>
    </>
  );
}
