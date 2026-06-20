"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Search } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { LeadContactRow, LeadListRow } from "@/lib/crm/leads-data";
import { LeadContactFormDialog } from "@/components/features/crm/lead-contact-form-dialog";
import {
  EmptyState,
  OperationsFilterBar,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ContactsViewProps {
  slug: string;
  contacts: LeadContactRow[];
  leads: LeadListRow[];
  canWrite: boolean;
}

export function ContactsView({ slug, contacts, leads, canWrite }: ContactsViewProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const openLeads = useMemo(
    () => leads.filter((l) => l.status !== "lost"),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return contacts.filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(query) ?? false),
    );
  }, [contacts, query]);

  function leadCompany(contact: LeadContactRow): string {
    const lead = contact.lead;
    if (!lead) return "—";
    return Array.isArray(lead) ? lead[0]?.company_name ?? "—" : lead.company_name;
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("contacts.title")}
        description={t("contacts.description")}
        actions={
          canWrite && openLeads.length > 0 ? (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              {t("contacts.new")}
            </Button>
          ) : undefined
        }
      />

      <OperationsWorkspace>
        <OperationsFilterBar>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("contacts.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </OperationsFilterBar>

        {filtered.length === 0 ? (
          <EmptyState title={t("contacts.empty")} description={t("contacts.emptyHint")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.contact")}</TableHead>
                  <TableHead>{t("form.email")}</TableHead>
                  <TableHead>{t("form.phone")}</TableHead>
                  <TableHead>{t("columns.company")}</TableHead>
                  <TableHead>{t("contacts.role")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => router.push(ROUTES.crmLead(slug, contact.lead_id))}
                  >
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{contact.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{contact.phone ?? "—"}</TableCell>
                    <TableCell>{leadCompany(contact)}</TableCell>
                    <TableCell className="text-xs">{contact.role_title ?? "—"}</TableCell>
                    <TableCell>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("contacts.primary")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OperationsWorkspace>

      {canWrite && (
        <LeadContactFormDialog
          slug={slug}
          leads={openLeads.map((l) => ({
            id: l.id,
            company_name: l.company_name,
            contact_name: l.contact_name,
          }))}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => router.refresh()}
        />
      )}
    </OperationsPage>
  );
}
