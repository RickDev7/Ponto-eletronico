"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateTenantStatusAction } from "@/actions/platform/actions";
import type { PlatformTenantRow } from "@/types/platform";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  trial: "secondary",
  suspended: "destructive",
};

interface TenantsViewProps {
  tenants: PlatformTenantRow[];
}

export function TenantsView({ tenants }: TenantsViewProps) {
  const t = useTranslations("platform.tenants");
  const [pending, startTransition] = useTransition();

  function setStatus(companyId: string, status: "active" | "trial" | "suspended") {
    startTransition(async () => {
      const result = await updateTenantStatusAction({
        companyId,
        status,
        reason: status === "suspended" ? "Suspended by platform admin" : undefined,
      });
      if (!result.success) toast.error(result.error);
      else toast.success(t("statusUpdated"));
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.tenant")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.plan")}</TableHead>
              <TableHead>{t("columns.members")}</TableHead>
              <TableHead>{t("columns.created")}</TableHead>
              <TableHead className="text-right">{t("columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[tenant.status] ?? "secondary"}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {tenant.subscription?.plan_key ?? "—"}
                    {tenant.subscription?.status && (
                      <span className="ml-1 text-muted-foreground">
                        ({tenant.subscription.status})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{tenant.member_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {tenant.status !== "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={pending}
                          onClick={() => setStatus(tenant.id, "active")}
                        >
                          {t("actions.activate")}
                        </Button>
                      )}
                      {tenant.status !== "suspended" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive"
                          disabled={pending}
                          onClick={() => setStatus(tenant.id, "suspended")}
                        >
                          {t("actions.suspend")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
