import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { ContactsView } from "@/components/features/crm/contacts-view";
import { loadLeadContacts, loadLeads } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CrmContactsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const [contacts, leads] = await Promise.all([
    loadLeadContacts(ctx.company.id),
    loadLeads(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <ContactsView
        slug={companySlug}
        contacts={contacts}
        leads={leads}
        canWrite={can(ctx.membership.role, "crm:write")}
      />
    </AppShellPage>
  );
}
