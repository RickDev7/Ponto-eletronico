"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMoney } from "@/lib/finance/utils";
import type { CrmCompanyAggregate } from "@/lib/crm/leads-data";
import { LeadStatusBadge } from "@/components/features/crm/lead-status-badge";
import type { LeadStatus } from "@/lib/validations/crm";
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

interface CompaniesViewProps {
  slug: string;
  companies: CrmCompanyAggregate[];
  locale: string;
}

export function CompaniesView({ slug, companies, locale }: CompaniesViewProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return companies.filter(
      (c) =>
        !query ||
        c.companyName.toLowerCase().includes(q) ||
        (c.city?.toLowerCase().includes(q) ?? false) ||
        (c.website?.toLowerCase().includes(q) ?? false),
    );
  }, [companies, query]);

  return (
    <OperationsPage>
      <PageHeader title={t("companies.title")} description={t("companies.description")} />

      <OperationsWorkspace>
        <OperationsFilterBar>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("companies.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </OperationsFilterBar>

        {filtered.length === 0 ? (
          <EmptyState title={t("companies.empty")} description={t("companies.emptyHint")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.company")}</TableHead>
                  <TableHead>{t("form.city")}</TableHead>
                  <TableHead>{t("companies.website")}</TableHead>
                  <TableHead>{t("companies.leads")}</TableHead>
                  <TableHead>{t("columns.value")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company) => (
                  <TableRow
                    key={company.companyName}
                    className="cursor-pointer"
                    onClick={() => router.push(ROUTES.crmLead(slug, company.latestLeadId))}
                  >
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{company.city ?? "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{company.website ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{company.leadCount}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatMoney(company.totalValueCents, "EUR", locale)}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={company.bestStatus as LeadStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
