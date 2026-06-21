import { redirectTo } from "@/i18n/server-redirect";
import { requireCompanyContext } from "@/lib/auth/guards";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { getSession } from "@/lib/auth/session";
import { RESERVED_COMPANY_SLUGS, ROUTES } from "@/config/constants";
import { MobileEmployeeShell } from "@/components/mobile/mobile-employee-shell";

interface MobileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
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

  const ctx = await requireCompanyContext({ slug: companySlug });

  if (ctx.membership.role === "client") {
    await redirectTo(ROUTES.clientPortal(companySlug));
  }

  if (ctx.membership.role !== "employee") {
    await redirectTo(ROUTES.dashboard(companySlug));
  }

  return (
    <MobileEmployeeShell ctx={ctx} companySlug={companySlug}>
      {children}
    </MobileEmployeeShell>
  );
}
