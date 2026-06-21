import { notFound } from "next/navigation";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { EmployeeCheckInView } from "@/components/employee/employee-check-in-view";
import { loadExecutionContext } from "@/lib/field-execution/load-execution-context";

interface PageProps {
  params: Promise<{ companySlug: string; taskId: string }>;
}

export default async function MobileCheckInPage({ params }: PageProps) {
  const { companySlug, taskId } = await params;
  const ctx = await requireEmployeeContext(companySlug);

  const execution = await loadExecutionContext(ctx.company.id, ctx.employee.id, taskId);
  if (!execution?.isAssigned) notFound();

  return <EmployeeCheckInView slug={companySlug} taskId={taskId} context={execution} />;
}
