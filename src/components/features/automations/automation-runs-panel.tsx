"use client";

import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/finance/utils";
import type { AutomationDeliveryRow, AutomationRunRow } from "@/lib/automations/types";
import { Badge } from "@/components/ui/badge";

interface AutomationRunsPanelProps {
  runs: AutomationRunRow[];
  deliveries: AutomationDeliveryRow[];
  locale?: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  failed: "destructive",
  skipped: "secondary",
  running: "outline",
  pending: "outline",
  queued: "secondary",
  sent: "default",
};

export function AutomationRunsPanel({
  runs,
  deliveries,
  locale = "pt-BR",
}: AutomationRunsPanelProps) {
  const t = useTranslations("automations");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{t("runs.title")}</h3>
        {runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("runs.empty")}</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {runs.map((run) => {
              const ruleName = Array.isArray(run.rule)
                ? run.rule[0]?.name
                : run.rule?.name;
              return (
                <div
                  key={run.id}
                  className="rounded-lg border border-border/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{ruleName ?? run.trigger_type}</span>
                    <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"} className="text-[10px]">
                      {t(`runStatus.${run.status}` as never)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDate(run.started_at.slice(0, 10), locale)}
                  </p>
                  {run.error_message && (
                    <p className="mt-1 text-destructive">{run.error_message}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{t("deliveries.title")}</h3>
        {deliveries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("deliveries.empty")}</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize">{d.channel}</p>
                  <p className="truncate text-muted-foreground">{d.recipient ?? "—"}</p>
                </div>
                <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"} className="text-[10px] shrink-0">
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
