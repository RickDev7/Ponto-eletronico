"use client";

import { useTranslations } from "next-intl";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { PortalContractRow } from "@/lib/client-portal/load-portal-data";
import {
  EmptyState,
  OperationsPage,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PortalContractsViewProps {
  contracts: PortalContractRow[];
  locale: string;
}

export function PortalContractsView({
  contracts,
  locale,
}: PortalContractsViewProps) {
  const t = useTranslations("clientPortal.contracts");
  const tf = useTranslations("finance.contracts");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      {contracts.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.title")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead>{t("columns.frequency")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contract.title}</p>
                      {contract.service_description ? (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {contract.service_description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contract.start_date, locale)}
                    {contract.end_date
                      ? ` – ${formatDate(contract.end_date, locale)}`
                      : ""}
                  </TableCell>
                  <TableCell>{tf(`frequency.${contract.frequency}`)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(contract.amount_cents, contract.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={contract.is_active ? "success" : "neutral"}
                      label={contract.is_active ? t("active") : t("inactive")}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </OperationsPage>
  );
}
