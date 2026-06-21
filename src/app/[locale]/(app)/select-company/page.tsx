import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { SelectCompanyView } from "@/components/features/company/select-company-view";
import { OnboardingAuthBar } from "@/components/onboarding/onboarding-auth-bar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("selectCompany");
  return { title: t("title") };
}

export default async function SelectCompanyPage() {
  const locale = await getLocale();
  const sessionUser = await getSession();
  const userId = sessionUser?.id;
  if (!userId) {
    redirect({ href: ROUTES.login, locale });
    throw new Error("Auth required");
  }

  if (await isPlatformAdmin(userId)) {
    redirect({ href: ROUTES.superAdmin, locale });
  }

  const memberships = await getUserCompanies(userId);
  if (memberships.length === 0) {
    redirect({ href: ROUTES.onboarding, locale });
  }
  if (memberships.length === 1) {
    const href = await resolvePostAuthRedirect(userId, memberships);
    redirect({ href, locale });
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
    <div className="relative flex min-h-svh flex-col bg-background">
      <OnboardingAuthBar />
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-20">
        <SelectCompanyView companies={companies} />
      </div>
    </div>
  );
}
