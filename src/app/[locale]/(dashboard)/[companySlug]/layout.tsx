import { redirectTo } from "@/i18n/server-redirect";
import { requireCompanyContext } from "@/lib/auth/guards";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import {
  isEmployeeDesktopExemptPath,
  RESERVED_COMPANY_SLUGS,
  ROUTES,
} from "@/config/constants";
import { isClientRole } from "@/types/enums";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AiAssistantDock } from "@/components/features/ai/ai-assistant-dock";
import { headers } from "next/headers";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}

const SLUG_TO_AUTH_ROUTE: Record<string, string> = {
  login: ROUTES.login,
  register: ROUTES.register,
  onboarding: ROUTES.onboarding,
  checkout: ROUTES.checkout,
  features: ROUTES.features,
  pricing: ROUTES.pricing,
  contact: ROUTES.contact,
  demo: ROUTES.demo,
  reset: "/reset",
  "update-password": "/update-password",
};

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { companySlug } = await params;

  if (RESERVED_COMPANY_SLUGS.has(companySlug)) {
    if (companySlug === "super-admin" || companySlug === "admin") {
      await redirectTo(ROUTES.superAdmin);
    }
    const authRoute = SLUG_TO_AUTH_ROUTE[companySlug];
    if (authRoute) {
      await redirectTo(authRoute);
    }
    await redirectTo(ROUTES.home);
  }

  const ctx = await requireCompanyContext({ slug: companySlug });

  const sessionUser = await getSession();
  if (sessionUser && (await isPlatformAdmin(sessionUser.id))) {
    await redirectTo(ROUTES.superAdmin);
  }

  if (ctx.membership.role === "employee") {
    const headerList = await headers();
    const requestPath =
      headerList.get("x-pathname") ??
      headerList.get("x-url")?.split("?")[0]?.replace(/^https?:\/\/[^/]+/, "") ??
      "";
    const normalizedPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
    if (!isEmployeeDesktopExemptPath(normalizedPath, companySlug)) {
      await redirectTo(ROUTES.mobile(companySlug));
    }
  }

  if (isClientRole(ctx.membership.role)) {
    await redirectTo(ROUTES.clientPortal(companySlug));
  }

  const allMemberships = await getUserCompanies(ctx.profile.id);
  const userCompanies = allMemberships
    .map((m) => {
      const company = resolveMembershipCompany(m.company);
      if (!company) return null;
      return { id: company.id, name: company.name, slug: company.slug };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <DashboardShell ctx={ctx} userCompanies={userCompanies}>
      {children}
      <AiAssistantDock slug={companySlug} role={ctx.membership.role} />
    </DashboardShell>
  );
}
