import { notFound } from "next/navigation";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { EmployeeServiceDetailView } from "@/components/employee/employee-service-detail-view";
import { loadExecutionContext } from "@/lib/field-execution/load-execution-context";

interface PageProps {
  params: Promise<{ companySlug: string; taskId: string }>;
}

export default async function MobileServicePage({ params }: PageProps) {
  const { companySlug, taskId } = await params;
  const ctx = await requireEmployeeContext(companySlug);

  const execution = await loadExecutionContext(ctx.company.id, ctx.employee.id, taskId);
  if (!execution?.isAssigned) notFound();

  return (
    <div className="p-4">
      <EmployeeServiceDetailView slug={companySlug} taskId={taskId} context={execution} />
    </div>
  );
}
