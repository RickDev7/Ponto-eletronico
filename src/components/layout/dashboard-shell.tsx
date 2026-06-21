"use client";

import { ThemePreferenceSync } from "@/components/theme";
import { AppShellContent as AppShell } from "@/components/design-system/layout/app-shell-content";
import { AppShellLayout } from "@/components/design-system/layout/shell";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { CompanyContext } from "@/types/database";

interface ShellCompany {
  id: string;
  name: string;
  slug: string;
}

interface DashboardShellProps {
  ctx: CompanyContext;
  userCompanies: ShellCompany[];
  children: React.ReactNode;
}

/** Client layout frame — sidebar provider, header, scrollable main. */
export function DashboardShell({
  ctx,
  userCompanies,
  children,
}: DashboardShellProps) {
  return (
    <>
      <ThemePreferenceSync profileTheme={ctx.profile.theme} />
      <AppShellLayout
        defaultSidebarCollapsed={false}
        sidebar={<AppSidebar ctx={ctx} userCompanies={userCompanies} />}
        header={<AppHeader ctx={ctx} userCompanies={userCompanies} />}
        footer={
          <BottomNav slug={ctx.company.slug} role={ctx.membership.role} />
        }
      >
        <AppShell>{children}</AppShell>
      </AppShellLayout>
    </>
  );
}
