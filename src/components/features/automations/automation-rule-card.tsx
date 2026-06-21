"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AutomationRuleRow } from "@/lib/automations/types";
import { getTriggerDef } from "@/lib/automations/catalog";
import { AutomationWorkflowPipeline } from "@/components/features/automations/automation-workflow-pipeline";
import {
  deleteAutomationRuleAction,
  toggleAutomationRuleAction,
} from "@/actions/automations/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";

interface AutomationRuleCardProps {
  slug: string;
  rule: AutomationRuleRow;
  canWrite: boolean;
  onEdit: () => void;
}

export function AutomationRuleCard({ slug, rule, canWrite, onEdit }: AutomationRuleCardProps) {
  const t = useTranslations("automations");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const triggerDef = getTriggerDef(rule.trigger_type);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAutomationRuleAction(slug, rule.id, !rule.is_enabled);
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAutomationRuleAction(slug, rule.id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toasts.deleted"));
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{rule.name}</h4>
            <Badge variant={rule.is_enabled ? "default" : "secondary"} className="text-[10px]">
              {rule.is_enabled ? t("status.active") : t("status.paused")}
            </Badge>
          </div>
          {rule.description && (
            <p className="mt-1 text-xs text-muted-foreground">{rule.description}</p>
          )}

          <AutomationWorkflowPipeline
            triggerType={rule.trigger_type}
            conditions={rule.conditions}
            actions={rule.actions}
            compact
            className="mt-3"
          />
        </div>

        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={pending}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-3.5" /> {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggle}>
                <Power className="size-3.5" />
                {rule.is_enabled ? t("actions.pause") : t("actions.enable")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="size-3.5" /> {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
