"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updatePlatformSubscriptionAction } from "@/actions/platform/actions";
import type { PlatformSubscriptionRow } from "@/types/platform";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SubscriptionsViewProps {
  subscriptions: PlatformSubscriptionRow[];
}

export function SubscriptionsView({ subscriptions }: SubscriptionsViewProps) {
  const t = useTranslations("platform.subscriptions");
  const [pending, startTransition] = useTransition();

  function updatePlan(id: string, planKey: string) {
    startTransition(async () => {
      const result = await updatePlatformSubscriptionAction({
        subscriptionId: id,
        planKey: planKey as "starter" | "professional" | "enterprise",
      });
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
              <TableHead>{t("columns.tenant")}</TableHead>
              <TableHead>{t("columns.plan")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.period")}</TableHead>
              <TableHead>{t("columns.stripe")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <p className="font-medium">{sub.company_name}</p>
                    <p className="text-xs text-muted-foreground">/{sub.company_slug}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.plan_key}
                      disabled={pending}
                      onValueChange={(v) => updatePlan(sub.id, v)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : sub.trial_ends_at
                        ? `Trial → ${new Date(sub.trial_ends_at).toLocaleDateString()}`
                        : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {sub.stripe_customer_id?.slice(0, 16) ?? "—"}
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
