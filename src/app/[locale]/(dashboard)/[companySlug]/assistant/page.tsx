import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { loadRecentAiInsights } from "@/lib/ai/run-capability";
import { isAiProviderConfigured } from "@/lib/ai/provider";
import { AiAssistantView } from "@/components/features/ai/ai-assistant-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function AiAssistantPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  await getLocale();

  const [recentInsights, aiConfigured] = await Promise.all([
    loadRecentAiInsights(ctx.company.id, 12),
    Promise.resolve(isAiProviderConfigured()),
  ]);

  return (
    <AppShellPage size="fluid">
      <AiAssistantView
        slug={companySlug}
        aiConfigured={aiConfigured}
        recentInsights={recentInsights as never}
      />
    </AppShellPage>
  );
}
