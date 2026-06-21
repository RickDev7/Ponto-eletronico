"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { resolveTraceability } from "@/lib/operations/operations-workflow";
import type { TraceableExecution } from "@/lib/operations/traceable-execution-types";
import { cn } from "@/lib/utils";

interface TraceabilityBreadcrumbProps {
  slug: string;
  execution: Pick<
    TraceableExecution,
    | "id"
    | "contract_id"
    | "contractTitle"
    | "contractNumber"
    | "propertyId"
    | "address"
    | "service_id"
    | "serviceName"
    | "service_type"
    | "status"
    | "approved_at"
  >;
  compact?: boolean;
}

export function TraceabilityBreadcrumb({ slug, execution, compact }: TraceabilityBreadcrumbProps) {
  const t = useTranslations("operations.traceability");
  const trace = resolveTraceability(execution as TraceableExecution);

  const steps = [
    {
      key: "contract",
      ok: trace.hasContract,
      label: execution.contractTitle ?? execution.contractNumber ?? t("missing.contract"),
      href: execution.contract_id
        ? ROUTES.financeContract(slug, execution.contract_id)
        : undefined,
    },
    {
      key: "property",
      ok: trace.hasProperty,
      label: execution.address
        ? `${execution.address.street}, ${execution.address.city}`
        : t("missing.property"),
      href: execution.propertyId
        ? ROUTES.operationsProperty(slug, execution.propertyId)
        : undefined,
    },
    {
      key: "service",
      ok: trace.hasService,
      label: execution.serviceName ?? execution.service_type ?? t("missing.service"),
      href: ROUTES.operationsServices(slug),
    },
    {
      key: "execution",
      ok: trace.hasExecution,
      label: t("execution"),
      href: ROUTES.task(slug, execution.id),
    },
  ] as const;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            trace.isFullyTraceable
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          {trace.isFullyTraceable ? t("fullyTraceable") : t("incomplete")}
        </span>
      </div>
      <ol className="flex flex-wrap items-center gap-1">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]",
                step.ok ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.ok ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <X className="size-3 text-amber-600" />
              )}
              {step.href ? (
                <Link href={step.href} className="hover:underline">
                  {t(`stages.${step.key}`)}
                </Link>
              ) : (
                <span>{t(`stages.${step.key}`)}</span>
              )}
              {!compact && (
                <span className="max-w-[140px] truncate text-muted-foreground">
                  · {step.label}
                </span>
              )}
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
