"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Calendar, ClipboardList, FileText, Users } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { clientNameFromProperty, type PropertyRow } from "@/lib/operations/operations-data";
import { ExecutionStatusBadge } from "@/components/features/operations/execution-status-badge";
import { resolveExecutionStatus } from "@/lib/operations/operations-data";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface PropertyDetailViewProps {
  slug: string;
  property: PropertyRow & {
    client?: { id: string; name: string; email?: string | null; phone?: string | null } | Array<{
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    }> | null;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    scheduled_date: string;
    approved_at: string | null;
    invoice_id: string | null;
    assignments?: Array<{
      employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
    }>;
  }>;
  contracts: Array<{
    id: string;
    title: string;
    frequency: string;
    status: string;
  }>;
  upcoming: typeof tasks;
  locale: string;
}

export function PropertyDetailView({
  slug,
  property,
  tasks,
  contracts,
  upcoming,
  locale,
}: PropertyDetailViewProps) {
  const t = useTranslations("operations.propertyDetail");
  const client = Array.isArray(property.client) ? property.client[0] : property.client;

  return (
    <OperationsPage>
      <PageHeader
        title={property.label ?? property.street}
        description={`${property.postal_code} ${property.city}`}
        actions={
          <Link
            href={ROUTES.operationsProperties(slug)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <OperationsWorkspace className="lg:col-span-2 space-y-4 p-4">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Calendar className="size-4" />
              {t("upcoming")}
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {upcoming.map((task) => (
                  <li key={task.id} className="flex items-center justify-between px-3 py-2">
                    <Link href={ROUTES.task(slug, task.id)} className="text-sm hover:text-primary">
                      {task.title}
                    </Link>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(task.scheduled_date + "T12:00:00").toLocaleDateString(locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4" />
              {t("history")}
            </h3>
            <ul className="divide-y rounded-lg border">
              {tasks.slice(0, 10).map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link href={ROUTES.task(slug, task.id)} className="text-sm hover:text-primary">
                    {task.title}
                  </Link>
                  <ExecutionStatusBadge status={resolveExecutionStatus(task)} />
                </li>
              ))}
            </ul>
          </section>
        </OperationsWorkspace>

        <OperationsWorkspace className="space-y-4 p-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("client")}</h3>
            {client ? (
              <Link href={ROUTES.client(slug, client.id)} className="text-sm text-primary hover:underline">
                {client.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              {t("contracts")}
            </h3>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noContracts")}</p>
            ) : (
              <ul className="space-y-2">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={ROUTES.financeContract(slug, c.id)}
                      className="text-sm hover:text-primary"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.frequency}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4" />
              {t("assigned")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {clientNameFromProperty(property)}
            </p>
          </section>
        </OperationsWorkspace>
      </div>
    </OperationsPage>
  );
}
