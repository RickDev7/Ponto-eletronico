"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AiStructuredResult } from "@/lib/ai/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AiResultPanelProps {
  result: AiStructuredResult;
  provider?: "openai" | "fallback";
  onCopyContent?: () => void;
  className?: string;
}

const PRIORITY_STYLES = {
  high: "border-destructive/30 bg-destructive/5 text-destructive",
  medium: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  low: "border-border bg-muted/30 text-muted-foreground",
};

export function AiResultPanel({
  result,
  provider,
  onCopyContent,
  className,
}: AiResultPanelProps) {
  const t = useTranslations("aiAssistant");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t("result.summary")}</p>
          {provider && (
            <Badge variant="outline" className="text-[10px]">
              {provider === "openai" ? t("provider.ai") : t("provider.rules")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{result.summary}</p>
      </div>

      {result.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("result.insights")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.insights.map((insight, i) => (
              <Card key={i} className="border-border/60">
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{insight.title}</CardTitle>
                    {insight.priority && (
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase",
                          PRIORITY_STYLES[insight.priority],
                        )}
                      >
                        {insight.priority}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                  {insight.metric && (
                    <p className="mt-1 text-sm font-semibold tabular-nums">{insight.metric}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("result.recommendations")}
          </p>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.generatedContent && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("result.generated")}
            </p>
            {onCopyContent && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCopyContent}>
                {t("result.copy")}
              </Button>
            )}
          </div>
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {result.generatedContent}
          </pre>
        </div>
      )}
    </div>
  );
}
