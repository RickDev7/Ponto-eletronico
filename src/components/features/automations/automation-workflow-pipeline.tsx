"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  getActionDef,
  getTriggerDef,
  type ActionDef,
  type TriggerDef,
} from "@/lib/automations/catalog";
import type { AutomationActionStep, AutomationCondition } from "@/lib/validations/automations";
import type { AutomationTriggerType } from "@/lib/validations/automations";

interface AutomationWorkflowPipelineProps {
  triggerType: AutomationTriggerType;
  conditions: AutomationCondition[];
  actions: AutomationActionStep[];
  className?: string;
  compact?: boolean;
}

function StepPill({
  label,
  variant,
}: {
  label: string;
  variant: "trigger" | "condition" | "action";
}) {
  const styles = {
    trigger: "bg-muted text-foreground border-border/60",
    condition: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300",
    action: "bg-primary/10 text-primary border-primary/25",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium",
        styles[variant],
      )}
    >
      {label}
    </span>
  );
}

export function AutomationWorkflowPipeline({
  triggerType,
  conditions,
  actions,
  className,
  compact = false,
}: AutomationWorkflowPipelineProps) {
  const t = useTranslations("automations");
  const triggerDef = getTriggerDef(triggerType);

  const steps: Array<{ kind: "trigger" | "condition" | "action"; label: string }> = [
    {
      kind: "trigger",
      label: triggerDef ? t(triggerDef.labelKey as never) : triggerType,
    },
  ];

  if (conditions.length > 0) {
    steps.push({
      kind: "condition",
      label:
        conditions.length === 1
          ? `${conditions[0]!.field} ${conditions[0]!.operator} ${String(conditions[0]!.value ?? "")}`
          : t("flow.conditions", { count: conditions.length }),
    });
  }

  for (const action of actions) {
    const actionDef = getActionDef(action.type);
    let label = actionDef ? t(actionDef.labelKey as never) : action.type;
    if (action.channel) label += ` · ${t(`channels.${action.channel}` as never)}`;
    steps.push({ kind: "action", label });
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {steps.map((step, index) => (
          <span key={`${step.kind}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
            <StepPill label={step.label} variant={step.kind} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1", className)}>
      {steps.map((step, index) => (
        <div key={`${step.kind}-${index}`} className="flex flex-col items-center">
          <StepPill label={step.label} variant={step.kind} />
          {index < steps.length - 1 && (
            <ArrowDown className="my-0.5 size-3.5 text-muted-foreground" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

export function AutomationExampleFlow({
  triggerDef,
  actionDef,
  exampleKey,
}: {
  triggerDef?: TriggerDef;
  actionDef?: ActionDef;
  exampleKey: string;
}) {
  const t = useTranslations("automations");

  return (
    <div className="flex flex-col items-center gap-1 py-1 text-center">
      <p className="mb-2 text-xs font-medium">{t(`examples.${exampleKey}` as never)}</p>
      <StepPill
        label={triggerDef ? t(triggerDef.labelKey as never) : "Trigger"}
        variant="trigger"
      />
      <ArrowDown className="size-3.5 text-muted-foreground" />
      <StepPill label={t("flow.conditionOptional")} variant="condition" />
      <ArrowDown className="size-3.5 text-muted-foreground" />
      <StepPill
        label={actionDef ? t(actionDef.labelKey as never) : "Action"}
        variant="action"
      />
    </div>
  );
}
