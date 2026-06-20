import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceDocumentsView } from "@/components/features/workforce/workforce-documents-view";
import { loadEmployeeDocuments, loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceDocumentsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const [documents, employees] = await Promise.all([
    loadEmployeeDocuments(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceDocumentsView
        slug={companySlug}
        documents={documents}
        employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
