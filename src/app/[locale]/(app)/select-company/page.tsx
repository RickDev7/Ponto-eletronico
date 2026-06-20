import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { SelectCompanyView } from "@/components/features/company/select-company-view";
import { OnboardingAuthBar } from "@/components/onboarding/onboarding-auth-bar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("selectCompany");
  return { title: t("title") };
}

export default async function SelectCompanyPage() {
  const user = await getSession();
  if (!user) {
    redirect(ROUTES.login);
  }

  const memberships = await getUserCompanies(user.id);
  if (memberships.length === 0) {
    redirect(ROUTES.onboarding);
  }
  if (memberships.length === 1) {
    const company = resolveMembershipCompany(memberships[0]!.company);
    if (company?.slug) redirect(ROUTES.dashboard(company.slug));
    redirect(ROUTES.onboarding);
  }

  const companies = memberships
    .map((m) => {
      const company = resolveMembershipCompany(m.company);
      if (!company) return null;
      return {
        id: company.id,
        slug: company.slug,
        name: company.name,
        role: m.role,
        logoUrl: company.logo_url,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="relative flex min-h-svh flex-col bg-zinc-950">
      <OnboardingAuthBar />
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-20">
        <SelectCompanyView companies={companies} />
      </div>
    </div>
  );
}
