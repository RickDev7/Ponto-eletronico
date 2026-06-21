"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  OPERATIONS_WORKFLOW_STAGES,
  WORKFLOW_STAGE_DOT,
  type OperationsWorkflowStage,
} from "@/lib/operations/operations-workflow";

interface OperationsWorkflowStripProps {
  counts: Record<OperationsWorkflowStage, number>;
  activeStage?: OperationsWorkflowStage | null;
  onStageClick?: (stage: OperationsWorkflowStage) => void;
}

export function OperationsWorkflowStrip({
  counts,
  activeStage,
  onStageClick,
}: OperationsWorkflowStripProps) {
  const t = useTranslations("operations.workflow");

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-card p-2">
      {OPERATIONS_WORKFLOW_STAGES.map((stage, index) => (
        <div key={stage} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStageClick?.(stage)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
              onStageClick && "hover:bg-muted/60",
              activeStage === stage && "bg-muted",
            )}
          >
            <span className={cn("size-2 shrink-0 rounded-full", WORKFLOW_STAGE_DOT[stage])} />
            <span className="text-[11px] font-medium">{t(`stages.${stage}`)}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{counts[stage]}</span>
          </button>
          {index < OPERATIONS_WORKFLOW_STAGES.length - 1 && (
            <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
