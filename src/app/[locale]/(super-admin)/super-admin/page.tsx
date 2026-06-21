import { getLocale } from "next-intl/server";
import { loadPlatformDashboardStats } from "@/lib/platform/load-platform-data";
import { PlatformDashboardView } from "@/components/features/platform/platform-dashboard-view";
import { AppShellPage } from "@/components/design-system/layout";

export default async function SuperAdminPage() {
  const locale = await getLocale();
  const stats = await loadPlatformDashboardStats();

  return (
    <AppShellPage size="fluid">
      <PlatformDashboardView stats={stats} locale={locale} />
    </AppShellPage>
  );
}
