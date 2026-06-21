import { redirectTo } from "@/i18n/server-redirect";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { LandingPageContent } from "@/components/marketing/landing-page";

export default async function LandingPage() {
  const user = await getSession();

  if (user) {
    const companies = await getUserCompanies(user.id);
    const href = await resolvePostAuthRedirect(user.id, companies);
    await redirectTo(href);
  }

  return <LandingPageContent />;
}
