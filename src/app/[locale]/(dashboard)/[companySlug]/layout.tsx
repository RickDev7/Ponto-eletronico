import { redirect } from "@/i18n/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getUserCompanies } from "@/lib/auth/session";
import { RESERVED_COMPANY_SLUGS, ROUTES } from "@/config/constants";
import { DashboardShell } from "@/components/layout/dashboard-shell";

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
    const authRoute = SLUG_TO_AUTH_ROUTE[companySlug];
    if (authRoute) {
      redirect(authRoute);
    }
    redirect(ROUTES.home);
  }

  const ctx = await requireCompanyContext({ slug: companySlug });

  const allMemberships = await getUserCompanies(ctx.profile.id);
  const userCompanies = allMemberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    slug: m.company.slug,
  }));

  return (
    <DashboardShell ctx={ctx} userCompanies={userCompanies}>
      {children}
    </DashboardShell>
  );
}
