import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { loadTeams } from "@/lib/operations/load-operations-data";
import { loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import {
  loadAdminMessageThread,
  loadAdminMessageThreads,
} from "@/lib/workforce/load-employee-messages-admin";
import { WorkforceMessagesView } from "@/components/features/workforce/workforce-messages-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ thread?: string }>;
}

export default async function WorkforceMessagesPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { thread: selectedThreadId } = await searchParams;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [threads, employees, teams, threadMessages] = await Promise.all([
    loadAdminMessageThreads(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
    loadTeams(ctx.company.id),
    selectedThreadId
      ? loadAdminMessageThread(ctx.company.id, selectedThreadId)
      : Promise.resolve([]),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceMessagesView
        slug={companySlug}
        threads={threads}
        threadMessages={threadMessages}
        selectedThreadId={selectedThreadId ?? null}
        employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
        teams={teams}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
