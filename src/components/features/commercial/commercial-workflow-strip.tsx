"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { COMMERCIAL_WORKFLOW_STAGES } from "@/lib/commercial/commercial-types";
import { STAGE_DOT } from "@/lib/commercial/workflow";
import type { CommercialWorkflowStage } from "@/lib/commercial/commercial-types";

interface CommercialWorkflowStripProps {
  counts: Record<CommercialWorkflowStage, number>;
  activeStage?: CommercialWorkflowStage | null;
  onStageClick?: (stage: CommercialWorkflowStage) => void;
}

export function CommercialWorkflowStrip({
  counts,
  activeStage,
  onStageClick,
}: CommercialWorkflowStripProps) {
  const t = useTranslations("commercial.workflow");

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-card p-2">
      {COMMERCIAL_WORKFLOW_STAGES.map((stage, index) => (
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
            <span className={cn("size-2 shrink-0 rounded-full", STAGE_DOT[stage])} />
            <span className="text-[11px] font-medium">{t(`stages.${stage}`)}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{counts[stage]}</span>
          </button>
          {index < COMMERCIAL_WORKFLOW_STAGES.length - 1 && (
            <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
