import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { hasMinRole, isOwnerRole } from "@/types/enums";
import { getCompanyBillingState } from "@/lib/billing/enforcement";
import { createClient } from "@/lib/supabase/server";
import { getCompanyMembers } from "@/actions/settings/actions";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { SettingsView } from "@/components/features/settings/settings-view";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

export default async function SettingsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug });
  const isAdmin = isOwnerRole(ctx.membership.role);
  const isSupervisorPlus = hasMinRole(ctx.membership.role, "supervisor");

  const supabase = await createClient();
  const companyId = ctx.company.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [membersResult, billing] = await Promise.all([
    isAdmin ? getCompanyMembers(companySlug) : Promise.resolve(null),
    isAdmin ? getCompanyBillingState(companyId) : Promise.resolve(null),
  ]);

  const members = membersResult?.success ? membersResult.data : [];

  return (
    <AppShellPage size="fluid">
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsView
          slug={companySlug}
          company={ctx.company}
          profile={ctx.profile}
          membership={ctx.membership}
          members={members}
          isAdmin={isAdmin}
          isSupervisorPlus={isSupervisorPlus}
          billing={billing}
          userEmail={user?.email ?? ""}
        />
      </Suspense>
    </AppShellPage>
  );
}
