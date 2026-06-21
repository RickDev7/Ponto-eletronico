"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, MapPin, Wrench } from "lucide-react";
import { formatDate } from "@/lib/finance/utils";
import { getPortalDocumentDownloadUrl } from "@/actions/client-portal/download";
import type { ClientDocument } from "@/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  OperationsPage,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PortalDocumentsViewProps {
  slug: string;
  documents: ClientDocument[];
  locale: string;
}

export function PortalDocumentsView({
  slug,
  documents,
  locale,
}: PortalDocumentsViewProps) {
  const t = useTranslations("clientPortal.documents");
  const [isPending, startTransition] = useTransition();

  function download(doc: ClientDocument) {
    startTransition(async () => {
      const result = await getPortalDocumentDownloadUrl(slug, doc.storage_path);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.data?.url) {
        toast.error(t("downloadFailed"));
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      {documents.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  {doc.description ? (
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() => download(doc)}
                >
                  <Download className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{t("category", { value: doc.category })}</p>
                <p>{formatDate(doc.uploaded_at.slice(0, 10), locale)}</p>
                {doc.file_name ? <p>{doc.file_name}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </OperationsPage>
  );
}

interface PortalServicesViewProps {
  addresses: Array<{
    id: string;
    label: string | null;
    street: string;
    city: string;
    postal_code: string;
    service_types: string[];
  }>;
  contracts: Array<{
    id: string;
    title: string;
    service_description: string | null;
    frequency: string;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    service_type: string;
    scheduled_date: string;
    address_label: string | null;
    street: string;
    city: string;
  }>;
  locale: string;
}

export function PortalServicesView({
  addresses,
  contracts,
  recentTasks,
  locale,
}: PortalServicesViewProps) {
  const t = useTranslations("clientPortal.services");
  const ts = useTranslations("serviceTypes");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("properties")}</h2>
          {addresses.length === 0 ? (
            <EmptyState title={t("noProperties")} icon={MapPin} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((address) => (
                <Card key={address.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {address.label ?? address.street}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {address.street}, {address.postal_code} {address.city}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {address.service_types.map((type) => (
                        <span
                          key={type}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {ts(type)}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("activeContracts")}</h2>
          {contracts.length === 0 ? (
            <EmptyState title={t("noContracts")} icon={Wrench} />
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <Card key={contract.id}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{contract.title}</p>
                    {contract.service_description ? (
                      <p className="text-sm text-muted-foreground">
                        {contract.service_description}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("recentExecutions")}</h2>
          {recentTasks.length === 0 ? (
            <EmptyState title={t("noExecutions")} />
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div key={task.id} className="rounded-lg border p-3">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(task.scheduled_date, locale)} ·{" "}
                    {task.address_label ?? `${task.street}, ${task.city}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </OperationsPage>
  );
}
