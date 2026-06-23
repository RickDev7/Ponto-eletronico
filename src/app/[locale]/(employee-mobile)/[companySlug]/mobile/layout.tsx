import type { Metadata } from "next";
import { redirectTo } from "@/i18n/server-redirect";
import { requireEmployeeMobileAccess } from "@/lib/auth/guards";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { getSession } from "@/lib/auth/session";
import { loadEmployeeInboxUnreadCount } from "@/lib/employee/load-employee-notifications";
import { RESERVED_COMPANY_SLUGS, ROUTES } from "@/config/constants";
import { MobileEmployeeShell } from "@/components/mobile/mobile-employee-shell";
import { MobileAccessView } from "@/components/features/mobile/mobile-access-view";

interface MobileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug } = await params;
  return {
    manifest: `/api/pwa/manifest/${companySlug}`,
  };
}

export default async function MobileLayout({
  children,
  params,
}: MobileLayoutProps) {
  const { companySlug } = await params;

  if (RESERVED_COMPANY_SLUGS.has(companySlug)) {
    await redirectTo(ROUTES.home);
  }

  const sessionUser = await getSession();
  if (sessionUser && (await isPlatformAdmin(sessionUser.id))) {
    await redirectTo(ROUTES.superAdmin);
  }

  const ctx = await requireEmployeeMobileAccess(companySlug);

  if (!ctx.employee) {
    return (
      <div className="min-h-svh bg-[var(--mobile-bg,#F8FAFC)]" data-surface="employee-mobile">
        <MobileAccessView
          slug={companySlug}
          reason="profile_missing"
          mobilePath={ROUTES.mobile(companySlug)}
        />
      </div>
    );
  }

  const unreadNotifications = await loadEmployeeInboxUnreadCount(
    ctx.company.id,
    ctx.employee.id,
  );

  return (
    <MobileEmployeeShell
      ctx={{ ...ctx, employee: ctx.employee }}
      companySlug={companySlug}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </MobileEmployeeShell>
  );
}
