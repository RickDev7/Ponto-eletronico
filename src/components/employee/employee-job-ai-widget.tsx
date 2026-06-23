"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ClipboardList,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import { runEmployeeFieldAiAction } from "@/actions/employee/ai-field";
import type { FieldJobAiCapability, FieldJobAiResult } from "@/lib/ai/field-job-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmployeeJobAiWidgetProps {
  slug: string;
  taskId: string;
  className?: string;
}

export function EmployeeJobAiWidget({ slug, taskId, className }: EmployeeJobAiWidgetProps) {
  const t = useTranslations("employee.mobile.ai");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeCapability, setActiveCapability] = useState<FieldJobAiCapability | null>(null);
  const [result, setResult] = useState<FieldJobAiResult | null>(null);

  const actions: {
    capability: FieldJobAiCapability;
    label: string;
    icon: typeof ClipboardList;
  }[] = [
    { capability: "suggest_checklist", label: t("actions.checklist"), icon: ClipboardList },
    { capability: "suggest_materials", label: t("actions.materials"), icon: Package },
    { capability: "generate_service_notes", label: t("actions.notes"), icon: Sparkles },
  ];

  function runCapability(capability: FieldJobAiCapability) {
    setActiveCapability(capability);
    startTransition(async () => {
      const response = await runEmployeeFieldAiAction(slug, { taskId, capability });
      if (!response.success) {
        toast.error(response.error);
        setActiveCapability(null);
        return;
      }
      setResult(response.data);
      setActiveCapability(null);
      setExpanded(true);
    });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <section className={cn("rounded-2xl border border-primary/20 bg-primary/5", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("title")}</p>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {(expanded || pending) && (
        <div className="space-y-3 border-t border-primary/10 px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {actions.map(({ capability, label, icon: Icon }) => (
              <Button
                key={capability}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full bg-background/80 text-xs"
                disabled={pending}
                onClick={() => runCapability(capability)}
              >
                {pending && activeCapability === capability ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Icon className="mr-1.5 size-3.5" />
                )}
                {label}
              </Button>
            ))}
          </div>

          {pending && !result && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("analyzing")}
            </p>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">{result.summary}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {result.provider === "openai" ? t("providerAi") : t("providerRules")}
                </Badge>
              </div>

              {result.checklistItems && result.checklistItems.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("checklistTitle")}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => copyText(result.checklistItems!.join("\n"))}
                    >
                      <ClipboardCopy className="mr-1 size-3" />
                      {t("copy")}
                    </Button>
                  </div>
                  <ul className="space-y-1">
                    {result.checklistItems.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary">{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.materials && result.materials.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("materialsTitle")}
                  </p>
                  <ul className="space-y-1.5">
                    {result.materials.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-sm"
                      >
                        <span>{m.name}</span>
                        <span className="text-xs font-medium text-muted-foreground">{m.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.serviceNotes && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("notesTitle")}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => copyText(result.serviceNotes!)}
                    >
                      <ClipboardCopy className="mr-1 size-3" />
                      {t("copy")}
                    </Button>
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5 text-xs">
                    {result.serviceNotes}
                  </pre>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <ul className="space-y-1 border-t pt-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
