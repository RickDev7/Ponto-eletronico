import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { AppShellPage } from "@/components/design-system/layout";
import { FieldExecutionView } from "@/components/features/field-execution/field-execution-view";
import { loadExecutionContext } from "@/lib/field-execution/load-execution-context";

interface PageProps {
  params: Promise<{ companySlug: string; taskId: string }>;
}

export default async function FieldExecutePage({ params }: PageProps) {
  const { companySlug, taskId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug });

  if (!ctx.employee) notFound();

  const execution = await loadExecutionContext(ctx.company.id, ctx.employee.id, taskId);
  if (!execution?.isAssigned) notFound();

  return (
    <AppShellPage size="default">
      <FieldExecutionView slug={companySlug} taskId={taskId} context={execution} />
    </AppShellPage>
  );
}
