import { redirectTo } from "@/i18n/server-redirect";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { RESERVED_COMPANY_SLUGS, ROUTES } from "@/config/constants";
import { ClientPortalShell } from "@/components/client-portal/client-portal-shell";

interface PortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}

const SLUG_TO_AUTH_ROUTE: Record<string, string> = {
  login: ROUTES.login,
  register: ROUTES.register,
  onboarding: ROUTES.onboarding,
};

export default async function ClientPortalLayout({
  children,
  params,
}: PortalLayoutProps) {
  const { companySlug } = await params;

  if (RESERVED_COMPANY_SLUGS.has(companySlug)) {
    const authRoute = SLUG_TO_AUTH_ROUTE[companySlug];
    if (authRoute) {
      await redirectTo(authRoute);
    }
    await redirectTo(ROUTES.home);
  }

  const ctx = await requireClientPortalContext(companySlug);

  const sessionUser = await getSession();
  if (sessionUser && (await isPlatformAdmin(sessionUser.id))) {
    await redirectTo(ROUTES.superAdmin);
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
    <ClientPortalShell ctx={ctx} userCompanies={userCompanies}>
      {children}
    </ClientPortalShell>
  );
}
