"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toggleFeatureFlagAction } from "@/actions/platform/actions";
import type { FeatureFlagRow } from "@/types/platform";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeatureFlagsViewProps {
  flags: FeatureFlagRow[];
}

export function FeatureFlagsView({ flags }: FeatureFlagsViewProps) {
  const t = useTranslations("platform.featureFlags");
  const [pending, startTransition] = useTransition();

  function toggle(id: string, enabled: boolean) {
    startTransition(async () => {
      const result = await toggleFeatureFlagAction({ flagId: id, enabled });
      if (!result.success) toast.error(result.error);
      else toast.success(t("updated"));
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.key")}</TableHead>
              <TableHead>{t("columns.scope")}</TableHead>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead>{t("columns.enabled")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                  <TableCell>
                    {flag.company_id ? (
                      <Badge variant="secondary">{flag.company_name}</Badge>
                    ) : flag.plan_key ? (
                      <Badge variant="outline">{flag.plan_key}</Badge>
                    ) : (
                      <Badge>{t("scope.global")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {flag.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={flag.enabled}
                      disabled={pending}
                      onCheckedChange={(v) => toggle(flag.id, v)}
                    />
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
