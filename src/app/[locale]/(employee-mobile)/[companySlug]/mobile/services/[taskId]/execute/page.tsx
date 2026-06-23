import { notFound } from "next/navigation";
import { redirectTo } from "@/i18n/server-redirect";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { ROUTES } from "@/config/constants";
import { MobileExecutePageClient } from "@/components/mobile/mobile-execute-page-client";
import { loadExecutionContext } from "@/lib/field-execution/load-execution-context";

interface PageProps {
  params: Promise<{ companySlug: string; taskId: string }>;
}

export default async function MobileServiceExecutePage({ params }: PageProps) {
  const { companySlug, taskId } = await params;
  const ctx = await requireEmployeeContext(companySlug);

  const execution = await loadExecutionContext(ctx.company.id, ctx.employee.id, taskId);
  if (!execution?.isAssigned) notFound();

  if (!execution.openCheckIn) {
    await redirectTo(ROUTES.mobileCheckIn(companySlug, taskId));
  }

  return (
    <MobileExecutePageClient
      slug={companySlug}
      taskId={taskId}
      initialExecution={execution}
    />
  );
}
