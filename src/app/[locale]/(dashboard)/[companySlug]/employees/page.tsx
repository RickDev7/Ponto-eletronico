import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { AppShellPage } from "@/components/design-system/app-shell";
import { EmployeesTable } from "@/components/features/employees/employees-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employees");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function EmployeesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", ctx.company.id)
    .neq("status", "terminated")
    .order("full_name");

  return (
    <AppShellPage size="fluid" className="space-y-2">
      <EmployeesTable
        slug={companySlug}
        employees={employees ?? []}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
