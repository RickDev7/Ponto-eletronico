"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, FileWarning, Receipt, ScrollText } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { PortalOverview } from "@/lib/client-portal/load-portal-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiCard,
  OperationsPage,
  PageHeader,
} from "@/components/shared";
import type { InvoiceStatus } from "@/lib/finance/utils";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import { Button } from "@/components/ui/button";

interface PortalOverviewViewProps {
  slug: string;
  clientName: string;
  data: PortalOverview;
  locale: string;
}

export function PortalOverviewView({
  slug,
  clientName,
  data,
  locale,
}: PortalOverviewViewProps) {
  const t = useTranslations("clientPortal");

  return (
    <OperationsPage>
      <PageHeader
        title={t("overview.title")}
        description={t("overview.welcome", { name: clientName })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("overview.kpis.contracts")}
          value={String(data.activeContracts)}
          icon={ScrollText}
        />
        <KpiCard
          label={t("overview.kpis.openInvoices")}
          value={String(data.openInvoices)}
          icon={Receipt}
        />
        <KpiCard
          label={t("overview.kpis.overdue")}
          value={String(data.overdueInvoices)}
          icon={FileWarning}
        />
        <KpiCard
          label={t("overview.kpis.properties")}
          value={String(data.properties)}
          icon={Building2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("overview.recentInvoices")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.clientPortalInvoices(slug)}>
                {t("overview.viewAll")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentInvoices.length === 0 ? (
              <EmptyState title={t("invoices.empty")} />
            ) : (
              data.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={ROUTES.clientPortalInvoice(slug, inv.id)}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(inv.issue_date, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatMoney(inv.total_cents, inv.currency, locale)}
                    </p>
                    <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("overview.upcomingServices")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.clientPortalServices(slug)}>
                {t("overview.viewAll")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingServices.length === 0 ? (
              <EmptyState title={t("services.noUpcoming")} />
            ) : (
              data.upcomingServices.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border p-3"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(task.scheduled_date, locale)} ·{" "}
                    {task.address_label ?? `${task.street}, ${task.city}`}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </OperationsPage>
  );
}
